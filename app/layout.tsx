import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// Poppins, as on aiesec.lk.
const poppins = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.shortName}` },
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
