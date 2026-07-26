import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { site } from "@/lib/site";

import "./globals.css";

/**
 * DESIGN.MD's type system is Cal Sans for display and Inter for everything
 * else. Cal Sans is licensed to Cal.com and not publicly available
 * (DESIGN.MD:357), so the documented substitute is used: Inter at weight 600
 * with negative tracking, applied by the `.t-display-*` classes. JetBrains Mono
 * covers `{typography.code}`.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: ThemeScript adds `.dark` to this element before
    // React hydrates, so the class attribute legitimately differs from the HTML
    // the server produced.
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-canvas text-body">
        <ThemeScript />

        <ThemeProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>

          <TopNav />

          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
