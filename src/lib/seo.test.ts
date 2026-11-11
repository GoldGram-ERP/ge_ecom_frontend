import { describe, expect, it } from "vitest";
import { absoluteUrl, alternatesFor, jsonLd, productJsonLd, robotsTxt, sitemapIndexXml, sitemapXml } from "./seo";

describe("seo", () => {
  it("builds absolute URLs: Arabic at the root, English under /en, no trailing slash", () => {
    expect(absoluteUrl("ar", "/")).toBe("https://goldgram.eg/");
    expect(absoluteUrl("en", "/")).toBe("https://goldgram.eg/en");
    expect(absoluteUrl("ar", "/shop")).toBe("https://goldgram.eg/shop");
    expect(absoluteUrl("en", "/shop/")).toBe("https://goldgram.eg/en/shop");
  });

  it("hreflang is ar-EG, en and x-default on the Arabic page", () => {
    const a = alternatesFor("en", "/shop");
    expect(a.canonical).toBe("https://goldgram.eg/en/shop");
    expect(a.languages).toEqual({
      "ar-EG": "https://goldgram.eg/shop",
      en: "https://goldgram.eg/en/shop",
      "x-default": "https://goldgram.eg/shop",
    });
  });

  it("noindex utility pages carry no hreflang", () => {
    for (const path of ["/sign-in", "/checkout", "/account/password", "/forgot-password"]) {
      expect(alternatesFor("ar", path)).not.toHaveProperty("languages");
    }
  });

  it("sitemap lists both languages with alternates and a real lastmod", () => {
    const xml = sitemapXml([{ path: "/shop/a&b", lastModified: "2026-11-11T10:00:00Z" }]);
    expect(xml).toContain("<loc>https://goldgram.eg/shop/a&amp;b</loc>");
    expect(xml).toContain("<loc>https://goldgram.eg/en/shop/a&amp;b</loc>");
    expect(xml).toContain("<lastmod>2026-11-11</lastmod>");
    expect(xml).toContain('hreflang="x-default" href="https://goldgram.eg/shop/a&amp;b"');
    expect(sitemapIndexXml(["pages"])).toContain("https://goldgram.eg/sitemaps/pages.xml");
  });

  it("robots.txt keeps the sitemap line and never blocks the whole site", () => {
    const txt = robotsTxt();
    expect(txt).toContain("Sitemap: https://goldgram.eg/sitemap.xml");
    expect(txt).not.toMatch(/Disallow:\s*\/\s*$/m);
  });

  it("JSON-LD cannot close the script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toContain("</script>");
  });

  it("Product offer follows price and stock", () => {
    const base = { name: "n", description: "", url: "u", images: [], brand: "", weightGrams: 10, pricePiastres: 123456, sku: "s" };
    expect(productJsonLd({ ...base, inStock: true }).offers).toMatchObject({ price: "1234.56", availability: "https://schema.org/InStock" });
    expect(productJsonLd({ ...base, inStock: false }).offers.availability).toBe("https://schema.org/OutOfStock");
  });
});
