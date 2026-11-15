import { describe, expect, it } from "vitest";
import { appQrUrl, brandComparison, contactFormError, footerColumns, goldForms, headerMenu, homeSections, mapEmbedUrl, menuHref, popularProducts } from "./home-rules";
import type { Product } from "./types";

let nextId = 1;
const product = (over: Partial<Product>): Product =>
  ({ id: nextId++, category: "bar", weightGrams: 1, karat: 24, featured: false, inStock: true, pricePiastres: 100_000, manufacturerId: 1, manufacturerEn: "BTC", manufacturerAr: "بي تي سي", ...over }) as Product;

const FULL = { prices: true, weights: 13, products: 17, popular: 8, compared: 4, articles: 3 };

describe("home page sections (PG-01)", () => {
  it("shows every section in the required order when the shop has all the data", () => {
    expect(homeSections(FULL)).toEqual([
      "hero",
      "prices",
      "weights",
      "forms",
      "popular",
      "why",
      "brands",
      "compare",
      "how",
      "proofs",
      "app",
      "faq",
      "about",
      "contact",
      "articles",
      "promise",
      "record",
    ]);
  });

  it("leaves out the brand comparison until two brands share a weight, and keeps the rest in order", () => {
    const shown = homeSections({ ...FULL, compared: 0 });
    expect(shown).not.toContain("compare");
    expect(shown.slice(5, 9)).toEqual(["why", "brands", "how", "proofs"]);
  });

  it("hides each block that has no data, and never the fixed ones", () => {
    const shown = homeSections({ prices: false, weights: 0, products: 0, popular: 0, compared: 0, articles: 0 });
    expect(shown).toEqual(["hero", "forms", "why", "how", "proofs", "app", "faq", "about", "contact", "promise", "record"]);
  });
});

describe("popular products", () => {
  it("shows eight at most, in stock first, featured first within each, in the catalogue's order", () => {
    const list = [
      product({ id: 1, inStock: false, featured: true }),
      product({ id: 2 }),
      product({ id: 3, featured: true }),
      product({ id: 4, inStock: false }),
      product({ id: 5 }),
      product({ id: 6, featured: true }),
      product({ id: 7 }),
      product({ id: 8 }),
      product({ id: 9 }),
      product({ id: 10 }),
    ];
    expect(popularProducts(list).map((p) => p.id)).toEqual([3, 6, 2, 5, 7, 8, 9, 10]);
    expect(popularProducts(list.slice(0, 4)).map((p) => p.id)).toEqual([3, 2, 1, 4]);
    expect(popularProducts([])).toEqual([]);
  });
});

describe("one gram, three forms", () => {
  it("shows bars to wear only when the shop has one, under either of the category's slugs", () => {
    expect(goldForms([product({}), product({ category: "coin" })])).toEqual(["bars", "coins"]);
    expect(goldForms([product({ category: "wear" })])).toEqual(["bars", "coins", "wearable"]);
    expect(goldForms([product({ category: "pendants" })])).toEqual(["bars", "coins", "wearable"]);
    expect(goldForms([])).toEqual(["bars", "coins"]);
  });
});

describe("same weight, different brands", () => {
  const weights = [1, 5, 10].map((grams) => ({ slug: `${grams}-gram`, grams, label: { ar: `${grams} جرام`, en: `${grams} g` } }));
  const emc = { manufacturerId: 2, manufacturerEn: "EMC", manufacturerAr: "إي إم سي" };

  it("is not shown with one brand, or when no two brands sell the same weight", () => {
    expect(brandComparison([product({}), product({ weightGrams: 5 })], weights, "en")).toBeNull();
    expect(brandComparison([product({}), product({ weightGrams: 5, ...emc })], weights, "en")).toBeNull();
    expect(brandComparison([], weights, "en")).toBeNull();
  });

  it("lists only the shared weights, each brand's lowest price, and a dash where a brand has none", () => {
    const sam = { manufacturerId: 3, manufacturerEn: "Sam", manufacturerAr: "سام" };
    const table = brandComparison(
      [
        product({ pricePiastres: 620_000 }),
        product({ pricePiastres: 610_000 }),
        product({ pricePiastres: 630_000, ...emc }),
        product({ weightGrams: 5, pricePiastres: 3_000_000 }),
        product({ weightGrams: 10, pricePiastres: 6_100_000, ...emc }),
        product({ weightGrams: 10, pricePiastres: 6_000_000, ...sam }),
      ],
      weights,
      "en",
    );
    expect(table).toEqual({
      brands: [
        { id: 1, name: "BTC" },
        { id: 2, name: "EMC" },
        { id: 3, name: "Sam" },
      ],
      rows: [
        { slug: "1-gram", label: "1 g", prices: [610_000, 630_000, null] },
        { slug: "10-gram", label: "10 g", prices: [null, 6_100_000, 6_000_000] },
      ],
    });
    expect(brandComparison([product({}), product(emc)], weights, "ar")?.brands.map((b) => b.name)).toEqual(["بي تي سي", "إي إم سي"]);
  });
});

describe("app page QR code (PG-14)", () => {
  it("opens the app page in the visitor's language, tagged as coming from the code", () => {
    expect(appQrUrl("ar")).toBe("https://goldgram.eg/app?utm_source=qr&utm_medium=website&utm_campaign=app");
    expect(appQrUrl("en")).toBe("https://goldgram.eg/en/app?utm_source=qr&utm_medium=website&utm_campaign=app");
  });
});

