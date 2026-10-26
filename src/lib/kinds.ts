import type { Product } from "./types";

// What kind of piece a product is, derived from what the dashboard already stores (no field of
// its own): silver is the 999 metal, pounds are the coin category, and every other gold piece
// that is not worn is a bar, small under 50 g (Proposed, docs/SPEC.md 3.9) and large from 50 g.
export const SMALL_GRAMS = 50;

type Kindable = Pick<Product, "category" | "karat" | "weightGrams">;

/** Silver is priced at 999, which the shop's karat type does not list. */
export const isSilver = (p: Pick<Product, "karat">): boolean => (p.karat as number) === 999;

export const isSmall = (grams: number): boolean => grams < SMALL_GRAMS;

/** The kinds the compare page offers, in the order of its list. */
export const KINDS = ["large", "small", "pounds", "silver"] as const;
export type Kind = (typeof KINDS)[number];

export const isKind = (value: unknown): value is Kind => (KINDS as readonly unknown[]).includes(value);

/** The kind of a piece; null for one worn as jewellery, which is compared with no bar. */
export function kindOf(p: Kindable): Kind | null {
  if (p.category === "wear") return null;
  if (isSilver(p)) return "silver";
  if (p.category === "coin") return "pounds";
  return isSmall(p.weightGrams) ? "small" : "large";
}
