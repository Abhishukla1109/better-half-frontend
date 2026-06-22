#!/usr/bin/env node
// Archives the 14 merged Shopify products that were created during the variant migration.
// These cause duplicate catalog entries — the siblings approach in enriched JSONs handles
// variant switching without needing these to be active.

const SHOP = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.replace("https://", "").replace(/\/$/, "") ?? "betterhalf-4.myshopify.com";
const CLIENT_ID = process.env.SHOPIFY_ADMIN_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;

const MERGED_PRODUCT_IDS = [
  { id: 7736935252064, name: "charcoal-body-wash" },
  { id: 7736935284832, name: "biotin-hair-gummies" },
  { id: 7736935317600, name: "anti-hair-fall-shampoo" },
  { id: 7736935350368, name: "tostero-capsules" },
  { id: 7736935383136, name: "salicylic-acid-body-wash-bw" },
  { id: 7736935415904, name: "niacinamide-body-wash-bw" },
  { id: 7736935448672, name: "hair-growth-serum-roll-on-bw" },
  { id: 7736935481440, name: "nutrimix-nutrition-powder-lj" },
  { id: 7736935514208, name: "mamamix-nutrition-powder-lj" },
  { id: 7736935579744, name: "calcium-gummies-strawberry-lj" },
  { id: 7736935612512, name: "lj-multivitamin-gummies-all" },
  { id: 7736935645280, name: "aha-bha-underarm-roll-on-bw" },
  { id: 7736935710816, name: "nutrimix-7-nutrition-powder-lj" },
  { id: 7736935743584, name: "hair-activator-derma-roller-mm" },
];

async function getToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token fetch failed: " + JSON.stringify(data));
  return data.access_token;
}

async function archiveProduct(token, id, name) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/products/${id}.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ product: { id, status: "archived" } }),
  });
  const data = await res.json();
  if (data.product?.status === "archived") {
    console.log(`  ✓ ${name} (${id})`);
  } else {
    console.error(`  ✗ ${name}: ${JSON.stringify(data.errors ?? data)}`);
  }
}

const token = await getToken();
console.log("Archiving 14 merged products...\n");
for (const p of MERGED_PRODUCT_IDS) {
  await archiveProduct(token, p.id, p.name);
}
console.log("\nDone. Duplicates removed from catalog.");
