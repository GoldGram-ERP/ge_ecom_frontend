import type { Karat, Prices } from "./types";

// The zakat rules the calculator applies, in one place so they can be changed.
// Nisab: 97 g of 21K gold, or 595 g of silver.
export const NISAB_GOLD_GRAMS = 97;
export const NISAB_GOLD_KARAT: Karat = 21;
export const NISAB_SILVER_GRAMS = 595;
/** Of the whole zakatable wealth, once it reaches the nisab. */
export const ZAKAT_PERCENT = 2.5;

export const ZAKAT_KARATS: readonly Karat[] = [24, 21, 18];

export interface Holdings {
  /** Grams of gold per karat. */
  gold: Partial<Record<Karat, number>>;
  silverGrams: number;
  cashPiastres: number;
}

export interface Zakat {
  goldPiastres: number;
  silverPiastres: number;
  cashPiastres: number;
  totalPiastres: number;
  nisabGoldPiastres: number;
  nisabSilverPiastres: number;
  /** The total reaches the gold nisab, the one applied. */
  due: boolean;
  /** Below the gold nisab but at or above the silver one. */
  silverOnly: boolean;
  zakatPiastres: number;
}

/**
 * Gold and silver are valued at the board's sell price: what GoldGram pays per gram when it buys
 * back, so what the metal would fetch today.
 */
export function zakatOf(prices: Pick<Prices, "karats" | "silver">, holdings: Holdings): Zakat {
  const perGram = (karat: Karat) => prices.karats.find((k) => k.karat === karat)?.sellPiastres ?? 0;
  const goldPiastres = ZAKAT_KARATS.reduce((sum, karat) => sum + Math.round((holdings.gold[karat] ?? 0) * perGram(karat)), 0);
  const silverPiastres = Math.round(holdings.silverGrams * prices.silver.sellPiastres);
  const cashPiastres = Math.round(holdings.cashPiastres);
  const totalPiastres = goldPiastres + silverPiastres + cashPiastres;
  const nisabGoldPiastres = Math.round(NISAB_GOLD_GRAMS * perGram(NISAB_GOLD_KARAT));
  const nisabSilverPiastres = Math.round(NISAB_SILVER_GRAMS * prices.silver.sellPiastres);
  const due = totalPiastres > 0 && totalPiastres >= nisabGoldPiastres;
  return {
    goldPiastres,
    silverPiastres,
    cashPiastres,
    totalPiastres,
    nisabGoldPiastres,
    nisabSilverPiastres,
    due,
    silverOnly: !due && totalPiastres > 0 && totalPiastres >= nisabSilverPiastres,
    zakatPiastres: due ? Math.round((totalPiastres * ZAKAT_PERCENT) / 100) : 0,
  };
}
