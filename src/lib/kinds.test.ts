import { describe, expect, it } from "vitest";
import { isSmall, kindOf } from "./kinds";
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
});
