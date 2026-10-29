import { describe, expect, it } from "vitest";
import { isKind, isSmall, kindOf, pieceKind } from "./kinds";
import { CATEGORY_URLS, filterPath } from "./shop-links";
import type { Karat } from "./types";

const piece = (category: string, karat: number, weightGrams: number) => ({ category, karat: karat as Karat, weightGrams });

describe("kinds", () => {
  it("splits gold bars at 50 g, whatever their category is called", () => {
    expect(kindOf(piece("bar", 24, 10))).toBe("small");
    expect(kindOf(piece("ingot", 24, 49.9))).toBe("small");
    expect(kindOf(piece("bar", 24, 50))).toBe("large");
    expect(kindOf(piece("bar", 24, 1000))).toBe("large");
    expect(isSmall(50)).toBe(false);
  });

  it("names silver by its 999 metal, pounds by the coin category, and leaves worn pieces out", () => {
    expect(kindOf(piece("bar", 999, 1000))).toBe("silver");
    expect(kindOf(piece("coin", 21, 8))).toBe("pounds");
    expect(kindOf(piece("wear", 24, 1))).toBeNull();
  });

  it("gives worn pieces a kind of their own for the making-charges page", () => {
    expect(pieceKind(piece("wear", 24, 1))).toBe("wear");
    expect(pieceKind(piece("bar", 24, 100))).toBe("large");
    expect(isKind("wear")).toBe(true);
  });

  it("knows the wearable category by its new slug too", () => {
    expect(kindOf(piece("pendants", 21, 2))).toBeNull();
    expect(pieceKind(piece("pendants", 21, 2))).toBe("wear");
  });
});

describe("shop addresses", () => {
  it("send a filter to its own page, the wearable one by either slug", () => {
    expect(filterPath("all")).toBe("/shop");
    expect(filterPath("coin")).toBe("/gold-coins");
    expect(filterPath("wear")).toBe("/pendants");
    expect(filterPath("pendants")).toBe("/pendants");
    expect(filterPath("silver")).toBe("/silver");
    expect(filterPath("gift sets")).toBe("/shop?c=gift%20sets");
    expect(CATEGORY_URLS.pendants).toEqual(["wear", "pendants"]);
  });
});
