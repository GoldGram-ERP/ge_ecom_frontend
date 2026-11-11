import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Analytics } from "@/components/analytics";
import { CONSENT_DEFAULTS } from "@/lib/analytics";
import { Footer } from "@/components/chrome";
import { PriceTicker } from "@/components/PriceTicker";
import { Providers } from "@/components/Providers";
import { dirOf, hasLocale, locales } from "@/i18n";
import { SITE_URL, absoluteUrl, alternatesFor, isFilterQuery, jsonLd, organizationJsonLd, PRIVATE } from "@/lib/seo";
import { getBusiness, getSeoSite } from "@/lib/seo-data";
import { getPricesOrNull } from "@/lib/server-api";
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

/**
 * The shared parts of every page's head. Each page sets its own title and description (never the
 * home page's, DSH-01); utility pages and filtered views get noindex, follow here (IDX-05, IDX-07).
 */
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const request = await headers();
  const path = request.get("x-gg-path") || "/";
  const query = request.get("x-gg-query") ?? "";
  const business = await getBusiness();
  const noindex = PRIVATE.test(path) || isFilterQuery(query);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: business.siteName[locale],
    // Absolute canonical (never with tracking parameters) and hreflang (the proxy sets x-gg-path).
    alternates: noindex ? { canonical: absoluteUrl(locale, path) + (query ? `?${query}` : "") } : alternatesFor(locale, path),
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: business.siteName[locale],
      url: absoluteUrl(locale, path),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_EG",
    },
    twitter: { card: "summary" },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, business, seo] = await Promise.all([getTexts(locale), getBusiness(), getSeoSite()]);

  return (
    // data-scroll-behavior: the stylesheet sets smooth scrolling for in-page anchors, and
    // Next.js 16 only makes page changes jump straight to the top when asked to.
    <html lang={locale === "ar" ? "ar-EG" : "en"} dir={dirOf(locale)} className={fontVariables} data-scroll-behavior="smooth">
      <body>
        {/* The data layer and the Consent Mode defaults, before any custom code, Tag Manager or push (R1, section 10). */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS }} />
        {/* The site-wide custom code (DSH-13, set by a super admin only), then Tag Manager's no-JS frame. */}
        {seo?.headCode ? <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: seo.headCode }} /> : null}
        {seo?.bodyStartCode ? <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: seo.bodyStartCode }} /> : null}
        {/^GTM-[A-Z0-9]{4,12}$/.test(seo?.gtmId ?? "") ? (
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${seo!.gtmId}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
          </noscript>
        ) : null}
        {/* Organization + WebSite on every page (SCH-01), from the business details, escaped by jsonLd. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd([
              organizationJsonLd(business, locale),
              { "@context": "https://schema.org", "@type": "WebSite", name: business.siteName[locale], url: SITE_URL, inLanguage: locale === "ar" ? "ar-EG" : "en" },
            ]),
          }}
        />
        <Providers locale={locale} dict={t}>
          {/* Seeded on the server so the strip is never empty; the price stream keeps it live. */}
          <PriceTicker initial={await getPricesOrNull()} />
          {children}
          <Footer t={t} locale={locale} />
        </Providers>
        <Analytics gtmId={seo?.gtmId ?? ""} />
        {seo?.bodyEndCode ? <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: seo.bodyEndCode }} /> : null}
      </body>
    </html>
  );
}
