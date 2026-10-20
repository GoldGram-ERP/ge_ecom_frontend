import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";
import {
  cairoDate, cairoTime, changeParts, durationText, pounds, poundsParts, productPurity, productShortName, productSub, shortWeight, weightLabel,
} from "./format";

const tEn = getDictionary("en");
const tAr = getDictionary("ar");

describe("money", () => {
  it("shows whole pounds with separators", () => {
    expect(pounds(172600)).toBe("1,726");
    expect(pounds(62402000)).toBe("624,020");
    expect(pounds(0)).toBe("0");
  });
  it("splits pounds and piastres for the price board", () => {
    expect(poundsParts(618420)).toEqual({ int: "6,184", dec: "20", full: "6,184.20" });
    expect(poundsParts(604100).full).toBe("6,041.00");
  });
});

describe("product text matches the prototypes", () => {
  it("writes weights the way the shop grid does", () => {
    expect(weightLabel(0.25, tEn)).toBe("¼ gram");
    expect(weightLabel(1, tEn)).toBe("1 gram");
    expect(weightLabel(2.5, tEn)).toBe("2.5 grams");
    expect(weightLabel(31.1035, tEn)).toBe("31.1 grams");
    expect(weightLabel(0.5, tAr)).toBe("½ جرام");
  });
  it("builds the line under the product name", () => {
    expect(productSub({ category: "bar", weightGrams: 0.25, karat: 24 }, tEn)).toBe("¼ gram · 999.9");
    expect(productSub({ category: "coin", weightGrams: 2, karat: 21 }, tEn)).toBe("2 grams · 21K");
    expect(productSub({ category: "wear", weightGrams: 1, karat: 24 }, tEn)).toBe("1 gram · mounted");
    expect(productSub({ category: "coin", weightGrams: 8, karat: 21 }, tAr)).toBe("8 جرام · عيار 21");
  });
  it("tells two weights of one piece apart in the cart and the receipt", () => {
    expect(shortWeight(0.25, tEn)).toBe("¼g");
    expect(shortWeight(5, tAr)).toBe("5 جرام");
    expect(productPurity({ category: "bar", weightGrams: 5, karat: 24 }, tEn)).toBe("999.9");
    expect(productPurity({ category: "wear", weightGrams: 1, karat: 24 }, tAr)).toBe("مجهّزة للارتداء");
  });
  it("dates an order in Cairo with Western digits", () => {
    expect(cairoDate("2026-10-11T22:30:00Z", "en")).toBe("12 Oct 2026");
    expect(cairoDate("2026-10-11T10:00:00Z", "ar")).toMatch(/^11 \D+ 2026$/);
  });
  it("builds the short name used on the account screen", () => {
    expect(productShortName({ category: "bar", weightGrams: 0.25, karat: 24 }, tEn)).toBe("Gold bar ¼g");
    expect(productShortName({ category: "wear", weightGrams: 1, karat: 24 }, tAr)).toBe("سبيكة معلّقة 1 جرام");
  });
});

describe("time and change", () => {
  it("formats the clock in Cairo", () => {
    expect(cairoTime("2026-01-15T12:32:00Z")).toBe("14:32"); // UTC+2 in winter
  });
  it("formats what is left of the session", () => {
    expect(durationText(368, tEn)).toBe("6h 8m");
    expect(durationText(45, tEn)).toBe("45m");
    expect(durationText(368, tAr)).toBe("6 س 8 د");
  });
  it("describes a rise, a fall and no change", () => {
    expect(changeParts(0.8)).toEqual({ arrow: "▲", value: "0.8%", down: false });
    expect(changeParts(-0.84)).toEqual({ arrow: "▼", value: "0.84%", down: true });
    expect(changeParts(0)).toEqual({ arrow: "•", value: "0%", down: false });
  });
});

describe("dictionaries", () => {
  // The type system checks the keys; this checks nothing was left blank in either language.
  const blanks = (value: unknown, path: string): string[] =>
    typeof value === "string"
      ? value.trim() ? [] : [path]
      : Object.entries(value as object).flatMap(([k, v]) => blanks(v, `${path}.${k}`));

  it("has no empty strings", () => {
    expect(blanks(en, "en")).toEqual([]);
    expect(blanks(ar, "ar")).toEqual([]);
  });
  it("keeps the same placeholders in both languages", () => {
    const holes = (value: unknown, path: string, out: Record<string, string>) => {
      if (typeof value === "string") out[path] = (value.match(/\{\w+\}/g) ?? []).sort().join(",");
      else for (const [k, v] of Object.entries(value as object)) holes(v, `${path}.${k}`, out);
      return out;
    };
    expect(holes(ar, "", {})).toEqual(holes(en, "", {}));
  });
});
