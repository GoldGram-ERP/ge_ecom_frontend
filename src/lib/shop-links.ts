import type { Dict } from "@/i18n";
import { WEARABLE } from "./types";

/** Not a catalogue slug: the silver page's marker. /silver is the metal, not a category. */
export const SILVER = "@silver";

/**
 * Clean, SEO-friendly URLs (the URL Map) mapped to the catalogue's own category slugs, so the
 * shop's filters and data stay unchanged: /en/gold-bars renders the "bar" category. A page may
 * answer to several slugs (the wearable one was renamed). /silver is the metal, not a category:
 * every 999 piece, whatever its category (the old /shop?m=silver).
 */
export const CATEGORY_URLS: Record<string, readonly string[]> = {
  "gold-bars": ["bar"],
  "gold-coins": ["coin"],
  "gold-ingots": ["ingot"],
  pendants: WEARABLE,
  silver: [SILVER],
};

/** Old addresses of these pages, kept working: each answers with a permanent redirect. */
export const MOVED_URLS: Record<string, string> = {
  "gold-bar-pendants": "pendants",
};

/**
 * The shop's kinds, each at its own clean URL (the URL Map), in menu order. The header's Shop
 * menu and the footer's Shop column both list these, so their names and links stay the same.
 */
export const SHOP_LINKS: readonly { label: keyof Dict["nav"]; path: string }[] = [
  { label: "ingots", path: "/gold-ingots" },
  { label: "coins", path: "/gold-coins" },
  { label: "wearable", path: "/pendants" },
  { label: "bars", path: "/gold-bars" },
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