describe("contact page (PG-15)", () => {
  it("embeds the map only for real coordinates", () => {
    expect(mapEmbedUrl("30.0131", "31.4285")).toBe("https://www.google.com/maps?q=30.0131,31.4285&z=15&output=embed");
    expect(mapEmbedUrl("", "")).toBeNull();
    expect(mapEmbedUrl("30.01", "")).toBeNull();
    expect(mapEmbedUrl("91", "31")).toBeNull();
    expect(mapEmbedUrl("30", "181")).toBeNull();
    expect(mapEmbedUrl('30"><script>', "31")).toBeNull();
    expect(mapEmbedUrl("30&q=evil", "31")).toBeNull();
  });

  it("asks for a name, an email or a mobile, and a message before sending", () => {
    const ok = { name: "Mona", contact: "mona@example.com", message: "When are you open?" };
    expect(contactFormError(ok)).toBeNull();
    expect(contactFormError({ ...ok, contact: "0101 234 5678" })).toBeNull();
    expect(contactFormError({ ...ok, name: " M " })).toBe("name");
    expect(contactFormError({ ...ok, contact: "mona" })).toBe("contact");
    expect(contactFormError({ ...ok, contact: "12345" })).toBe("contact");
    expect(contactFormError({ ...ok, message: "Hi" })).toBe("message");
  });
});

describe("the dashboard's home arrangement (PG-01)", () => {
  it("follows the saved order with the hero first, and adds sections the save does not name", () => {
    const shown = homeSections(FULL, { order: ["faq", "hero", "popular", "nope", "faq"], hidden: [], popularIds: [] });
    expect(shown.slice(0, 4)).toEqual(["hero", "faq", "popular", "prices"]);
    expect(shown).toHaveLength(17);
    expect(new Set(shown).size).toBe(17);
  });

  it("leaves out a hidden section, but never the hero, and still hides a block with no data", () => {
    const shown = homeSections({ ...FULL, compared: 0 }, { order: [], hidden: ["hero", "record", "why"], popularIds: [] });
    expect(shown[0]).toBe("hero");
    for (const gone of ["record", "why", "compare"]) expect(shown).not.toContain(gone);
  });

  it("is the built-in page when nothing is saved", () => {
    expect(homeSections(FULL, null)).toEqual(homeSections(FULL));
    expect(homeSections(FULL, { order: [], hidden: [], popularIds: [] })).toEqual(homeSections(FULL));
  });

  it("shows the picked products in the picked order, skipping one that left the shop", () => {
    const list = [product({ id: 501 }), product({ id: 502, inStock: false }), product({ id: 503, featured: true })];
    expect(popularProducts(list, [502, 999, 501]).map((p) => p.id)).toEqual([502, 501]);
    // No pick left in the shop: the built-in rule (in stock and featured first).
    expect(popularProducts(list, [999]).map((p) => p.id)).toEqual([503, 501, 502]);
    expect(popularProducts(list, []).map((p) => p.id)).toEqual([503, 501, 502]);
  });
});

describe("the dashboard's menus (NAV-03)", () => {
  const link = (ar: string, en: string, path: string, external = false) => ({ label: { ar, en }, path, external });
  const layout = {
    menus: {
      header: [
        { ...link("الرئيسية", "Home", "/"), children: [] },
        { ...link("المتجر", "Shop", ""), children: [link("سبائك", "Bars", "/gold-bars"), link("واتساب", "WhatsApp", "https://wa.me/2010", true)] },
      ],
      footer: [{ title: { ar: "الشركة", en: "Company" }, links: [link("من نحن", "About", "/about")] }],
    },
  };

  it("gives a site path its language and leaves any other address alone", () => {
    expect(menuHref({ path: "/gold-bars", external: false }, "ar")).toBe("/gold-bars");
    expect(menuHref({ path: "/gold-bars", external: false }, "en")).toBe("/en/gold-bars");
    expect(menuHref({ path: "/", external: false }, "en")).toBe("/en");
    expect(menuHref({ path: "https://wa.me/2010", external: true }, "en")).toBe("https://wa.me/2010");
    expect(menuHref({ path: "", external: false }, "en")).toBe("");
  });

  it("builds the header in the page's language", () => {
    expect(headerMenu(layout, "en")).toEqual([
      { label: "Home", href: "/en", external: false, children: [] },
      {
        label: "Shop",
        href: "",
        external: false,
        children: [
          { label: "Bars", href: "/en/gold-bars", external: false },
          { label: "WhatsApp", href: "https://wa.me/2010", external: true },
        ],
      },
    ]);
    expect(headerMenu(layout, "ar")[1].children[0]).toEqual({ label: "سبائك", href: "/gold-bars", external: false });
  });

  it("is empty while nothing is saved, so the built-in menu and footer show", () => {
    expect(headerMenu(null, "ar")).toEqual([]);
    expect(footerColumns(null, "ar")).toBeNull();
    expect(footerColumns({ menus: { footer: [] } }, "ar")).toBeNull();
    expect(footerColumns(layout, "ar")).toEqual([{ title: "الشركة", links: [{ label: "من نحن", href: "/about", external: false }] }]);
  });
});
