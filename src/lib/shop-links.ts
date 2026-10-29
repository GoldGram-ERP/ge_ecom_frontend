import type { Dict } from "@/i18n";

/**
 * The shop's kinds, each at its own clean URL (the URL Map), in menu order. The header's Shop
 * menu and the footer's Shop column both list these, so their names and links stay the same.
 */
export const SHOP_LINKS: readonly { label: keyof Dict["nav"]; path: string }[] = [
  { label: "ingots", path: "/gold-ingots" },
  { label: "coins", path: "/gold-coins" },
  { label: "wearable", path: "/gold-bar-pendants" },
  { label: "bars", path: "/gold-bars" },
  { label: "silver", path: "/silver" },
];
