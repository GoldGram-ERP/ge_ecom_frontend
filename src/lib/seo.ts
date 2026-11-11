// Search rules in one place (pure, so they can be tested): the one host, canonical and hreflang,
// which pages stay out of the index, the sitemap XML, robots.txt, safe JSON-LD, the SEO templates
// and per-page metadata, and the redirect rules.
import type { Metadata } from "next";
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

// ---------------------------------------------------------------------------------------------
// Query strings (TEC-04, IDX-07): tracking parameters never reach the canonical; ?page=N is its own
// indexable page; any other parameter (a filter or a sort) is noindex with a self canonical.

const TRACKING = /^(utm_[a-z_]+|fbclid|gclid|gbraid|wbraid|msclkid|dclid|yclid|ttclid|twclid|li_fat_id|mc_cid|mc_eid|_ga|_gl|igshid|ref)$/i;

/** The query that belongs in the canonical: everything but tracking, sorted; `page=1` dropped. */
export function canonicalQuery(search: string): string {
  const params = new URLSearchParams(search);
  const kept = [...params].filter(([key, value]) => !TRACKING.test(key) && !(key === "page" && value === "1"));
  kept.sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(kept).toString();
}

/** The page number of a listing (?page=N), 1 when absent or not a whole number above 1. */
export function pageNumber(query: string): number {
  const n = Number(new URLSearchParams(query).get("page"));
  return Number.isInteger(n) && n > 1 ? n : 1;
}

/** A canonical query that only paginates stays indexable; a filter or sort is noindex, follow. */
export const isFilterQuery = (query: string) => [...new URLSearchParams(query).keys()].some((key) => key !== "page");

// ---------------------------------------------------------------------------------------------
// SEO panel data (the contract in SEO-BUILD-BRIEF.md): a value per language is { ar, en }.

export type L = { ar: string; en: string };

export interface SeoEntry {
  type: string;
  key: string;
  title: L;
  description: L;
  h1: L;
  canonical: string;
  index: boolean;
  follow: boolean;
  inSitemap: boolean;
  ogTitle: L;
  ogDescription: L;
  ogImageUrl: string;
  breadcrumbLabel: L;
  introHtml: L;
  faq: { q: L; a: L }[];
  headCode: string;
  focusKeyword: string;
  updatedAt: string;
}

export interface Business {
  siteName: L;
  legalName: L;
  logoUrl: string;
  logoPngUrl: string;
  defaultOgImageUrl: string;
  hotline: string;
  whatsapp: string;
  email: string;
  address: L;
  mapLat: string;
  mapLng: string;
  mapUrl: string;
  openingHours: L;
  commercialRegister: string;
  taxRegistration: string;
  hallmarking: string;
  socialUrls: { instagram: string; facebook: string; tiktok: string; x: string; youtube: string; linkedin: string };
  appStoreUrl: string;
  googlePlayUrl: string;
}


export interface SeoSite {
  business: Business;
  titleSeparator: string;
  brandSuffix: L;
  robotsTxt: string;
  verification: { google: string; bing: string; meta: string };
  gtmId: string;
  headCode: string;
  bodyStartCode: string;
  bodyEndCode: string;
}

export const TEMPLATE_TYPES = ["home", "static", "category", "weight", "product", "brand", "guide", "guides", "price", "faq"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];
export type SeoTemplates = Record<TemplateType, Record<Locale, { title: string; description: string }>>;

/**
 * The starting templates (section 11 of the SEO document), used for any page type the dashboard
 * has not saved yet, so a page never borrows the home title. {name} is the page's own name.
 */
