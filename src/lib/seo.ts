// Search rules in one place (pure, so they can be tested): the one host, canonical and hreflang,
// which pages stay out of the index, the sitemap XML, robots.txt, and safe JSON-LD.
import { localePath, type Locale } from "@/i18n";

/** The one public host (TEC-03). Override per environment; no trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://goldgram.eg").replace(/\/+$/, "");

/** Pages that must never be indexed or listed in a sitemap (IDX-05, PG-17). */
export const PRIVATE = /^\/(account|checkout|sign-in|sign-up|forgot-password|reset-password)(\/|$)/;

/** Absolute URL of a path in a language. Arabic at the root, English under /en; never a trailing slash. */
export function absoluteUrl(locale: Locale, path: string): string {
  return SITE_URL + localePath(locale, path.replace(/(.)\/+$/, "$1"));
}

/** hreflang values: ar-EG, en, and x-default pointing at the Arabic page (IDX-04). */
export function hreflangLinks(path: string): { hreflang: string; href: string }[] {
  return [
    { hreflang: "ar-EG", href: absoluteUrl("ar", path) },
    { hreflang: "en", href: absoluteUrl("en", path) },
    { hreflang: "x-default", href: absoluteUrl("ar", path) },
  ];
}

/** Canonical + hreflang for a page; noindex pages carry no hreflang at all. */
export function alternatesFor(locale: Locale, path: string) {
  const canonical = absoluteUrl(locale, path);
  if (PRIVATE.test(path)) return { canonical };
  return {
    canonical,
    languages: Object.fromEntries(hreflangLinks(path).map((l) => [l.hreflang, l.href])),
  };
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export type SitemapEntry = { path: string; lastModified?: string };

/** One sitemap file: every path is listed in both languages, each with its alternates (IDX-02). */
export function sitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.flatMap((e) =>
    (["ar", "en"] as const).map((locale) => {
      const alternates = hreflangLinks(e.path)
        .map((l) => `<xhtml:link rel="alternate" hreflang="${l.hreflang}" href="${escapeXml(l.href)}"/>`)
        .join("");
      const lastmod = e.lastModified ? `<lastmod>${escapeXml(e.lastModified.slice(0, 10))}</lastmod>` : "";
      return `<url><loc>${escapeXml(absoluteUrl(locale, e.path))}</loc>${lastmod}${alternates}</url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
}

export function sitemapIndexXml(names: string[]): string {
  const items = names.map((n) => `<sitemap><loc>${SITE_URL}/sitemaps/${n}.xml</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`;
}

/** robots.txt (IDX-01): crawl everything but the API, keep product/article images and the sitemap. */
export function robotsTxt(): string {
  return [
    "User-agent: *",
    "Disallow: /api/",
    "Allow: /api/products/*/images/",
    "Allow: /api/articles/*/images/",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

/** JSON-LD as a script body. `<` is escaped so CMS text can never close the script tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function breadcrumbList(items: { name: string; path: string; locale: Locale }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.locale, item.path),
    })),
  };
}

export function productJsonLd(p: {
  name: string;
  description: string;
  url: string;
  images: string[];
  brand: string;
  weightGrams: number;
  pricePiastres: number;
  inStock: boolean;
  sku: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    ...(p.images.length ? { image: p.images } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    weight: { "@type": "QuantitativeValue", value: p.weightGrams, unitCode: "GRM" },
    offers: {
      "@type": "Offer",
      url: p.url,
      priceCurrency: "EGP",
      price: (p.pricePiastres / 100).toFixed(2),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
