import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({ ok: true });
}

const CT_ACCOUNT_ID       = process.env.CLEVERTAP_ACCOUNT_ID ?? "";
const CT_PASSCODE         = process.env.CLEVERTAP_PASSCODE ?? "";
const CT_API              = "https://eu1.api.clevertap.com/1/upload";
const AFFLUENCE_STOREFRONT = process.env.AFFLUENCE_STOREFRONT_ID ?? "betterhalf";
const AFFLUENCE_STORE_ID  = process.env.AFFLUENCE_STORE_ID ?? "betterhalf";
const CHECKOUT_PATH_BASE  = "/checkout";

// In-memory dedup — handles GoKwik retries hitting the same warm serverless instance
const processed = new Map<string, number>();
const DEDUP_TTL_MS = 60 * 60 * 1000;

function isAlreadyProcessed(key: string): boolean {
  const t = processed.get(key);
  if (!t) return false;
  if (Date.now() - t > DEDUP_TTL_MS) { processed.delete(key); return false; }
  return true;
}

function normalizePhone(raw: string): string {
  if (!raw) return "";
  return raw.replace(/\D/g, "").slice(-10);
}

interface GokwikAttributes {
  cartId?:                   string;
  affluence_clevertap_id?:   string;
  affluence_attribution_id?: string;
  source?:                   string;
  utmSource?:                string;
  utmMedium?:                string;
  utmCampaign?:              string;
  [key: string]: unknown;
}

interface GokwikItem {
  id?:         number | string;
  product_id?: number | string;
  variant_id?: number | string;
  title?:      string;
  price?:      number; // paise
  quantity?:   number;
  vendor?:     string;
}

interface GokwikCustomer {
  firstname?: string;
  lastname?:  string;
  email?:     string;
  phone?:     string;
}

interface GokwikPayload {
  request_id?:   string;
  token?:        string;
  attributes?:   string; // JSON string
  checkout_url?: string | null;
  currency?:     string;
  total_price?:  string | number;
  items?:        GokwikItem[];
  customer?:     GokwikCustomer;
  mkt_source?:   string;
  [key: string]: unknown;
}

async function pushCleverTapEvent(
  identity: { type: "objectId" | "identity"; value: string },
  eventData: Record<string, unknown>
): Promise<void> {
  const record: Record<string, unknown> = {
    type:    "event",
    evtName: "Affluence Shop Checkout Abandoned",
    evtData: eventData,
  };
  if (identity.type === "objectId") {
    record.objectId = identity.value;
  } else {
    record.identity = identity.value;
  }

  const res = await fetch(CT_API, {
    method:  "POST",
    headers: {
      "Content-Type":           "application/json",
      "X-CleverTap-Account-Id": CT_ACCOUNT_ID,
      "X-CleverTap-Passcode":   CT_PASSCODE,
    },
    body: JSON.stringify({ d: [record] }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[gokwik-abandoned-checkout] CLEVERTAP_API_ERROR:", res.status, text);
    throw new Error(`CleverTap ${res.status}: ${text}`);
  }
  console.log("[gokwik-abandoned-checkout] CleverTap response:", text);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  console.log("[gokwik-abandoned-checkout] headers:", JSON.stringify(Object.fromEntries(req.headers)));
  console.log("[gokwik-abandoned-checkout] body:", rawBody);

  let payload: GokwikPayload;
  try {
    payload = JSON.parse(rawBody) as GokwikPayload;
  } catch {
    console.error("[gokwik-abandoned-checkout] INVALID_JSON");
    return NextResponse.json({ ok: true });
  }

  // Idempotency — request_id is GoKwik's stable key across retries
  const requestId = payload.request_id;
  if (!requestId) {
    console.error("[gokwik-abandoned-checkout] MISSING_FIELD: no request_id in payload");
    return NextResponse.json({ ok: true });
  }
  if (isAlreadyProcessed(requestId)) {
    console.log("[gokwik-abandoned-checkout] DUPLICATE — skipping:", requestId);
    return NextResponse.json({ ok: true, skipped: "duplicate" });
  }

  // attributes is a JSON string — parse it to get cartId and CleverTap ID
  let attrs: GokwikAttributes = {};
  if (payload.attributes) {
    try {
      attrs = JSON.parse(payload.attributes) as GokwikAttributes;
    } catch {
      console.error("[gokwik-abandoned-checkout] INVALID_ATTRS_JSON, request_id:", requestId);
    }
  }

  const phone       = normalizePhone(payload.customer?.phone ?? "");
  const cleverTapId = attrs.affluence_clevertap_id ?? null;
  const cartGid     = attrs.cartId ?? null;
  const currency    = payload.currency ?? "INR";

  // GoKwik always sends checkout_url as null — build path from cartId in attributes
  // Base domain (https://affluence.betterhalfforyou.com) is hardcoded on CleverTap's side
  const checkoutPath = cartGid
    ? `${CHECKOUT_PATH_BASE}?cartId=${encodeURIComponent(cartGid)}&source=affluence`
    : null;

  const items: GokwikItem[] = payload.items ?? [];
  const primary      = items[0] ?? null;
  const productId    = primary?.product_id ?? primary?.id ?? null;
  const variantId    = primary?.variant_id ?? null;
  const productTitle = primary?.title ?? null;
  const productPrice = primary?.price != null ? primary.price / 100 : null; // paise → rupees
  const brand        = primary?.vendor ?? null;
  const totalQty     = items.reduce((s, i) => s + (i.quantity ?? 1), 0) || null;
  const totalPrice   = payload.total_price != null ? Number(payload.total_price) : null;

  if (!cleverTapId && !phone) {
    console.error("[gokwik-abandoned-checkout] MISSING_IDENTITY: no clevertap_id or phone, request_id:", requestId);
    return NextResponse.json({ ok: true });
  }

  const missing: string[] = [];
  if (!cartGid)      missing.push("cartId (attributes)");
  if (!checkoutPath)  missing.push("checkout_path");
  if (!productId)    missing.push("product_id");
  if (!productTitle) missing.push("product_title");
  if (!productPrice) missing.push("product_price");
  if (!brand)        missing.push("brand");
  if (!totalQty)     missing.push("total_quantity");

  if (missing.length > 0) {
    console.error("[gokwik-abandoned-checkout] MISSING_REQUIRED_FIELDS:", missing.join(", "), "| request_id:", requestId);
    return NextResponse.json({ ok: true });
  }

  const eventData: Record<string, unknown> = {
    cart_id:          cartGid,
    checkout_path:    checkoutPath,
    checkout_partner: "gokwik",
    store_id:         AFFLUENCE_STORE_ID,
    storefront:       AFFLUENCE_STOREFRONT,
    source:           attrs.source ?? "betterhalf",
    total_price:      totalPrice,
    total_quantity:   totalQty,
    product_id:       productId,
    product_title:    productTitle,
    product_price:    productPrice,
    product_currency: currency,
    brand,
  };
  if (variantId)                        eventData.variant_id     = variantId;
  if (attrs.affluence_attribution_id)   eventData.attribution_id = attrs.affluence_attribution_id;
  if (phone)                            eventData.phone          = phone;

  const identity: { type: "objectId" | "identity"; value: string } = cleverTapId
    ? { type: "objectId", value: cleverTapId }
    : { type: "identity", value: phone };

  try {
    await pushCleverTapEvent(identity, eventData);
    processed.set(requestId, Date.now());
    console.log("[gokwik-abandoned-checkout] Event pushed for request_id:", requestId);
  } catch (err) {
    console.error("[gokwik-abandoned-checkout] CLEVERTAP_PUSH_FAILED:", requestId, err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
