import type { Metadata, Viewport } from "next";
import { Manrope, Public_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/cart/CartDrawer";
import MixpanelProvider from "@/components/MixpanelProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BetterHalf — The AI that truly knows your body",
    template: "%s | BetterHalf",
  },
  description:
    "Personalised health protocols powered by 6.5M real Indian health journeys. AI-native wellness across nutrition, energy, gut health, and more.",
  keywords: [
    "health",
    "wellness",
    "AI",
    "nutrition",
    "personalised health",
    "Indian health",
  ],
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#004034",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${publicSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
        <Script
          id="gokwik-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.merchantInfo = { mid: "19k4npza24j4", environment: "production", type: "merchantInfo", storeId: 66931097696 };`,
          }}
        />
        <Script
          src="https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-dvh bg-surface text-on-surface" suppressHydrationWarning>
        <CartProvider>
          <MixpanelProvider>
            <CartDrawer />
            {children}
          </MixpanelProvider>
        </CartProvider>
      </body>
    </html>
  );
}
