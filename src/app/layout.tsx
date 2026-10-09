import type { Metadata, Viewport } from "next";
import PwaProvider from "@/components/pwa/PwaProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecommerce PWA",
  description: "A step-by-step Next.js e-commerce PWA project.",
  applicationName: "ShopWave",
  appleWebApp: { capable: true, title: "ShopWave", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0a1628" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