export const DEFAULT_TEMPLATES: SeoTemplates = {
  home: {
    ar: { title: "شراء سبائك وجنيهات الذهب بسعر اليوم في مصر | {site}", description: "اشترِ سبائك وجنيهات ذهب عيار 24 من ربع جرام إلى كيلو بسعر اليوم، بفاتورة باسمك واستلام من الفرع أو توصيل. سعر الجرام الآن {price_buy} جنيه." },
    en: { title: "Buy gold bars and coins at today's price in Egypt | {site}", description: "Buy 24K gold bars and coins from a quarter gram to a kilo at today's price, invoiced in your name, collected from our branch or delivered. Gram price now EGP {price_buy}." },
  },
  static: {
    ar: { title: "{name} | {site}", description: "{name} من {site}: ذهب معتمد بسعر اليوم، بفاتورة باسمك واستلام من الفرع أو توصيل." },
    en: { title: "{name} | {site}", description: "{name} from {site}: certified gold at today's price, invoiced in your name, collected or delivered." },
  },
  category: {
    ar: { title: "{name} | {site}", description: "{name} بسعر اليوم في مصر شامل المصنعية، بفاتورة باسمك واستلام من الفرع أو توصيل. سعر جرام عيار 24 الآن {price_buy} جنيه." },
    en: { title: "{name} | {site}", description: "{name} at today's price in Egypt, making charge included, invoiced in your name, collected or delivered. 24K now EGP {price_buy} per gram." },
  },
  weight: {
    ar: { title: "سعر سبيكة ذهب {weight} جرام اليوم عيار 24 | {site}", description: "سعر سبيكة الذهب {weight} جرام عيار 24 اليوم يبدأ من {price_buy} جنيه شامل المصنعية. قارن العلامات وسعر إعادة البيع، واشترِ بفاتورة باسمك." },
    en: { title: "{weight} g gold bar price today, 24K | {site}", description: "A {weight} g 24K gold bar today from EGP {price_buy}, making charge included. Compare brands and buyback prices, and buy with an invoice in your name." },
  },
  product: {
    ar: { title: "سعر {name} اليوم | {site}", description: "{name} بسعر {price_buy} جنيه اليوم شامل مصنعية {making_per_gram} جنيه للجرام. بفاتورة باسمك، واستلام من الفرع أو توصيل." },
    en: { title: "{name} price today | {site}", description: "{name} at EGP {price_buy} today, including a making charge of EGP {making_per_gram} per gram. Invoiced in your name, collected or delivered." },
  },
  brand: {
    ar: { title: "سبائك {brand}: الأسعار والمصنعية اليوم | {site}", description: "كل سبائك وجنيهات {brand} بسعر اليوم، مع المصنعية وسعر إعادة البيع عبر التطبيق." },
    en: { title: "{brand} gold bars: prices and making charges today | {site}", description: "Every {brand} bar and coin at today's price, with making charges and the buyback price in the app." },
  },
  guide: {
    ar: { title: "{name} | {site}", description: "{name}: دليل {site} لشراء الذهب في مصر." },
    en: { title: "{name} | {site}", description: "{name}: a {site} guide to buying gold in Egypt." },
  },
  guides: {
    ar: { title: "دليل شراء الذهب: مقالات وأسعار ونصائح | {site}", description: "مقالات {site} عن أسعار الذهب والمصنعية والزكاة وكيف تختار السبيكة المناسبة لك." },
    en: { title: "Gold buying guide: articles, prices and tips | {site}", description: "{site} guides on gold prices, making charges, zakat and choosing the right bar." },
  },
  price: {
    ar: { title: "سعر الذهب اليوم في مصر عيار 24 و21 و18 | {site}", description: "سعر جرام الذهب عيار 24 اليوم {price_buy} جنيه للشراء و{price_sell} جنيه لإعادة البيع عبر التطبيق، مع أسعار عيار 21 و18 والجنيه الذهب والأونصة." },
    en: { title: "Gold price today in Egypt: 24K, 21K and 18K | {site}", description: "24K gold today: EGP {price_buy} per gram to buy and EGP {price_sell} to sell back in the app, with 21K, 18K, the gold pound and the ounce." },
  },
  faq: {
    ar: { title: "الأسئلة الشائعة عن شراء الذهب | {site}", description: "إجابات {site} عن الشراء والأسعار والمصنعية والتوصيل والدفع وإعادة البيع عبر التطبيق." },
    en: { title: "Gold buying FAQ | {site}", description: "{site} answers on buying, prices, making charges, delivery, payment and selling back in the app." },
  },
};

/** Spaces and line breaks collapsed to one space. */
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Cut a text at a word boundary so it is at most `max` characters: never mid-word, never ending on a
 * separator or comma, with no line breaks. A text that already fits is only made one line.
 */
export function trimAtWord(text: string, max: number): string {
  const line = oneLine(text);
  if (line.length <= max) return line;
  const cut = line.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  const head = space > 0 ? cut.slice(0, space) : line.slice(0, max);
  return head.replace(/[\s|·:,،؛;\-–—]+$/u, "");
}

/**
 * Fill {variables} from the page's own values. A missing or empty value leaves no trace: the
 * placeholder goes, and the spaces and separators it leaves behind are tidied.
 */
