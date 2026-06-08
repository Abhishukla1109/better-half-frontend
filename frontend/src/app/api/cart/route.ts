import { NextRequest, NextResponse } from "next/server";
import {
  createCart,
  addToCart,
  updateCartLine,
  removeCartLine,
  getCart,
} from "@/lib/shopify/api";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body as { action?: string };

  try {
    switch (action) {
      case "create": {
        const { variantId, quantity } = body as { variantId: string; quantity?: number };
        const cart = await createCart(variantId, quantity ?? 1);
        return NextResponse.json(cart);
      }
      case "add": {
        const { cartId, variantId, quantity } = body as { cartId: string; variantId: string; quantity?: number };
        const cart = await addToCart(cartId, variantId, quantity ?? 1);
        return NextResponse.json(cart);
      }
      case "update": {
        const { cartId, lineId, quantity } = body as { cartId: string; lineId: string; quantity: number };
        const cart = await updateCartLine(cartId, lineId, quantity);
        return NextResponse.json(cart);
      }
      case "remove": {
        const { cartId, lineId } = body as { cartId: string; lineId: string };
        const cart = await removeCartLine(cartId, lineId);
        return NextResponse.json(cart);
      }
      case "get": {
        const { cartId } = body as { cartId: string };
        const cart = await getCart(cartId);
        return NextResponse.json(cart ?? null);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[cart]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Shopify error" },
      { status: 500 },
    );
  }
}
