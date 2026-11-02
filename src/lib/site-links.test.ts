import { describe, expect, it } from "vitest";
import { socialHref } from "./site-links";

describe("socialHref", () => {
  it("adds https:// to an address typed without a scheme", () => {
    expect(socialHref("facebook.com/goldgram")).toBe("https://facebook.com/goldgram");
    expect(socialHref("www.instagram.com/x")).toBe("https://www.instagram.com/x");
    expect(socialHref("https://tiktok.com/@x")).toBe("https://tiktok.com/@x");
  });

  it("turns a bare WhatsApp number into wa.me", () => {
    expect(socialHref("01012345678", true)).toBe("https://wa.me/01012345678");
    expect(socialHref("+20 101 234 5678", true)).toBe("https://wa.me/201012345678");
    expect(socialHref("https://wa.me/201012345678", true)).toBe("https://wa.me/201012345678");
  });

  it("hides empty and unsafe values", () => {
    expect(socialHref("")).toBeUndefined();
    expect(socialHref("   ")).toBeUndefined();
    expect(socialHref("javascript:alert(1)")).toBeUndefined();
    expect(socialHref("data:text/html,x")).toBeUndefined();
    expect(socialHref("ftp://example.com/x")).toBeUndefined();
  });
});
