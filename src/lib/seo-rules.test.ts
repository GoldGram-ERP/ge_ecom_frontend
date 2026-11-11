import { describe, expect, it } from "vitest";
import { buybackPiastres } from "./format";
import {
  DEFAULT_TEMPLATES,
  applyRedirect,
  canonicalQuery,
  customJsonLd,
  faqPageJsonLd,
  filterSitemap,
  itemListJsonLd,
  jewelryStoreJsonLd,
  mobileAppJsonLd,
  organizationJsonLd,
  pageMetadata,
  pageNumber,
  resolveTemplate,
  robotsTxt,
  seoTexts,
  trimAtWord,
  webPageJsonLd,
  weightSlug,
  type Business,
  type PageSeoInput,
  type RedirectRule,
  type SeoEntry,
} from "./seo";
import { storeHref } from "./site-links";

const L = (ar: string, en: string) => ({ ar, en });
const entry = (over: Partial<SeoEntry> = {}): SeoEntry => ({
  type: "product",
  key: "k",
  title: L("", ""),
  description: L("", ""),
  h1: L("", ""),
  canonical: "",
  index: true,
  follow: true,
  inSitemap: true,
  ogTitle: L("", ""),
  ogDescription: L("", ""),
  ogImageUrl: "",
  breadcrumbLabel: L("", ""),
  introHtml: L("", ""),
  faq: [],
  headCode: "",
  focusKeyword: "",
  updatedAt: "2026-11-11T10:00:00Z",
  ...over,
});
const input = (over: Partial<PageSeoInput> = {}): PageSeoInput => ({
  locale: "en",
  path: "/shop/gold-era-10g",
  type: "product",
  vars: { name: "Gold Era 10 g gold bar, 24K", price_buy: "71,640", making_per_gram: "265" },
  entry: null,
  templates: DEFAULT_TEMPLATES,
  siteName: "GoldGram",
  ...over,
});

describe("templates (DSH-02)", () => {
  it("fills the variables from the page's own values", () => {
    expect(resolveTemplate("{name} price today | {site}", { name: "10 g bar", site: "GoldGram" })).toBe("10 g bar price today | GoldGram");
  });

  it("an empty variable leaves no stray separator or double space", () => {
    expect(resolveTemplate("{name} | {site}", { name: "", site: "GoldGram" })).toBe("GoldGram");
    expect(resolveTemplate("From {price} EGP , today", { price: "" })).toBe("From EGP, today");
  });

  it("values with line breaks become one line", () => {
    expect(resolveTemplate("{name}", { name: "Gold\nbar\r\n 10 g" })).toBe("Gold bar 10 g");
  });

  it("trims at a word boundary, never mid-word, and drops a dangling separator", () => {
    const text = "Gold Era 10 gram gold bar | GoldGram shop";
    const cut = trimAtWord(text, 28);
    expect(cut).toBe("Gold Era 10 gram gold bar");
    expect(text.startsWith(cut)).toBe(true);
    expect(trimAtWord("short", 10)).toBe("short");
    expect(trimAtWord("سبيكة ذهب ١٠ جرام جولد إيرا عيار ٢٤", 20)).toBe("سبيكة ذهب ١٠ جرام");
  });

  it("the entry's own title wins, then the page type's template; never the home title", () => {
    const own = seoTexts(input({ entry: entry({ title: L("", "My own title") }) }));
    expect(own.title).toBe("My own title");
    const tpl = seoTexts(input());
    expect(tpl.title).toBe("Gold Era 10 g gold bar, 24K price today | GoldGram");
    expect(tpl.description).toContain("EGP 71,640");
    expect(tpl.description).toContain("EGP 265 per gram");
    expect(tpl.title).not.toBe(seoTexts(input({ type: "home", path: "/" })).title);
  });

  it("titles and descriptions stay within their lengths, cut cleanly", () => {
    const long = seoTexts(input({ vars: { name: "A very long product name that goes on and on and on and keeps going forever and ever" } }));
    expect(long.title.length).toBeLessThanOrEqual(70);
    expect(long.title).not.toMatch(/\s$/);
    expect(long.description.length).toBeLessThanOrEqual(160);
  });

  it("paginated listings carry the page number in the title (IDX-07)", () => {
    expect(seoTexts(input({ type: "guides", path: "/guides", query: "page=2" })).title).toMatch(/ - Page 2$/);
    expect(seoTexts(input({ locale: "ar", type: "guides", path: "/guides", query: "page=3" })).title).toMatch(/ - صفحة 3$/);
  });
});

