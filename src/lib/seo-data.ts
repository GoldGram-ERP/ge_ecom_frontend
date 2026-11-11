import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDictionary, type Locale } from "@/i18n";
import { pounds, poundsParts } from "./format";
import { isSilver } from "./kinds";
import {
  DEFAULT_TEMPLATES,
  weightSlug,
  type Business,
  type L,
  type SeoEntry,
  type SeoSite,
  type SeoTemplates,
  type TemplateType,
} from "./seo";
import { site as builtIn } from "./site";
import { getLinks } from "./site-links";
import { isWearable, type Article, type Prices, type Product } from "./types";

// The SEO panel's data (GET /seo/*, /pages/:key, /catalog/weights), read through Next's data cache
// with the tags the backend revalidates (DSH-04). Every reader falls back when the endpoint is
// missing or down (404, network error), so the site never breaks while the backend catches up.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function cachedJson<T>(path: string, tags: string[], revalidate = 300): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate, tags },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}


const BRAND: L = { ar: "جولدجرام", en: "GoldGram" };

/** GET /seo/site, or null while the backend does not have it. */
export const getSeoSite = cache(() => cachedJson<SeoSite>("/seo/site", ["seo-site"]));

/**
 * The business details (DSH-10), one source for the footer, contact rows, app band and JSON-LD.
 * From the SEO settings when the backend has them (an empty value hides its block); otherwise the
 * built-in facts and the dashboard's older link settings, as before.
 */
export const getBusiness = cache(async (): Promise<Business> => {
  const seo = await getSeoSite();
  if (seo?.business) return { ...seo.business, siteName: pick(seo.business.siteName, BRAND) };
  const links = await getLinks();
  return {
    siteName: BRAND,
    legalName: BRAND,
    logoUrl: "",
    logoPngUrl: "",
    defaultOgImageUrl: "",
    hotline: builtIn.hotline,
    whatsapp: links.whatsappUrl ?? "",
    email: builtIn.email,
    // The branch and hours the prototypes show, until the dashboard holds them.
    address: { ar: getDictionary("ar").contact.branchValue, en: getDictionary("en").contact.branchValue },
    mapLat: "",
    mapLng: "",
    mapUrl: builtIn.mapUrl,
    openingHours: { ar: getDictionary("ar").contact.hoursValue, en: getDictionary("en").contact.hoursValue },
    commercialRegister: builtIn.commercialRegister,
    taxRegistration: builtIn.taxRegistration,
    hallmarking: builtIn.hallmarking,
    socialUrls: { instagram: links.instagramUrl ?? "", facebook: links.facebookUrl ?? "", tiktok: links.tiktokUrl ?? "", x: "", youtube: "", linkedin: "" },
    appStoreUrl: links.iosUrl ?? "",
    googlePlayUrl: links.androidUrl ?? "",
  };
});

const pick = (value: L | undefined, fallback: L): L => ({ ar: value?.ar || fallback.ar, en: value?.en || fallback.en });

/** The site name in a language ({site}), never empty. */
export const siteName = async (locale: Locale) => (await getBusiness()).siteName[locale];

/** The page-type templates (DSH-02): the dashboard's, over the built-in starting set. */
export const getTemplates = cache(async (): Promise<SeoTemplates> => {
  const saved = (await cachedJson<Partial<SeoTemplates>>("/seo/templates", ["seo-templates"])) ?? {};
  const merged = { ...DEFAULT_TEMPLATES };
  for (const type of Object.keys(DEFAULT_TEMPLATES) as TemplateType[]) {
    for (const locale of ["ar", "en"] as const) {
      const own = saved[type]?.[locale];
      merged[type] = { ...merged[type], [locale]: { title: own?.title || DEFAULT_TEMPLATES[type][locale].title, description: own?.description || DEFAULT_TEMPLATES[type][locale].description } };
    }
  }
  return merged;
});

/**
 * One page's SEO entry, or null (none saved: the template applies). A 404 is cached too, under the
 * entry's own tag, so pages without an entry do not ask the backend on every visit.
 */
export const getSeoEntry = cache(async (type: string, key: string): Promise<SeoEntry | null> => {
  try {
    return await unstable_cache(
      async () => {
        const response = await fetch(`${API_URL}/api/seo/entries/${type}/${encodeURIComponent(key)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`seo entry ${response.status}`); // not cached: asked again next time
        return (await response.json()) as SeoEntry;
      },
      ["seo-entry", type, key],
      { revalidate: 300, tags: [`seo:${type}:${key}`] },
    )();
  } catch {
    return null;
  }
});

/** Which entries of a type are noindex or out of the sitemap (IDX-02 filtering). */
export const getSeoEntryFlags = cache(
  async (type: string) =>
    (await cachedJson<{ type: string; key: string; index: boolean; inSitemap: boolean; updatedAt: string }[]>(`/seo/entries?type=${type}`, ["seo-entries"], 300)) ?? [],
);

/** An editable page body (about, contact, app, policies-*), already sanitized by the backend. */
export const getPage = cache((key: string) =>
  cachedJson<{ key: string; title: L; bodyHtml: L; updatedAt: string }>(`/pages/${key}`, [`page:${key}`]),
);

export interface Weight {
  slug: string;
  grams: number;
  label: L;
  productCount: number;
}

/** The bar weights on sale (PG-04); null while the backend has no such list. */
export const getWeights = cache(() => cachedJson<Weight[]>("/catalog/weights", ["products"], 60));

/** A guide by its slug (PG-12). */
export const getArticleBySlug = cache((slug: string) =>
  cachedJson<Article>(`/articles/slug/${encodeURIComponent(slug)}`, ["articles", `guide:${slug}`]),
);

/**
 * The bar weights with products: the backend's list, else worked out from the catalogue the same
 * way (24K bars, ingots merged in), so weight pages work before the endpoint is deployed.
 */
export async function getWeightList(products: Product[]): Promise<Weight[]> {
  const listed = await getWeights();
  if (listed) return listed.filter((w) => w.productCount > 0).sort((a, b) => a.grams - b.grams);
  const counts = new Map<number, number>();
  for (const p of products) if (isBar(p)) counts.set(p.weightGrams, (counts.get(p.weightGrams) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => a[0] - b[0])
    .map(([grams, productCount]) => ({ slug: weightSlug(grams), grams, label: { ar: `${grams} جرام`, en: `${grams} g` }, productCount }));
}

/** A gold bar for the weight pages: bars and ingots, not coins, pendants or silver. */
export const isBar = (p: Product) => !isSilver(p) && !isWearable(p.category) && p.category !== "coin";

/** The template variables every page can use: today's 24K prices, the date and the year (Cairo). */
export function priceVars(prices: Prices | null, locale: Locale): Record<string, string> {
  const k24 = prices?.karats.find((k) => k.karat === 24);
  const now = new Date();
  return {
    price_buy: k24 ? poundsParts(k24.buyPiastres).full : "",
    price_sell: k24 ? poundsParts(k24.sellPiastres).full : "",
    date: new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "long", year: "numeric" }).format(now),
    year: new Intl.DateTimeFormat("en", { timeZone: "Africa/Cairo", year: "numeric" }).format(now),
    time: prices ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" }).format(new Date(prices.updatedAt)) : "",
  };
}

/** Today's Cairo date as YYYY-MM-DD (Offer priceValidUntil). */
export const cairoToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

/** A whole-pound amount for templates ({price_buy} of a product, {making_per_gram}). */
export const egp = (piastres: number) => pounds(piastres);
