import { describe, expect, it } from "vitest";
import { zakatOf } from "./zakat";

const prices = {
  karats: [
    { karat: 24 as const, buyPiastres: 700000, sellPiastres: 680000, changePct: 0 },
    { karat: 21 as const, buyPiastres: 612500, sellPiastres: 595000, changePct: 0 },
    { karat: 18 as const, buyPiastres: 525000, sellPiastres: 510000, changePct: 0 },
  ],
  silver: { buyPiastres: 9000, spreadPiastres: 500, sellPiastres: 8500 },
};

describe("zakat", () => {
  it("values gold and silver at the sell price and sets the nisab from 97 g of 21K and 595 g of silver", () => {
    const z = zakatOf(prices, { gold: { 24: 1, 21: 2, 18: 0.5 }, silverGrams: 10, cashPiastres: 100 });
    expect(z.goldPiastres).toBe(680000 + 2 * 595000 + 255000);
    expect(z.silverPiastres).toBe(85000);
    expect(z.nisabGoldPiastres).toBe(97 * 595000);
    expect(z.nisabSilverPiastres).toBe(595 * 8500);
  });

  it("is nothing below the gold nisab, and flags a total that reaches only the silver one", () => {
    const z = zakatOf(prices, { gold: {}, silverGrams: 0, cashPiastres: 10_000_000 });
    expect(z.due).toBe(false);
    expect(z.silverOnly).toBe(true);
    expect(z.zakatPiastres).toBe(0);
    expect(zakatOf(prices, { gold: {}, silverGrams: 0, cashPiastres: 0 }).silverOnly).toBe(false);
  });

  it("is 2.5% of the whole total from the gold nisab up", () => {
    const z = zakatOf(prices, { gold: { 21: 97 }, silverGrams: 0, cashPiastres: 0 });
    expect(z.due).toBe(true);
    expect(z.zakatPiastres).toBe(Math.round(97 * 595000 * 0.025));
    const more = zakatOf(prices, { gold: { 24: 100 }, silverGrams: 0, cashPiastres: 1_000_000 });
    expect(more.zakatPiastres).toBe(Math.round((68_000_000 + 1_000_000) * 0.025));
  });
});
