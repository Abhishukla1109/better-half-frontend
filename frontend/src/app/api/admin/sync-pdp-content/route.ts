/**
 * POST /api/admin/sync-pdp-content
 * Body: { handle: string, dryRun?: boolean }
 *
 * Fetches brand API for a product, extracts structured pdp_content,
 * writes it to Shopify as the custom.pdp_content metafield.
 *
 * Secured with MOSAIC_SERVICE_SECRET header.
 */
import { type NextRequest, NextResponse } from "next/server";

const SHOP        = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const CLIENT_ID   = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API   = `https://${SHOP}/admin/api/2024-01/graphql.json`;

const BRAND_API: Record<string, string> = {
  "Man Matters":  "https://api.manmatters.com/portal/page/mwsc/widgetised/product",
  "Be Bodywise":  "https://api.bebodywise.com/portal/page/mwsc/widgetised/product",
  "Little Joys":  "https://api.ourlittlejoys.com/portal/page/mwsc/widgetised/product",
};

const HEADINGS: Record<string, string | null> = {
  description:      null,
  how_to_use:       "How to Use",
  key_ingredients:  "Key Ingredients",
  full_ingredients: "Full Ingredients",
  how_it_works:     "How it Works",
  key_benefits:     "Key Benefits",
  works_best_with:  "What it Works Best With",
  things_to_note:   "Good to Know",
  faqs:             "FAQs",
  consumer_study:   "What Users Say",
  clinical_proof:   "Clinically Tested",
  product_info:     "Product Information",
};

function stripLinks(html: string): string {
  return html.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
}

// ─── Admin API token ──────────────────────────────────────────────────────────

let _token: string | null = null;
let _tokenExpiry = 0;

async function getAdminToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json();
  _token = data.access_token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return _token!;
}

// ─── Shopify helpers ──────────────────────────────────────────────────────────

async function getProductIdAndVendorAndUrlKey(token: string, handle: string): Promise<{
  gid: string; vendor: string; urlKey: string;
} | null> {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `
        query($handle: String!) {
          productByHandle(handle: $handle) {
            id
            vendor
            metafield(namespace: "custom", key: "bh_mm_url_key") { value }
          }
        }
      `,
      variables: { handle },
    }),
  });
  const json = await res.json();
  const p = json.data?.productByHandle;
  if (!p) return null;
  return {
    gid:    p.id,
    vendor: p.vendor ?? "",
    urlKey: p.metafield?.value || handle,
  };
}

async function writeMetafield(token: string, productGid: string, value: string): Promise<void> {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: `
        mutation SetMetafield($input: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $input) {
            metafields { key value }
            userErrors { field message }
          }
        }
      `,
      variables: {
        input: [{
          ownerId:   productGid,
          namespace: "custom",
          key:       "pdp_content",
          type:      "json",
          value,
        }],
      },
    }),
  });
  const json = await res.json();
  const errors = json.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length) throw new Error(errors.map((e: { message: string }) => e.message).join("; "));
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

type Widget = { type: string; heading: string | null; data: unknown };

function push(result: Widget[], type: string, data: unknown) {
  if (!data) return;
  result.push({ type, heading: HEADINGS[type] ?? null, data });
}

