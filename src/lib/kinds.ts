import type { Product } from "./types";

// What kind of piece a product is, derived from what the dashboard already stores (no field of
// its own): silver is the 999 metal, pounds are the coin category, and every other gold piece
// that is not worn is a bar, small under 50 g (Proposed, docs/SPEC.md 3.9) and large from 50 g.
export const SMALL_GRAMS = 50;

type Kindable = Pick<Product, "category" | "karat" | "weightGrams">;

/** Silver is priced at 999, which the shop's karat type does not list. */
export const isSilver = (p: Pick<Product, "karat">): boolean => (p.karat as number) === 999;

export const isSmall = (grams: number): boolean => grams < SMALL_GRAMS;

/** Every kind, in the order of a list: the making-charges page offers them all. */
export const ALL_KINDS = ["large", "small", "pounds", "wear", "silver"] as const;
export type Kind = (typeof ALL_KINDS)[number];

/** The kinds the compare page offers: a piece worn as jewellery is compared with no bar. */
export const KINDS = ["large", "small", "pounds", "silver"] as const satisfies readonly Kind[];

export const isKind = (value: unknown): value is Kind => (ALL_KINDS as readonly unknown[]).includes(value);

/** The kind of a piece; null for one worn as jewellery, which the compare page leaves out. */
export function kindOf(p: Kindable): Exclude<Kind, "wear"> | null {
  if (p.category === "wear") return null;
  if (isSilver(p)) return "silver";
  if (p.category === "coin") return "pounds";
  return isSmall(p.weightGrams) ? "small" : "large";
}

/** The kind of any piece, a worn one included. */
export const pieceKind = (p: Kindable): Kind => kindOf(p) ?? "wear";
