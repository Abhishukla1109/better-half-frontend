/**
 * Fixes bh_segment on all active Shopify products to use age-group segments
 * instead of the brand name ("man-matters").
 * Also retags sleep/hormones products with the correct concern values.
 */

const SHOP = "betterhalf-4.myshopify.com";
const CI = process.env.SHOPIFY_CLIENT_ID ?? "";
const CS = process.env.SHOPIFY_CLIENT_SECRET ?? "";

const SLEEP_PRODUCTS   = new Set(["advanced-magnesium-gummies","magnesium-gummies","magnesium-lotion"]);
const HORMONE_PRODUCTS = new Set(["ashwagandha-gummies","shilajit-gummies","tostero-capsules-60n","tostero-120-capsules","complete-endurance-kit-1x-endure-spray-1x-tostero-capsules","endure-long-last-spray-20ml"]);

async function getToken() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CI, client_secret: CS, grant_type: "client_credentials" }),
  });
  return (await r.json()).access_token;
}

async function gql(tok, query, variables) {
  const r = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": tok },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

async function getAllBHProducts(tok) {
  const out = [];
  let cursor = null;
  do {
    const data = await gql(tok, `
      query($first: Int!, $after: String) {
        products(first: $first, after: $after, query: "status:active") {
          nodes {
            id
            handle
            metafields(first: 10) {
              nodes { namespace key value }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `, { first: 250, after: cursor });

    for (const p of data.data.products.nodes) {
      const mf = {};
      for (const m of (p.metafields?.nodes || [])) {
        if (m?.namespace === "custom") mf[m.key] = m.value;
      }
      if (mf.bh_concern && mf.bh_score) {
        out.push({ id: p.id, handle: p.handle, concern: mf.bh_concern, segment: mf.bh_segment ?? "" });
      }
    }
    cursor = data.data.products.pageInfo.hasNextPage ? data.data.products.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}

async function main() {
  const tok = await getToken();
  const products = await getAllBHProducts(tok);
  console.log(`Found ${products.length} BH-tagged products to update.`);

  let fixed = 0, alreadyOk = 0;
  const NEW_SEGMENT = "male-18-25,male-25-35,male-35-plus";

  for (const p of products) {
    // Build correct concern
    let concern = p.concern;
    if (SLEEP_PRODUCTS.has(p.handle) && !concern.includes("sleep")) {
      concern = concern + ",sleep";
    }
    if (HORMONE_PRODUCTS.has(p.handle) && !concern.includes("hormones")) {
      concern = concern + ",hormones";
    }

    const segmentOk  = p.segment === NEW_SEGMENT;
    const concernOk  = concern === p.concern;
    if (segmentOk && concernOk) { alreadyOk++; continue; }

    const metafields = [];
    if (!segmentOk) metafields.push({
      ownerId: p.id, namespace: "custom", key: "bh_segment",
      type: "single_line_text_field", value: NEW_SEGMENT,
    });
    if (!concernOk) metafields.push({
      ownerId: p.id, namespace: "custom", key: "bh_concern",
      type: "single_line_text_field", value: concern,
    });

    const r = await gql(tok, `
      mutation($mf: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $mf) { userErrors { field message } }
      }
    `, { mf: metafields });

    const ue = r?.data?.metafieldsSet?.userErrors ?? [];
    if (ue.length) {
      console.error(`  ✗ ${p.handle}:`, ue.map(e => e.message).join(", "));
    } else {
      const changes = [];
      if (!segmentOk) changes.push("segment→age-groups");
      if (!concernOk) changes.push(`concern→${concern}`);
      console.log(`  ✓ ${p.handle} [${changes.join(", ")}]`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed} | Already correct: ${alreadyOk}`);
}

main().catch(e => { console.error(e); process.exit(1); });
