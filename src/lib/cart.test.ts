import { describe, expect, it } from "vitest";
import { addLine, countItems, dropProducts, MAX_LINES, MAX_QTY, parseCart, removeOne } from "./cart";

describe("parseCart (EC-16)", () => {
  it("reads a stored cart", () => {
    expect(parseCart('[{"productId":3,"qty":2},{"productId":7,"qty":1}]')).toEqual([
      { productId: 3, qty: 2 },
      { productId: 7, qty: 1 },
    ]);
  });
  it("treats missing, corrupt or wrongly shaped data as an empty cart", () => {
    for (const raw of [null, "", "not json", "{}", '"x"', "42", "[1,2]", '[{"id":1}]']) {
      expect(parseCart(raw)).toEqual([]);
    }
  });
  it("drops bad lines and keeps the good ones", () => {
    const raw = JSON.stringify([
      { productId: 1, qty: 1 },
      { productId: -2, qty: 1 },
      { productId: 3, qty: 0 },
      { productId: 4, qty: 1.5 },
      { productId: "5", qty: 1 },
      { productId: 1, qty: 9 }, // duplicate id
      null,
      { productId: 6, qty: 500 },
    ]);
    expect(parseCart(raw)).toEqual([
      { productId: 1, qty: 1 },
      { productId: 6, qty: MAX_QTY },
    ]);
  });
  it("never returns more than the maximum number of lines", () => {
    const many = Array.from({ length: MAX_LINES + 20 }, (_, i) => ({ productId: i + 1, qty: 1 }));
    expect(parseCart(JSON.stringify(many))).toHaveLength(MAX_LINES);
  });
});

describe("cart operations", () => {
  it("adds a new line, then raises its quantity", () => {
    const once = addLine([], 5);
    expect(once).toEqual([{ productId: 5, qty: 1 }]);
    expect(addLine(once, 5)).toEqual([{ productId: 5, qty: 2 }]);
  });
  it("stops at the quantity and line limits", () => {
    expect(addLine([{ productId: 5, qty: MAX_QTY }], 5)).toEqual([{ productId: 5, qty: MAX_QTY }]);
    const full = Array.from({ length: MAX_LINES }, (_, i) => ({ productId: i + 1, qty: 1 }));
    expect(addLine(full, 999)).toHaveLength(MAX_LINES);
  });
  it("removes one at a time and drops the line at zero", () => {
    const two = [{ productId: 5, qty: 2 }, { productId: 8, qty: 1 }];
    expect(removeOne(two, 5)).toEqual([{ productId: 5, qty: 1 }, { productId: 8, qty: 1 }]);
    expect(removeOne(two, 8)).toEqual([{ productId: 5, qty: 2 }]);
    expect(removeOne(two, 404)).toEqual(two);
  });
  it("drops unavailable products and counts pieces", () => {
    const lines = [{ productId: 1, qty: 2 }, { productId: 2, qty: 3 }];
    expect(dropProducts(lines, [2, 9])).toEqual([{ productId: 1, qty: 2 }]);
    expect(countItems(lines)).toBe(5);
    expect(countItems([])).toBe(0);
  });
});
