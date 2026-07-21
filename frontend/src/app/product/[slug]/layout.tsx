import type { Metadata } from "next";

const SHOP     = (process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "").replace(/\/$/, "").replace("https://", "");
const SF_TOKEN = process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? "";

async function fetchProductMeta(handle: string) {
  try {
    const res = await fetch(`https://${SHOP}/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SF_TOKEN,
      },
      body: JSON.stringify({
        query: `
          query($handle: String!) {
            productByHandle(handle: $handle) {
              title
              description
              images(first: 1) { nodes { url } }
              metafields(identifiers: [{ namespace: "custom", key: "bh_subtitle" }]) { key value }
            }
          }
        `,
        variables: { handle },
      }),
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return data?.data?.productByHandle ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductMeta(slug);
  if (!product) return {};

  const subtitle = product.metafields?.find((m: { key: string; value: string }) => m.key === "bh_subtitle")?.value;
  const description = (subtitle || product.description || "").slice(0, 160);
  const image = product.images?.nodes?.[0]?.url;

  return {
    title: product.title,
    description,
    openGraph: {
      title: `${product.title} | BetterHalf`,
      description,
      ...(image && { images: [{ url: image, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | BetterHalf`,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
