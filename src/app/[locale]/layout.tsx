import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Footer } from "@/components/chrome";
import { PriceTicker } from "@/components/PriceTicker";
import { Providers } from "@/components/Providers";
import { dirOf, hasLocale, locales } from "@/i18n";
import { SITE_URL, absoluteUrl, alternatesFor, jsonLd } from "@/lib/seo";
import { getPricesOrNull } from "@/lib/server-api";
import { site } from "@/lib/site";
import { getLinks } from "@/lib/site-links";
import { getTexts } from "@/lib/site-texts";
import { fontVariables } from "../fonts";
import "../styles/site.css";
import "../styles/ar.css";
import "../styles/help.css";
import "../styles/app.css";
import "../styles/controls.css";
import "../styles/ticker.css";

// Only /en and /ar exist. The layout below answers any other first segment with a 404.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  const rest = (await headers()).get("x-gg-path") ?? "";
  const path = rest || "/";
  const other = locale === "ar" ? "en_US" : "ar_EG";
  return {
    metadataBase: new URL(SITE_URL),
    title: t.meta.title,
    description: t.meta.description,
    // Absolute canonical (never with the query string) and hreflang (middleware sets x-gg-path).
    alternates: alternatesFor(locale, path),
    // Pages that set their own title/description repeat them through `socialFor`; these are the shared parts.
    openGraph: {
      type: "website",
      siteName: "GoldGram",
      url: absoluteUrl(locale, path),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: other,
    },
    twitter: { card: "summary" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const links = await getLinks();

  return (
    // data-scroll-behavior: the stylesheet sets smooth scrolling for in-page anchors, and
    // Next.js 16 only makes page changes jump straight to the top when asked to.
    <html lang={locale} dir={dirOf(locale)} className={fontVariables} data-scroll-behavior="smooth">
      <body>
        {/* Organization + WebSite on every page (SCH-01). Built from our own constants, escaped by jsonLd. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "GoldGram",
                url: SITE_URL,
                logo: `${SITE_URL}/logo.png`,
                contactPoint: [{ "@type": "ContactPoint", telephone: site.hotline, contactType: "customer service", availableLanguage: ["ar", "en"] }],
                sameAs: [links.instagramUrl, links.facebookUrl, links.tiktokUrl].filter((u): u is string => Boolean(u)),
              },
              { "@context": "https://schema.org", "@type": "WebSite", name: "GoldGram", url: SITE_URL, inLanguage: locale === "ar" ? "ar-EG" : "en" },
            ]),
          }}
        />
        <Providers locale={locale} dict={t}>
          {/* Seeded on the server so the strip is never empty; the price stream keeps it live. */}
          <PriceTicker initial={await getPricesOrNull()} />
          {children}
          <Footer t={t} locale={locale} />
        </Providers>
      </body>
    </html>
  );
}
