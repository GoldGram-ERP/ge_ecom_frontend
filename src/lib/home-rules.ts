import type { Locale } from "@/i18n";
import { SITE_URL } from "./seo";
import { isWearable, type Product } from "./types";

// The rules behind the home page (PG-01), the footer's weight links (NAV-03), the app page's QR
// code (PG-14) and the contact page's map (PG-15). Pure, so each is tested on its own.

/** The home page's sections, in the order they are shown (PG-01). */
export const HOME_ORDER = [
  "hero",
  "prices",
  "weights",
  "forms",
  "popular",
  "why",
  "brands",
  "compare",
  "how",
  "proofs",
  "app",
  "faq",
  "about",
  "contact",
  "articles",
  "promise",
  "record",
] as const;
export type HomeSection = (typeof HOME_ORDER)[number];

/** Which sections the home page shows for what the shop holds today: a block with no data is left out. */
export function homeSections(data: {
  prices: boolean;
  weights: number;
  products: number;
  popular: number;
  /** Rows of the brand comparison: weights that more than one brand sells. */
  compared: number;
  articles: number;
}): HomeSection[] {
  const hidden = new Set<HomeSection>();
  if (!data.prices) hidden.add("prices");
  if (!data.weights) hidden.add("weights");
  if (!data.products) hidden.add("brands");
  if (!data.popular) hidden.add("popular");
  if (!data.compared) hidden.add("compare");
  if (!data.articles) hidden.add("articles");
  return HOME_ORDER.filter((section) => !hidden.has(section));
}

/**
 * The popular products: eight, the ones in stock first, and among those the featured ones first.
 * Each group keeps the catalogue's own order.
 */
export function popularProducts(products: Product[]): Product[] {
  const rank = (p: Product) => (p.inStock === false ? 2 : 0) + (p.featured ? 0 : 1);
  return products
    .map((p, i) => [p, i] as const)
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
    .slice(0, 8)
    .map(([p]) => p);
}

/** The kinds of "one gram, three forms": bars to wear only once the shop has one. */
export function goldForms(products: Product[]): ("bars" | "coins" | "wearable")[] {
  return products.some((p) => isWearable(p.category)) ? ["bars", "coins", "wearable"] : ["bars", "coins"];
}

export interface BrandComparison {
  brands: { id: number; name: string }[];
  rows: { slug: string; label: string; prices: (number | null)[] }[];
}

/**
 * Same weight, different brands: one row per weight that at least two brands sell (lightest
 * first, six at most), one column per brand in those rows, each cell that brand's lowest price.
 * Null with a single brand, or when no weight is shared: there is nothing to compare.
 */
export function brandComparison(
  bars: Product[],
  weights: { slug: string; grams: number; label: Record<Locale, string> }[],
  locale: Locale,
): BrandComparison | null {
  const byWeight = weights
    .map((w) => {
      const lowest = new Map<number, number>();
      for (const p of bars) {
        if (p.weightGrams !== w.grams) continue;
        lowest.set(p.manufacturerId, Math.min(lowest.get(p.manufacturerId) ?? Infinity, p.pricePiastres));
      }
      return { w, lowest };
    })
    .filter((row) => row.lowest.size > 1)
    .slice(0, 6);
  if (!byWeight.length) return null;
  const brands: BrandComparison["brands"] = [];
  for (const p of bars) {
    if (brands.some((b) => b.id === p.manufacturerId) || !byWeight.some((row) => row.lowest.has(p.manufacturerId))) continue;
    brands.push({ id: p.manufacturerId, name: (locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || String(p.manufacturerId) });
  }
  return {
    brands,
    rows: byWeight.map(({ w, lowest }) => ({ slug: w.slug, label: w.label[locale], prices: brands.map((b) => lowest.get(b.id) ?? null) })),
  };
}

/**
 * What the app page's QR code holds: the app page itself, which shows both stores' badges, so
 * one code works on an iPhone and on Android. Tagged like the badges (SELL-04): the source is
 * the code, the campaign where it was shown.
 */
export function appQrUrl(locale: Locale): string {
  return `${SITE_URL}${locale === "en" ? "/en" : ""}/app?utm_source=qr&utm_medium=website&utm_campaign=app`;
}

/** The map to embed for the branch, or null unless both coordinates are real numbers on the globe. */
export function mapEmbedUrl(lat: string, lng: string): string | null {
  const numbers = [lat, lng].map((value) => (/^\s*-?\d{1,3}(\.\d+)?\s*$/.test(value) ? Number(value) : NaN));
  if (!(Math.abs(numbers[0]) <= 90) || !(Math.abs(numbers[1]) <= 180)) return null;
  return `https://www.google.com/maps?q=${numbers[0]},${numbers[1]}&z=15&output=embed`;
}

/** What a contact form holds before it is sent: null when it can go, else the field to fix. */
export function contactFormError(form: { name: string; contact: string; message: string }): "name" | "contact" | "message" | null {
  if (form.name.trim().length < 2) return "name";
  const contact = form.contact.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && contact.replace(/\D/g, "").length < 10) return "contact";
  if (form.message.trim().length < 10) return "message";
  return null;
}