export function resolveTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  const filled = template.replace(/\{(\w+)\}/g, (_, key: string) => oneLine(String(vars[key] ?? "")));
  return oneLine(filled)
    .replace(/\s+([,،.:;])/g, "$1")
    .replace(/^[\s|·:,،\-–—]+|[\s|·:,،\-–—]+$/gu, "")
    .replace(/(\s[|·]\s*)+(?=[|·])/g, " ");
}

export const TITLE_MAX = 70;
export const DESCRIPTION_MAX = 160;

export type PageSeoInput = {
  locale: Locale;
  /** The page's clean path without its language, e.g. `/gold-bars/10-gram`. */
  path: string;
  /** The canonical query (see canonicalQuery), e.g. `page=2`. */
  query?: string;
  type: TemplateType;
  /** Template variables; {name} is the page's own name, {site} the brand. */
  vars: Record<string, string | number | undefined>;
  entry: SeoEntry | null;
  templates: SeoTemplates;
  siteName: string;
  /** Absolute image for og:image when the entry has none; the site default otherwise. */
  image?: string;
  imageAlt?: string;
  defaultImage?: string;
  ogType?: "website" | "article";
  /** Out of the index whatever the entry says (an empty listing, a private page). */
  noindex?: boolean;
};

/** The texts a page shows in search: the entry's own, else the template's, trimmed (DSH-01/02). */
export function seoTexts(input: PageSeoInput): { title: string; description: string } {
  const { locale, entry, templates, type } = input;
  const vars = { ...input.vars, site: input.siteName };
  const template = templates[type]?.[locale] ?? DEFAULT_TEMPLATES[type][locale];
  const page = pageNumber(input.query ?? "");
  const suffix = page > 1 ? (locale === "ar" ? ` - صفحة ${page}` : ` - Page ${page}`) : "";
  const title = trimAtWord(entry?.title?.[locale] || resolveTemplate(template.title, vars), TITLE_MAX) + suffix;
  const description = trimAtWord(entry?.description?.[locale] || resolveTemplate(template.description, vars), DESCRIPTION_MAX);
  return { title, description };
}

/**
 * A page's whole <head> for search and sharing: title, description, robots, canonical (the entry's
 * override, else the clean URL with only the canonical query), hreflang for indexable pages, and
 * Open Graph / X cards that repeat the SEO texts unless the entry has its own (SOC-01).
 */
export function pageMetadata(input: PageSeoInput): Metadata {
  const { locale, path, entry } = input;
  const { title, description } = seoTexts(input);
  const query = input.query ?? "";
  const own = absoluteUrl(locale, path) + (query ? `?${query}` : "");
  const filtered = isFilterQuery(query);
  const index = !input.noindex && !filtered && !PRIVATE.test(path) && entry?.index !== false;
  // An override applies to the page itself, never to its filtered views (no canonical elsewhere with noindex).
  const canonical = entry?.canonical && !filtered ? entry.canonical : own;
  const languages = index
    ? Object.fromEntries(hreflangLinks(path).map((l) => [l.hreflang, l.href + (query ? `?${query}` : "")]))
    : undefined;
  const ogTitle = entry?.ogTitle?.[locale] || title;
  const ogDescription = entry?.ogDescription?.[locale] || description;
  const image = entry?.ogImageUrl || input.image || input.defaultImage;
  const images = image ? [{ url: image, ...(input.imageAlt ? { alt: input.imageAlt } : { alt: ogTitle }) }] : undefined;
  return {
    title: { absolute: title },
    description,
    robots: { index, follow: entry?.follow !== false },
    alternates: { canonical, ...(languages ? { languages } : {}) },
    openGraph: {
      type: input.ogType ?? "website",
      siteName: input.siteName,
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_EG",
      ...(images ? { images } : {}),
    },
    twitter: { card: images ? "summary_large_image" : "summary", title: ogTitle, description: ogDescription, ...(images ? { images: images.map((i) => i.url) } : {}) },
  };
}

// ---------------------------------------------------------------------------------------------
// Redirect rules (DSH-12, IDX-06): applied in proxy.ts before rendering, in one hop.

export type RedirectRule = { from: string; to: string; type: 301 | 302 | 410 };

/** A path as rules store it: no trailing slash, case kept, decoded once. */
const rulePath = (path: string) => {
  const clean = path.replace(/(.)\/+$/, "$1");
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
};

/**
 * What a request path answers with under the rules, or null. A rule written for the Arabic path
 * also covers its /en twin (and the reverse), unless that twin has a rule of its own. The query is
 * kept on 301/302; a target that is itself redirected is followed, so the visitor takes one hop.
 */
