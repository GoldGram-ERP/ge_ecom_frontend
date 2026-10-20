import { describe, expect, it } from "vitest";
import { isEmail, isPassword, normalizeNationalId, normalizePassport, normalizePhone, toLatinDigits } from "./validation";

const NOW = new Date("2026-10-07T12:00:00Z");

describe("toLatinDigits", () => {
  it("converts Arabic-Indic and Eastern Arabic-Indic digits", () => {
    expect(toLatinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toLatinDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(toLatinDigits("abc 42")).toBe("abc 42");
  });
});

describe("normalizePhone (EC-17)", () => {
  it("accepts the four Egyptian mobile prefixes", () => {
    for (const p of ["010", "011", "012", "015"]) expect(normalizePhone(`${p}12345678`)).toBe(`${p}12345678`);
  });
  it("normalises +20, 0020, spaces, dashes and Arabic digits", () => {
    expect(normalizePhone("+20 100 123 4567")).toBe("01001234567");
    expect(normalizePhone("0020-100-123-4567")).toBe("01001234567");
    expect(normalizePhone("٠١٠ ١٢٣٤ ٥٦٧٨")).toBe("01012345678");
  });
  it("rejects landlines, other prefixes and wrong lengths", () => {
    for (const bad of ["", "0223456789", "01312345678", "0101234567", "010123456789", "1001234567", "+44 7700 900123"]) {
      expect(normalizePhone(bad)).toBeNull();
    }
  });
});

describe("normalizeNationalId (EC-17)", () => {
  it("accepts a well-formed ID for either century", () => {
    expect(normalizeNationalId("29001010112345", NOW)).toBe("29001010112345"); // 1 Jan 1990, Cairo
    expect(normalizeNationalId("30503152112345", NOW)).toBe("30503152112345"); // 15 Mar 2005, Giza
  });
  it("accepts Arabic-Indic digits and stray spaces", () => {
    expect(normalizeNationalId("٢٩٠٠١٠١٠١١٢٣٤٥", NOW)).toBe("29001010112345");
    expect(normalizeNationalId(" 2900101 0112345 ", NOW)).toBe("29001010112345");
  });
  it("rejects a wrong length, century, date or governorate code", () => {
    expect(normalizeNationalId("2900101011234", NOW)).toBeNull(); // 13 digits
    expect(normalizeNationalId("290010101123456", NOW)).toBeNull(); // 15 digits
    expect(normalizeNationalId("19001010112345", NOW)).toBeNull(); // century digit 1
    expect(normalizeNationalId("29013010112345", NOW)).toBeNull(); // month 13
    expect(normalizeNationalId("29002300112345", NOW)).toBeNull(); // 30 February
    expect(normalizeNationalId("29001010512345", NOW)).toBeNull(); // governorate 05
    expect(normalizeNationalId("2900101011234x", NOW)).toBeNull();
  });
  it("rejects a date of birth in the future", () => {
    expect(normalizeNationalId("32701010112345", NOW)).toBeNull(); // 1 Jan 2027
  });
});

describe("isEmail and isPassword", () => {
  it("checks the address shape and length", () => {
    expect(isEmail("  you@example.com ")).toBe(true);
    for (const bad of ["", "you", "you@", "you@example", "a b@example.com", `${"a".repeat(250)}@x.co`]) {
      expect(isEmail(bad)).toBe(false);
    }
  });
  it("wants 8 to 128 characters", () => {
    expect(isPassword("1234567")).toBe(false);
    expect(isPassword("12345678")).toBe(true);
    expect(isPassword("x".repeat(129))).toBe(false);
  });
});

describe("normalizePassport", () => {
  it("takes 5 to 20 letters and digits, trimmed, and nothing else", () => {
    expect(normalizePassport(" A12345678 ")).toBe("A12345678");
    expect(normalizePassport("12345")).toBe("12345");
    for (const bad of ["", "A123", "A1 2345", "A12-345", "x".repeat(21), "٢٩٠٠١٠١"]) expect(normalizePassport(bad), bad).toBeNull();
  });
});
