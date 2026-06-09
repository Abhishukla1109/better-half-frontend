/**
 * Creates all missing BetterHalf metafield definitions on Shopify.
 * Safe to re-run — skips definitions that already exist.
 *
 * Run: node scripts/create-metafield-definitions.mjs
 */

const SHOP = process.env.SHOPIFY_SHOP ?? "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET ?? "";
const ADMIN_API = `https://${SHOP}/admin/api/2024-01/graphql.json`;

const DEFINITIONS = [
  // Already created via test — included so this file is the complete source of truth
  { name: "BH Subtitle",            key: "bh_subtitle",             type: "single_line_text_field" },
  // New ones
  { name: "BH For With",            key: "bh_for_with",             type: "json" },
  { name: "BH Badges",              key: "bh_badges",               type: "json" },
  { name: "BH Reviews",             key: "bh_reviews",              type: "json" },
  { name: "BH Product Details",     key: "bh_product_details",      type: "json" },
  { name: "BH Packs",               key: "bh_packs",                type: "json" },
  { name: "BH Disclaimers",         key: "bh_disclaimers",          type: "json" },
  { name: "BH Additional Info",     key: "bh_additional_info",      type: "json" },
  { name: "BH Age Group",           key: "bh_age_group",            type: "single_line_text_field" },
  { name: "BH Allergens",           key: "bh_allergens",            type: "json" },
  { name: "BH Product Type",        key: "bh_product_type",         type: "single_line_text_field" },
  { name: "BH Benefits",            key: "bh_benefits",             type: "json" },
  { name: "BH Full Ingredients",    key: "bh_full_ingredients",     type: "multi_line_text_field" },
];

async function getToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const { access_token } = await res.json();
  return access_token;
}

async function gql(token, query, variables) {
  const res = await fetch(ADMIN_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const CREATE_DEF = `mutation($def: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $def) {
    createdDefinition { name key }
    userErrors { field message code }
  }
}`;

async function main() {
  const token = await getToken();

  for (const def of DEFINITIONS) {
    const data = await gql(token, CREATE_DEF, {
      def: { name: def.name, namespace: "custom", key: def.key, type: def.type, ownerType: "PRODUCT" },
    });
    const result = data.metafieldDefinitionCreate;
    const errs = result.userErrors;

    if (errs?.length) {
      const alreadyExists = errs.some((e) => e.code === "TAKEN");
      if (alreadyExists) {
        console.log(`EXISTS: ${def.key}`);
      } else {
        console.log(`FAIL: ${def.key} — ${errs[0].message}`);
      }
    } else {
      console.log(`CREATED: ${def.key} (${def.type})`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\nAll definitions processed.");
}

main().catch((err) => { console.error(err); process.exit(1); });
