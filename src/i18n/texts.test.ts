import { describe, expect, it } from "vitest";
import { ar } from "./ar";
import { en } from "./en";
import { flatten, withOverrides } from "./texts";

describe("website texts", () => {
  it("flattens every string, arrays by index, and both languages have the same keys", () => {
    const flat = flatten(en);
    expect(flat["checkout.doneTitle"]).toBe("Your order is placed.");
    expect(flat["checkout.doneSteps.0"]).toBe(en.checkout.doneSteps[0]);
    expect(Object.keys(flatten(ar)).sort()).toEqual(Object.keys(flat).sort());
  });

  it("every key is one the backend accepts", () => {
    // the pattern of SetSiteTextDto in the backend
    const accepted = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+){0,5}$/;
    expect(Object.keys(flatten(en)).filter((key) => !accepted.test(key) || key.length > 120)).toEqual([]);
  });

  it("puts rewritten texts in place and leaves the original untouched", () => {
    const changed = withOverrides(en, { "checkout.doneTitle": "Thank you.", "checkout.doneSteps.1": "Pay." });
    expect(changed.checkout.doneTitle).toBe("Thank you.");
    expect(changed.checkout.doneSteps[1]).toBe("Pay.");
    expect(changed.checkout.doneSteps[0]).toBe(en.checkout.doneSteps[0]);
    expect(en.checkout.doneTitle).toBe("Your order is placed.");
  });

  it("ignores blanks, unknown keys and keys that are not a text", () => {
    const changed = withOverrides(en, { "nav.shop": "", "nav.nothing": "x", checkout: "x", "a.b.c": "x", "nav.cart": null });
    expect(changed).toEqual(en);
  });
});