// ─── MM extractor ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMM(apiData: any): Widget[] {
  const widgets = apiData.data?.widgets ?? [];
  const desc    = apiData.data?.description ?? {};
  const result: Widget[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = (id: string) => widgets.find((ww: any) => ww.id === id);

  // description
  const detailsTab = (w("product-description")?.widgetData?.items ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((i: any) => i.title === "Details");
  if (detailsTab?.text) push(result, "description", { html: stripLinks(detailsTab.text) });

  // key_benefits — outside widgets, in description.details.boosts.icons
  const boosts = (desc.details?.boosts?.icons ?? []) as Array<{ icon: string; text: string }>;
  if (boosts.length) push(result, "key_benefits", { items: boosts.map(b => ({ icon: b.icon, text: b.text })) });

  // how_to_use — prefer visual INFO_TILE_CARD steps; fallback to HTML
  const howUsedSteps = (w("how-its-used")?.widgetData?.items ?? []) as Array<{ title: string; description: string; stepImage?: string; image?: string }>;
  if (howUsedSteps.length) {
    push(result, "how_to_use", {
      steps: howUsedSteps.map(s => ({ title: s.title ?? "", description: s.description ?? "", image: s.stepImage ?? s.image ?? null }))
    });
  } else {
    const infoHowTo = (w("product-description")?.widgetData?.items ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .find((i: any) => i.title?.toLowerCase().includes("how to use"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accHowTo = (w("key-ingredients-accordion")?.widgetData?.list ?? []).find((i: any) => i.title?.toLowerCase().includes("how to use"));
    const html = infoHowTo?.text ?? accHowTo?.content ?? null;
    if (html) push(result, "how_to_use", { html });
  }

  // key_ingredients
  const kiCards = (w("key-ingredients-cards")?.widgetData?.items ?? []) as Array<{ name: string; description?: string; desc?: string; largeDescription?: string; icon?: string }>;
  if (kiCards.length) push(result, "key_ingredients", { cards: kiCards.map(c => ({ name: c.name, description: c.description ?? c.desc ?? "", longDescription: c.largeDescription ?? null, icon: c.icon ?? null })) });

  // full_ingredients — from key-ingredients-accordion "Full list of ingredients" item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kiAccList = (w("key-ingredients-accordion")?.widgetData?.list ?? []) as Array<any>;
  const fullIngrItem = kiAccList.find(i => i.title?.toLowerCase().includes("ingredient"));
  if (fullIngrItem?.content) push(result, "full_ingredients", { html: fullIngrItem.content });

  // how_it_works — look for HOW_IT_WORKS or how-it-works id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hitwWidget = widgets.find((ww: any) => ww.type === "HOW_IT_WORKS" || ww.id?.includes("how-it-works"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hitwItems = (hitwWidget?.widgetData?.items ?? hitwWidget?.widgetData?.list ?? []) as any[];
  if (hitwItems.length) push(result, "how_it_works", { items: hitwItems });

  // works_best_with
  const wbwItems = (w("what-it-works-best-with")?.widgetData?.items ?? []) as Array<{ icon?: string; textContentTitle?: { text: string }; textContentDescription?: { text: string }; desc?: string }>;
  if (wbwItems.length) push(result, "works_best_with", { items: wbwItems.map(i => ({ icon: i.icon ?? null, title: i.textContentTitle?.text ?? "", description: i.textContentDescription?.text ?? i.desc ?? "" })) });

  // things_to_note
  const ttnItems = (w("things-to-note")?.widgetData?.items ?? []) as Array<{ icon?: string; desc?: string; title?: string }>;
  if (ttnItems.length) push(result, "things_to_note", { items: ttnItems.map(i => ({ icon: i.icon ?? null, text: i.desc ?? i.title ?? "" })) });

  // consumer_study
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consumerWidget = widgets.find((ww: any) => ww.type === "CONSUMER_STUDY" || ww.id?.includes("consumer") || ww.id?.includes("user-study"));
  if (consumerWidget?.widgetData) push(result, "consumer_study", consumerWidget.widgetData);

  // clinical_proof
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clinicalWidget = widgets.find((ww: any) => ww.type === "CLINICAL_PROOF" || ww.id?.includes("clinical") || ww.id?.includes("study"));
  if (clinicalWidget?.widgetData) push(result, "clinical_proof", clinicalWidget.widgetData);

  // faqs — uses 'list' key not 'items'
  const faqList = (w("we-got-answers")?.widgetData?.list ?? []) as Array<{ title: string; content: string }>;
  if (faqList.length) push(result, "faqs", { list: faqList.map(f => ({ q: f.title, a: f.content })) });

  // product_info — PRODUCT_DETAILS_TILE + ACCORDION_HEADER additional-information
  // Filter out "Price" row — Shopify is the source of truth for pricing
  const prodInfoItems = (w("product-contains-details")?.widgetData?.items ?? [])
    .filter((i: { leftText: string; rightText: string }) => i.leftText?.toLowerCase() !== "price") as Array<{ leftText: string; rightText: string }>;
  const addInfoItems  = (w("additional-information")?.widgetData?.items ?? []) as Array<{ title: string; content: string }>;
  if (prodInfoItems.length || addInfoItems.length) {
    push(result, "product_info", {
      details:    prodInfoItems.map(i => ({ label: i.leftText, value: i.rightText })),
      additional: addInfoItems.map(i => ({ label: i.title, value: i.content })),
    });
  }

  return result;
}

// ─── BW extractor ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBW(apiData: any): Widget[] {
  const widgets = apiData.data?.widgets ?? [];
  const result: Widget[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w  = (id: string)   => widgets.find((ww: any) => ww.id === id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wt = (type: string) => widgets.find((ww: any) => ww.type === type);

  // description — BW INFO_TABS "Details" or product-description
  const infoTabs = w("product-description") ?? wt("INFO_TABS");
  const detailsTab = (infoTabs?.widgetData?.items ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((i: any) => i.title === "Details" || i.title === "Description");
  if (detailsTab?.text) push(result, "description", { html: stripLinks(detailsTab.text) });

  // key_benefits — BW has BENEFITS_HIGHLIGHTS widget
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const benefitsWidget = wt("BENEFITS_HIGHLIGHTS") ?? widgets.find((ww: any) => ww.id?.includes("benefit") || ww.id?.includes("key-benefit"));
  const bItems = (benefitsWidget?.widgetData?.items ?? benefitsWidget?.widgetData?.list ?? []) as Array<{ icon?: string; text?: string; title?: string; description?: string }>;
  if (bItems.length) push(result, "key_benefits", { items: bItems.map(i => ({ icon: i.icon ?? null, text: i.text ?? i.title ?? i.description ?? "" })) });

  // how_to_use — BW: may be in INFO_TABS OR standalone HOW_TO_USE widget
  const howToUseTab = (infoTabs?.widgetData?.items ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .find((i: any) => i.title?.toLowerCase().includes("how to use"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const howToUseWidget = wt("HOW_TO_USE") ?? widgets.find((ww: any) => ww.id?.includes("how-to-use") || ww.id?.includes("how-its-used"));
  const howToUseSteps = (howToUseWidget?.widgetData?.items ?? []) as Array<{ title?: string; description?: string; stepImage?: string; image?: string }>;
  if (howToUseSteps.length) {
    push(result, "how_to_use", { steps: howToUseSteps.map(s => ({ title: s.title ?? "", description: s.description ?? "", image: s.stepImage ?? s.image ?? null })) });
  } else if (howToUseTab?.text) {
    push(result, "how_to_use", { html: howToUseTab.text });
  }

  // key_ingredients
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kiWidget = wt("FEATURE_CARD_SLIDER_WITH_TEXT") ?? wt("KEY_INGREDIENTS") ?? widgets.find((ww: any) => ww.id?.includes("key-ingredient"));
  const kiCards = (kiWidget?.widgetData?.items ?? []) as Array<{ name?: string; description?: string; desc?: string; largeDescription?: string; icon?: string }>;
  if (kiCards.length) push(result, "key_ingredients", { cards: kiCards.map(c => ({ name: c.name, description: c.description ?? c.desc ?? "", longDescription: c.largeDescription ?? null, icon: c.icon ?? null })) });

  // full_ingredients — BW: look in accordion lists for ingredient item
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accordions = widgets.filter((ww: any) => ww.type === "ACCORDION");
  let fullIngrHtml: string | null = null;
  for (const acc of accordions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (acc.widgetData?.list ?? acc.widgetData?.items ?? []).find((i: any) => i.title?.toLowerCase().includes("ingredient"));
    if (item?.content) { fullIngrHtml = item.content; break; }
  }
  if (fullIngrHtml) push(result, "full_ingredients", { html: fullIngrHtml });

  // how_it_works
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hitwWidget = wt("HOW_IT_WORKS") ?? widgets.find((ww: any) => ww.id?.includes("how-it-works"));
  const hitwItems = (hitwWidget?.widgetData?.items ?? hitwWidget?.widgetData?.list ?? []);
  if (hitwItems.length) push(result, "how_it_works", { items: hitwItems });

  // things_to_note
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttnWidget = widgets.find((ww: any) => ww.id?.includes("things-to-note") || ww.id?.includes("caution"));
  const ttnItems = (ttnWidget?.widgetData?.items ?? []) as Array<{ icon?: string; desc?: string; title?: string }>;
  if (ttnItems.length) push(result, "things_to_note", { items: ttnItems.map(i => ({ icon: i.icon ?? null, text: i.desc ?? i.title ?? "" })) });

  // consumer_study
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csWidget = widgets.find((ww: any) => ww.type === "CONSUMER_STUDY" || ww.id?.includes("consumer") || ww.id?.includes("user-study"));
  if (csWidget?.widgetData) push(result, "consumer_study", csWidget.widgetData);

  // clinical_proof
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cpWidget = widgets.find((ww: any) => ww.type === "CLINICAL_PROOF" || ww.id?.includes("clinical"));
  if (cpWidget?.widgetData) push(result, "clinical_proof", cpWidget.widgetData);

  // faqs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const faqWidget = widgets.find((ww: any) => ww.id?.includes("faq") || ww.id?.includes("got-answers") || ww.id?.includes("questions"));
  const faqList = (faqWidget?.widgetData?.list ?? faqWidget?.widgetData?.items ?? []) as Array<{ title: string; content: string }>;
  if (faqList.length) push(result, "faqs", { list: faqList.map(f => ({ q: f.title, a: f.content })) });

  // product_info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const piWidget = wt("PRODUCT_DETAILS_TILE") ?? widgets.find((ww: any) => ww.id?.includes("product-contains") || ww.id?.includes("product-details"));
  const piItems = (piWidget?.widgetData?.items ?? []) as Array<{ leftText: string; rightText: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addWidget = wt("ACCORDION_HEADER") ?? widgets.find((ww: any) => ww.id?.includes("additional-information"));
  const addItems  = (addWidget?.widgetData?.items ?? []) as Array<{ title: string; content: string }>;
  if (piItems.length || addItems.length) {
    push(result, "product_info", {
      details:    piItems.map(i => ({ label: i.leftText, value: i.rightText })),
      additional: addItems.map(i => ({ label: i.title, value: i.content })),
    });
  }

  return result;
}

// ─── LJ extractor ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLJ(apiData: any): Widget[] {
  // LJ shares most patterns with BW — reuse BW extractor as base
  return extractBW(apiData);
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  const setup  = req.nextUrl.searchParams.get("setup");

  try {
    const token = await getAdminToken();

    // ?setup=1 creates/updates metafield definitions with storefront access
    if (setup === "1") {
      const defs = [
        { name: "PDP Content", key: "pdp_content", type: "json" },
        { name: "BH Rating",   key: "bh_rating",   type: "json" },
      ];
      const results: Record<string, unknown> = {};
      for (const def of defs) {
        // Try update first; if definition doesn't exist, create it
        const updateRes = await fetch(ADMIN_API, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
          body: JSON.stringify({
            query: `mutation($def: MetafieldDefinitionUpdateInput!) {
              metafieldDefinitionUpdate(definition: $def) {
                updatedDefinition { id name }
                userErrors { field message }
              }
            }`,
            variables: {
              def: { name: def.name, namespace: "custom", key: def.key, ownerType: "PRODUCT", access: { storefront: "PUBLIC_READ" } },
            },
          }),
        });
        const updateJson = await updateRes.json();
        const updateResult = updateJson.data?.metafieldDefinitionUpdate;
        const notFound = updateResult?.userErrors?.some((e: { message: string }) => e.message.includes("not found"));
        if (notFound) {
          const createRes = await fetch(ADMIN_API, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
            body: JSON.stringify({
              query: `mutation($def: MetafieldDefinitionInput!) {
                metafieldDefinitionCreate(definition: $def) {
                  createdDefinition { id name }
                  userErrors { field message }
                }
              }`,
              variables: {
                def: { name: def.name, namespace: "custom", key: def.key, type: def.type, ownerType: "PRODUCT", access: { storefront: "PUBLIC_READ" } },
              },
            }),
          });
          const createJson = await createRes.json();
          results[def.key] = { created: true, ...(createJson.data?.metafieldDefinitionCreate ?? createJson) };
        } else {
          results[def.key] = updateResult;
        }
      }
      return NextResponse.json(results);
    }

    // ?orders=1 — inspect recent orders for source/affluence attributes
    if (req.nextUrl.searchParams.get("orders") === "1") {
      const res = await fetch(`https://${SHOP}/admin/api/2024-01/orders.json?status=any&limit=20&fields=id,order_number,created_at,note_attributes,tags,source_name`, {
        headers: { "X-Shopify-Access-Token": token },
      });
      const json = await res.json();
      const orders = (json.orders ?? []).map((o: { id: number; order_number: number; created_at: string; note_attributes: Array<{name: string; value: string}>; tags: string; source_name: string }) => {
        const attrs = o.note_attributes ?? [];
        const pick = (key: string) => attrs.find(a => a.name === key)?.value ?? null;
        return {
          order_number: o.order_number,
          created_at:   o.created_at,
          source_name:  o.source_name,
          source:       pick("source"),
          utm_source:   pick("utm_source") ?? pick("affluence_last_utm_source"),
          utm_medium:   pick("utm_medium") ?? pick("affluence_last_utm_medium"),
          utm_campaign: pick("utm_campaign") ?? pick("affluence_last_utm_campaign"),
          influencerId: pick("influencerId"),
          ref:          pick("ref"),
          dmId:         pick("dmId"),
          affCartId:    pick("affCartId"),
          cartId:       pick("cartId"),
          affluence_checkout: pick("affluence_checkout_started_at"),
          tags:         o.tags,
        };
      });
      return NextResponse.json(orders);
    }

    if (!handle) return NextResponse.json({ error: "handle or setup=1 required" }, { status: 400 });

    const res = await fetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query($handle: String!) {
          productByHandle(handle: $handle) {
            metafield(namespace: "custom", key: "pdp_content") { value updatedAt }
          }
        }`,
        variables: { handle },
      }),
    });
    const json = await res.json();
    const mf = json.data?.productByHandle?.metafield;
    if (!mf) return NextResponse.json({ found: false });
    return NextResponse.json({ found: true, updatedAt: mf.updatedAt, value: JSON.parse(mf.value) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const handle = body.handle as string | undefined;
  const dryRun = body.dryRun !== false; // default true for safety

  if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400 });

  try {
    const token = await getAdminToken();
    const product = await getProductIdAndVendorAndUrlKey(token, handle);
    if (!product) return NextResponse.json({ error: `Product not found: ${handle}` }, { status: 404 });

    const { gid, vendor, urlKey } = product;
    const brandBase = BRAND_API[vendor];
    if (!brandBase) return NextResponse.json({ error: `No brand API for vendor: ${vendor}` }, { status: 400 });

    const brandRes = await fetch(`${brandBase}/${urlKey}`, { signal: AbortSignal.timeout(10000) });
    if (!brandRes.ok) throw new Error(`Brand API ${brandRes.status} for ${urlKey}`);
    const apiData = await brandRes.json();

    let pdpContent: Widget[];
    if (vendor === "Man Matters")  pdpContent = extractMM(apiData);
    else if (vendor === "Be Bodywise") pdpContent = extractBW(apiData);
    else                           pdpContent = extractLJ(apiData);

    const valueJson = JSON.stringify(pdpContent);

    if (!dryRun) {
      await writeMetafield(token, gid, valueJson);
    }

    return NextResponse.json({
      handle,
      vendor,
      urlKey,
      dryRun,
      sectionCount: pdpContent.length,
      sections: pdpContent.map(w => ({ type: w.type, heading: w.heading, dataSize: JSON.stringify(w.data).length })),
      pdpContent,
    });
  } catch (err) {
    console.error("[sync-pdp-content]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
