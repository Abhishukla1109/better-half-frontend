const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? "";
const SHOP = "betterhalf-4.myshopify.com";

async function getToken() {
  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const data = await res.json();
  return data.access_token;
}

async function gql(token, query, variables) {
  const res = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function pushMetafields(token, productId, concern, gender, segment, score) {
  const mutation = `
    mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key value }
        userErrors { field message }
      }
    }
  `;
  const metafields = [
    { ownerId: productId, namespace: "custom", key: "bh_concern", type: "single_line_text_field", value: concern },
    { ownerId: productId, namespace: "custom", key: "bh_gender", type: "single_line_text_field", value: gender },
    { ownerId: productId, namespace: "custom", key: "bh_segment", type: "single_line_text_field", value: segment },
    { ownerId: productId, namespace: "custom", key: "bh_score", type: "number_integer", value: String(score) },
    { ownerId: productId, namespace: "custom", key: "bh_follow_up", type: "single_line_text_field", value: "false" },
  ];
  return gql(token, mutation, { metafields });
}

async function createProduct(token, title, handle, vendor, productType) {
  const mutation = `
    mutation CreateProduct($input: ProductInput!) {
      productCreate(input: $input) {
        product { id handle title }
        userErrors { field message }
      }
    }
  `;
  const input = {
    title, handle, vendor, productType, status: "ACTIVE",
  };
  return gql(token, mutation, { input });
}

async function getProductIdByHandle(token, handle) {
  const res = await fetch(
    `https://${SHOP}/admin/api/2024-01/products.json?handle=${handle}&fields=id,handle,title`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();
  if (data.products?.length > 0) {
    return `gid://shopify/Product/${data.products[0].id}`;
  }
  return null;
}

async function main() {
  const token = await getToken();

  // ── 1. Anti-Dandruff Pro Kit ───────────────────────────────────────────────
  console.log("Creating anti-dandruff-pro-kit...");
  const r1 = await createProduct(token, "Anti-Dandruff Pro Kit", "anti-dandruff-pro-kit", "Man Matters", "Hair Care");
  const p1 = r1?.data?.productCreate;
  if (p1?.userErrors?.length) { console.error("errors:", p1.userErrors); }
  else {
    console.log("Created:", p1.product.handle);
    const mr1 = await pushMetafields(token, p1.product.id, "hair", "male", "man-matters", 80);
    const ue1 = mr1?.data?.metafieldsSet?.userErrors;
    if (ue1?.length) console.error("metafield errors:", ue1);
    else console.log("anti-dandruff-pro-kit metafields: done");
  }

  // ── 2. Beardmax Growth Serum 30ml ─────────────────────────────────────────
  console.log("Creating beardmax-growth-serum-30-ml...");
  const r2 = await createProduct(token, "Beardmax Growth Serum (30 ml)", "beardmax-growth-serum-30-ml", "Man Matters", "Beard Care");
  const p2 = r2?.data?.productCreate;
  if (p2?.userErrors?.length) { console.error("errors:", p2.userErrors); }
  else {
    console.log("Created:", p2.product.handle);
    const mr2 = await pushMetafields(token, p2.product.id, "beard", "male", "man-matters", 85);
    const ue2 = mr2?.data?.metafieldsSet?.userErrors;
    if (ue2?.length) console.error("metafield errors:", ue2);
    else console.log("beardmax-growth-serum-30-ml metafields: done");
  }

  // ── 3. Beard Growth Kit for Low Beard ────────────────────────────────────
  console.log("Creating beard-growth-kit-for-low-beard...");
  const r3 = await createProduct(token, "Beard Growth Kit for Low Beard", "beard-growth-kit-for-low-beard", "Man Matters", "Beard Care");
  const p3 = r3?.data?.productCreate;
  if (p3?.userErrors?.length) { console.error("errors:", p3.userErrors); }
  else {
    console.log("Created:", p3.product.handle);
    const mr3 = await pushMetafields(token, p3.product.id, "beard", "male", "man-matters", 90);
    const ue3 = mr3?.data?.metafieldsSet?.userErrors;
    if (ue3?.length) console.error("metafield errors:", ue3);
    else console.log("beard-growth-kit-for-low-beard metafields: done");
  }

  // ── 4. Advanced Magnesium Gummies (existing) ──────────────────────────────
  console.log("Pushing metafields to magnesium-gummies...");
  const id4 = await getProductIdByHandle(token, "magnesium-gummies");
  if (!id4) { console.error("magnesium-gummies not found"); }
  else {
    const mr4 = await pushMetafields(token, id4, "energy", "male", "man-matters", 75);
    const ue4 = mr4?.data?.metafieldsSet?.userErrors;
    if (ue4?.length) console.error("metafield errors:", ue4);
    else console.log("magnesium-gummies metafields: done");
  }

  console.log("\nAll done.");
}

main().catch(console.error);
