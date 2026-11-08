import { describe, expect, it } from "vitest";
import { boardNeedsProducts, nextPriceCache, withPrices, type PriceCache, type Priced } from "./live-products";

const piece = (id: number, pricePiastres: number): Priced => ({
  id,
  pricePiastres,
  metalPiastres: pricePiastres - 100,
  laborPiastres: 100,
  gramPiastres: 1000,
});

describe("live products", () => {
  it("fetches on the first board and whenever the board timestamp changes", () => {
    expect(boardNeedsProducts(null, "board-1")).toBe(true);
    expect(boardNeedsProducts("board-1", "board-1")).toBe(false);
    expect(boardNeedsProducts("board-1", "board-2")).toBe(true);
  });

  it("keeps the last prices when a refetch fails", () => {
    const first = nextPriceCache("board-1", [piece(1, 500), piece(2, 700)], null);
    expect(first?.at).toBe("board-1");
    const failed = nextPriceCache("board-2", null, first);
    expect(failed).toBe(first);
    expect(failed?.byId.get(1)?.pricePiastres).toBe(500);
  });

  it("applies cached prices by id and leaves the rest as rendered", () => {
    const initial = [piece(1, 500), piece(2, 700)];
    const cache: PriceCache = { at: "board-2", byId: new Map([[1, piece(1, 550)]]) };
    const next = withPrices(initial, cache);
    expect(next[0].pricePiastres).toBe(550);
    expect(next[1].pricePiastres).toBe(700);
  });
});
