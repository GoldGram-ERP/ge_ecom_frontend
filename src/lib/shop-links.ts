import type { Dict } from "@/i18n";
import { WEARABLE } from "./types";

/** Not a catalogue slug: the silver page's marker. /silver is the metal, not a category. */
export const SILVER = "@silver";

/**
 * Clean, SEO-friendly URLs (the URL map, TEC-05) mapped to the catalogue's own category slugs, so
 * the shop's filters and data stay unchanged: /en/gold-bars renders the "bar" category. A page may
 * answer to several slugs: /gold-bars is every bar, small ones ("ingot") merged in, and the wearable
 * category was renamed. /silver is the metal, not a category: every 999 piece, whatever its category.
 */
export const CATEGORY_URLS: Record<string, readonly string[]> = {
  "gold-bars": ["bar", "ingot"],
  "gold-coins": ["coin"],
  "gold-bar-pendants": WEARABLE,
  silver: [SILVER],
};

/**
 * The shop's kinds, each at its own clean URL (the URL map), in menu order. The header's Shop
 * menu and the footer's Shop column both list these, so their names and links stay the same.
 */
export const SHOP_LINKS: readonly { label: keyof Dict["nav"]; path: string }[] = [
  { label: "bars", path: "/gold-bars" },
  { label: "coins", path: "/gold-coins" },
  { label: "wearable", path: "/gold-bar-pendants" },
  { label: "silver", path: "/silver" },
];

/**
 * The address (without its language) of a shop filter: a category's clean URL, /silver for the
 * category silver pieces are in, /shop for all, and /shop?c= for a category with no page of its own.
 */
export function filterPath(filter: string): string {
  if (filter === "all") return "/shop";
  const url = Object.keys(CATEGORY_URLS).find((u) => CATEGORY_URLS[u].includes(filter));
  if (url) return `/${url}`;
  if (filter === "silver") return "/silver";
  return `/shop?c=${encodeURIComponent(filter)}`;
}

/**
 * The catalogue with every bar under one category (the URL map merges small bars into /gold-bars):
 * an "ingot" takes the "bar" slug and name, so the shop shows one Bars filter, never two.
 */
export function mergeBars<T extends { category: string; categoryNameEn: string; categoryNameAr: string }>(products: T[]): T[] {
  const [main, ...merged] = CATEGORY_URLS["gold-bars"];
  const named = products.find((p) => p.category === main);
  return products.map((p) =>
    merged.includes(p.category)
      ? { ...p, category: main, categoryNameEn: named?.categoryNameEn ?? p.categoryNameEn, categoryNameAr: named?.categoryNameAr ?? p.categoryNameAr }
      : p,
  );
}