export function applyRedirect(rules: RedirectRule[], pathname: string, search: string): { status: 301 | 302 | 410; location?: string } | null {
  const byFrom = new Map(rules.map((r) => [rulePath(r.from), r]));
  const twin = (path: string) => (path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path === "/" ? "/en" : `/en${path}`);
  const find = (path: string): { rule: RedirectRule; en: boolean } | null => {
    const own = byFrom.get(path);
    if (own) return { rule: own, en: false };
    const isEn = path === "/en" || path.startsWith("/en/");
    const other = isEn ? byFrom.get(twin(path)) : undefined;
    return other ? { rule: other, en: true } : null;
  };
  const start = rulePath(pathname);
  const hit = find(start);
  if (!hit) return null;
  if (hit.rule.type === 410) return { status: 410 };
  const status = hit.rule.type;
  const seen = new Set([start]);
  let target = hit.en && hit.rule.to.startsWith("/") ? twin(hit.rule.to) : hit.rule.to;
  // Follow chains on our own paths, at most a few steps, and never round a loop.
  for (let step = 0; step < 5 && target.startsWith("/"); step++) {
    const next = find(rulePath(target.split("?")[0]));
    if (!next || seen.has(rulePath(target))) break;
    if (next.rule.type === 410) return { status: 410 };
    seen.add(rulePath(target));
    target = next.en && next.rule.to.startsWith("/") ? twin(next.rule.to) : next.rule.to;
  }
  if (rulePath(target.split("?")[0]) === start) return null; // a loop back to itself: serve the page
  const location = search && !target.includes("?") ? target + search : target;
  return { status, location };
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

/**
 * robots.txt (IDX-01, DSH-11): the text saved in the dashboard, else the default. A saved text
 * without a Sitemap line, or one that blocks the whole site, is not served: the default is.
 */
export function robotsTxt(saved?: string | null): string {
  const text = saved?.trim();
  if (text && /^sitemap:\s*\S+/im.test(text) && !/^disallow:\s*\/\s*$/im.test(text)) return `${text}\n`;
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

/** A guide or entry's custom head code: only valid JSON-LD is accepted, re-serialized safely. */
export function customJsonLd(code: string | undefined | null): string | null {
  if (!code?.trim()) return null;
  try {
    const data = JSON.parse(code) as unknown;
    return data && typeof data === "object" ? jsonLd(data) : null;
  } catch {
    return null;
  }
}

/** FAQPage (SCH-06): only the questions shown on the page; null when there are none. */
export function faqPageJsonLd(items: { q: string; a: string }[]) {
  const shown = items.filter((i) => i.q.trim() && i.a.trim());
  if (!shown.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: shown.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

/** ItemList (SCH-05): the products of a grid, in order, with their URL and position. */
export function itemListJsonLd(locale: Locale, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(locale, item.path), name: item.name })),
  };
}

/** WebPage with dateModified = the last price publish (SCH-08). */
export function webPageJsonLd(p: { locale: Locale; path: string; name: string; dateModified: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.name,
    url: absoluteUrl(p.locale, p.path),
    inLanguage: p.locale === "ar" ? "ar-EG" : "en",
    dateModified: p.dateModified,
  };
}

/** Organization (SCH-01) from the business details: both spellings, hotline, social profiles. */
export function organizationJsonLd(b: Business, locale: Locale) {
  const sameAs = Object.values(b.socialUrls ?? {}).filter((u) => /^https?:\/\//.test(u));
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: b.siteName[locale],
    alternateName: [b.siteName.ar, b.siteName.en].filter((n) => n && n !== b.siteName[locale]),
    ...(b.legalName?.[locale] ? { legalName: b.legalName[locale] } : {}),
    url: SITE_URL,
    logo: b.logoPngUrl || b.logoUrl || `${SITE_URL}/logo.png`,
    ...(b.email ? { email: b.email } : {}),
    ...(b.hotline ? { contactPoint: [{ "@type": "ContactPoint", telephone: b.hotline, contactType: "customer service", availableLanguage: ["ar", "en"] }] } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * JewelryStore (SCH-04) for the home and contact pages, only once the branch address is set:
 * an empty address means the dashboard has not confirmed it, and no store is claimed.
 */
export function jewelryStoreJsonLd(b: Business, locale: Locale) {
  const address = b.address?.[locale] || b.address?.ar || b.address?.en;
  if (!address) return null;
  const lat = Number(b.mapLat);
  const lng = Number(b.mapLng);
  const hours = b.openingHours?.[locale];
  return {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: b.siteName[locale],
    url: SITE_URL,
    image: b.defaultOgImageUrl || b.logoPngUrl || `${SITE_URL}/logo.png`,
    address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "EG" },
    ...(b.mapLat && b.mapLng && Number.isFinite(lat) && Number.isFinite(lng) ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng } } : {}),
    ...(b.hotline ? { telephone: b.hotline } : {}),
    ...(b.mapUrl ? { hasMap: b.mapUrl } : {}),
    ...(hours ? { openingHours: hours } : {}),
    priceRange: "EGP",
  };
}