describe("canonical, robots and hreflang (TEC-04, IDX-03..07)", () => {
  it("tracking parameters never reach the canonical", () => {
    expect(canonicalQuery("?utm_source=fb&utm_medium=cpc&fbclid=1&gclid=2")).toBe("");
    const meta = pageMetadata(input({ query: canonicalQuery("?utm_campaign=x&gclid=y") }));
    expect(meta.alternates?.canonical).toBe("https://goldgram.eg/en/shop/gold-era-10g");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("?page=2 is indexable and canonical to itself; page=1 is the page itself", () => {
    expect(canonicalQuery("?page=1&utm_source=x")).toBe("");
    expect(pageNumber("page=2")).toBe(2);
    expect(pageNumber("page=abc")).toBe(1);
    const meta = pageMetadata(input({ path: "/guides", type: "guides", query: "page=2" }));
    expect(meta.alternates?.canonical).toBe("https://goldgram.eg/en/guides?page=2");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("a filter or sort is noindex, follow with a self canonical, never a canonical elsewhere", () => {
    const meta = pageMetadata(input({ path: "/shop", type: "static", query: canonicalQuery("?c=coin&utm_source=x"), entry: entry({ canonical: "https://goldgram.eg/gold-coins" }) }));
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe("https://goldgram.eg/en/shop?c=coin");
    expect(meta.alternates).not.toHaveProperty("languages");
  });

  it("the entry's noindex, follow and canonical override apply", () => {
    const meta = pageMetadata(input({ entry: entry({ index: false, follow: false, canonical: "https://goldgram.eg/en/other" }) }));
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe("https://goldgram.eg/en/other");
    expect(meta.alternates).not.toHaveProperty("languages");
  });

  it("indexable pages list ar-EG, en and x-default on the Arabic URL; an empty listing is noindex", () => {
    const meta = pageMetadata(input({ locale: "ar" }));
    expect(meta.alternates?.languages).toEqual({
      "ar-EG": "https://goldgram.eg/shop/gold-era-10g",
      en: "https://goldgram.eg/en/shop/gold-era-10g",
      "x-default": "https://goldgram.eg/shop/gold-era-10g",
    });
    expect(pageMetadata(input({ noindex: true })).robots).toEqual({ index: false, follow: true });
  });

  it("Open Graph repeats the SEO texts unless the entry has its own, with og:url = canonical", () => {
    const meta = pageMetadata(input({ image: "https://goldgram.eg/x.jpg" }));
    const og = meta.openGraph as { title: string; url: string; locale: string; images: { url: string }[] };
    expect(og.title).toBe(seoTexts(input()).title);
    expect(og.url).toBe(meta.alternates?.canonical);
    expect(og.locale).toBe("en_US");
    expect(og.images[0].url).toBe("https://goldgram.eg/x.jpg");
    const own = pageMetadata(input({ entry: entry({ ogTitle: L("", "Share me") }) })).openGraph as { title: string };
    expect(own.title).toBe("Share me");
  });
});

describe("redirect rules (DSH-12, IDX-06)", () => {
  const rules: RedirectRule[] = [
    { from: "/old-bar", to: "/shop/new-bar", type: 301 },
    { from: "/a", to: "/b", type: 301 },
    { from: "/b", to: "/c", type: 301 },
    { from: "/gone", to: "", type: 410 },
    { from: "/loop-1", to: "/loop-2", type: 301 },
    { from: "/loop-2", to: "/loop-1", type: 301 },
    { from: "/en/own", to: "/en/elsewhere", type: 302 },
    { from: "/own", to: "/other", type: 301 },
  ];

  it("answers 301 to the target and keeps the query", () => {
    expect(applyRedirect(rules, "/old-bar", "?utm_source=x&page=2")).toEqual({ status: 301, location: "/shop/new-bar?utm_source=x&page=2" });
  });

  it("covers the /en twin of an Arabic rule, and a trailing slash", () => {
    expect(applyRedirect(rules, "/en/old-bar", "")).toEqual({ status: 301, location: "/en/shop/new-bar" });
    expect(applyRedirect(rules, "/old-bar/", "")).toEqual({ status: 301, location: "/shop/new-bar" });
  });

  it("an /en rule of its own wins over the Arabic one", () => {
    expect(applyRedirect(rules, "/en/own", "")).toEqual({ status: 302, location: "/en/elsewhere" });
  });

  it("follows a chain so the visitor takes one hop", () => {
    expect(applyRedirect(rules, "/a", "")).toEqual({ status: 301, location: "/c" });
  });

  it("410 for a page removed for good; a loop never redirects forever", () => {
    expect(applyRedirect(rules, "/gone", "")).toEqual({ status: 410 });
    expect(applyRedirect(rules, "/loop-1", "")).toBeNull();
    expect(applyRedirect(rules, "/no-rule", "")).toBeNull();
  });
});

describe("robots.txt (DSH-11)", () => {
  it("serves the saved text when it has a Sitemap line", () => {
    const saved = "User-agent: *\nDisallow: /api/\n\nSitemap: https://goldgram.eg/sitemap.xml";
    expect(robotsTxt(saved)).toBe(`${saved}\n`);
  });

  it("falls back to the default when empty, missing the Sitemap line, or blocking everything", () => {
    const fallback = robotsTxt();
    expect(robotsTxt("")).toBe(fallback);
    expect(robotsTxt("User-agent: *\nDisallow: /api/")).toBe(fallback);
    expect(robotsTxt("User-agent: *\nDisallow: /\nSitemap: https://goldgram.eg/sitemap.xml")).toBe(fallback);
  });
});

describe("sitemaps (IDX-02)", () => {
  it("leaves out noindex and out-of-sitemap entries, keeps the rest with their dates", () => {
    const items = [
      { key: "a", path: "/a", lastModified: "2026-11-01" },
      { key: "b", path: "/b" },
      { key: "c", path: "/c" },
      { key: "d", path: "/d" },
    ];
    const flags = [
      { key: "b", index: false, inSitemap: true },
      { key: "c", index: true, inSitemap: false },
      { key: "d", index: true, inSitemap: true, updatedAt: "2026-11-10" },
    ];
    expect(filterSitemap(items, flags)).toEqual([
      { path: "/a", lastModified: "2026-11-01" },
      { path: "/d", lastModified: "2026-11-10" },
    ]);
  });

  it("weight slugs follow the URL map", () => {
    expect([0.25, 0.5, 1, 2.5, 10, 31.1, 100, 1000].map(weightSlug)).toEqual([
      "quarter-gram",
      "half-gram",
      "1-gram",
      "2-5-gram",
      "10-gram",
      "1-ounce",
      "100-gram",
      "1-kilo",
    ]);
  });
});

const business = (over: Partial<Business> = {}): Business => ({
  siteName: L("جولدجرام", "GoldGram"),
  legalName: L("", ""),
  logoUrl: "",
  logoPngUrl: "",
  defaultOgImageUrl: "",
  hotline: "17937",
  whatsapp: "",
  email: "info@goldgram-eg.com",
  address: L("", ""),
  mapLat: "",
  mapLng: "",
  mapUrl: "",
  openingHours: L("", ""),
  commercialRegister: "",
  taxRegistration: "",
  hallmarking: "",
  socialUrls: { instagram: "https://instagram.com/goldgram", facebook: "", tiktok: "", x: "", youtube: "", linkedin: "" },
  appStoreUrl: "",
  googlePlayUrl: "",
  ...over,
});

describe("structured data (SCH-01, 04, 05, 06, 08, 09)", () => {
  it("Organization names both spellings, the hotline and only real profiles", () => {
    const org = organizationJsonLd(business(), "ar");
    expect(org.name).toBe("جولدجرام");
    expect(org.alternateName).toEqual(["GoldGram"]);
    expect(org.contactPoint?.[0].telephone).toBe("17937");
    expect(org.sameAs).toEqual(["https://instagram.com/goldgram"]);
  });

  it("JewelryStore only once the branch address is set", () => {
    expect(jewelryStoreJsonLd(business(), "en")).toBeNull();
    const store = jewelryStoreJsonLd(business({ address: L("القاهرة", "Cairo Business Plaza"), mapLat: "30.01", mapLng: "31.4" }), "en");
    expect(store).toMatchObject({ "@type": "JewelryStore", address: { streetAddress: "Cairo Business Plaza" }, geo: { latitude: 30.01, longitude: 31.4 }, telephone: "17937" });
  });

  it("MobileApplication only with a store URL, free, with no ratings", () => {
    expect(mobileAppJsonLd(business(), "en")).toBeNull();
    const app = mobileAppJsonLd(business({ googlePlayUrl: "https://play.google.com/store/apps/details?id=x" }), "en");
    expect(app).toMatchObject({ "@type": "MobileApplication", applicationCategory: "FinanceApplication", operatingSystem: "Android", offers: { price: "0" } });
    expect(app).not.toHaveProperty("aggregateRating");
  });

  it("FAQPage lists only the questions shown, and nothing when there are none", () => {
    expect(faqPageJsonLd([])).toBeNull();
    expect(faqPageJsonLd([{ q: " ", a: "x" }])).toBeNull();
    const faq = faqPageJsonLd([{ q: "Q?", a: "A." }]);
    expect(faq?.mainEntity).toEqual([{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } }]);
  });

  it("ItemList keeps the grid order with absolute URLs; WebPage carries the publish date", () => {
    const list = itemListJsonLd("ar", [{ name: "a", path: "/shop/a" }, { name: "b", path: "/shop/b" }]);
    expect(list.itemListElement.map((i) => [i.position, i.url])).toEqual([
      [1, "https://goldgram.eg/shop/a"],
      [2, "https://goldgram.eg/shop/b"],
    ]);
    expect(webPageJsonLd({ locale: "en", path: "/gold-price-today", name: "x", dateModified: "2026-11-11T08:42:00Z" }).dateModified).toBe("2026-11-11T08:42:00Z");
  });

  it("custom head code is accepted only as JSON-LD, re-escaped", () => {
    expect(customJsonLd("<script>alert(1)</script>")).toBeNull();
    expect(customJsonLd('{"@type":"Thing","name":"</script>"}')).not.toContain("<");
  });
});

describe("app links and buyback (SELL-02, SELL-04)", () => {
  it("store links carry where they were clicked", () => {
    expect(storeHref("https://apps.apple.com/eg/app/x/id1", "ios", "footer")).toBe("https://apps.apple.com/eg/app/x/id1?ct=website-footer");
    expect(new URL(storeHref("https://play.google.com/store/apps/details?id=x", "android", "home")).searchParams.get("referrer")).toBe(
      "utm_source=goldgram.eg&utm_medium=website&utm_campaign=home",
    );
  });

  it("buyback = sell price per gram × weight + cashback per gram × weight", () => {
    const prices = { karats: [{ karat: 24 as const, buyPiastres: 0, sellPiastres: 700000, changePct: 0 }], silver: { buyPiastres: 0, spreadPiastres: 0, sellPiastres: 9000 } };
    const bar = { karat: 24 as const, weightGrams: 10, cashback: { withPackagingPiastres: 2000, withoutPackagingPiastres: 500 } };
    expect(buybackPiastres(bar, prices)).toBe(7_000_000 + 20_000);
    expect(buybackPiastres(bar, prices, "without")).toBe(7_000_000 + 5_000);
    expect(buybackPiastres({ ...bar, cashback: null }, prices)).toBe(7_000_000);
    expect(buybackPiastres(bar, null)).toBeNull();
  });
});