/** MobileApplication (SCH-09) for /app, only when at least one store URL is set; no ratings. */
export function mobileAppJsonLd(b: Business, locale: Locale) {
  const stores = [b.appStoreUrl, b.googlePlayUrl].filter((u) => /^https?:\/\//.test(u ?? ""));
  if (!stores.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: b.siteName[locale],
    operatingSystem: [b.appStoreUrl && "iOS", b.googlePlayUrl && "Android"].filter(Boolean).join(", "),
    applicationCategory: "FinanceApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EGP" },
    sameAs: stores,
    ...(b.appStoreUrl ? { downloadUrl: b.appStoreUrl } : { downloadUrl: b.googlePlayUrl }),
  };
}

// ---------------------------------------------------------------------------------------------
// Weight pages (PG-04) and sitemap filtering (IDX-02).

const NAMED_WEIGHTS: Record<string, string> = { "0.25": "quarter-gram", "0.5": "half-gram", "31.1": "1-ounce", "31.10": "1-ounce", "1000": "1-kilo" };

/** A bar weight's URL slug: 10 → 10-gram, 2.5 → 2-5-gram, ¼ → quarter-gram, 31.1 → 1-ounce, 1000 → 1-kilo. */
export function weightSlug(grams: number): string {
  return NAMED_WEIGHTS[String(grams)] ?? `${String(grams).replace(".", "-")}-gram`;
}

export type SitemapFlag = { key: string; index: boolean; inSitemap: boolean; updatedAt?: string };

/**
 * Keep only what belongs in a sitemap: an entry switched to noindex or out of the sitemap is
 * left out; an entry's own date stands in for lastmod when the page has none.
 */
export function filterSitemap<T extends SitemapEntry & { key: string }>(items: T[], flags: SitemapFlag[]): SitemapEntry[] {
  const byKey = new Map(flags.map((f) => [f.key, f]));
  return items
    .filter((item) => {
      const flag = byKey.get(item.key);
      return !flag || (flag.index && flag.inSitemap);
    })
    .map(({ path, lastModified, key }) => {
      const date = lastModified ?? byKey.get(key)?.updatedAt;
      return date ? { path, lastModified: date } : { path };
    });
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
  /** Karat (24, 21) or 999 for silver; the purity and the making charge per gram, as on the page. */
  karat?: number;
  purity?: string;
  makingPerGramPiastres?: number;
  seller?: string;
  /** The day the price is valid until (today, Cairo time), YYYY-MM-DD. */
  priceValidUntil?: string;
}) {
  const silver = p.karat === 999;
  const props = [
    ...(p.karat && !silver ? [{ "@type": "PropertyValue", name: "karat", value: String(p.karat) }] : []),
    ...(p.purity ? [{ "@type": "PropertyValue", name: "purity", value: p.purity }] : []),
    ...(p.makingPerGramPiastres !== undefined
      ? [{ "@type": "PropertyValue", name: "making charge per gram", value: (p.makingPerGramPiastres / 100).toFixed(2), unitText: "EGP" }]
      : []),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    ...(p.images.length ? { image: p.images } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.karat ? { material: silver ? "Silver" : "Gold" } : {}),
    weight: { "@type": "QuantitativeValue", value: p.weightGrams, unitCode: "GRM" },
    ...(props.length ? { additionalProperty: props } : {}),
    offers: {
      "@type": "Offer",
      url: p.url,
      priceCurrency: "EGP",
      price: (p.pricePiastres / 100).toFixed(2),
      ...(p.priceValidUntil ? { priceValidUntil: p.priceValidUntil } : {}),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(p.seller ? { seller: { "@type": "Organization", name: p.seller } } : {}),
    },
  };
}
