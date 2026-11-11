import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildItem,
  checkoutValue,
  cleanUrl,
  gaClientId,
  gaSessionId,
  itemsValue,
  orderAnalytics,
  pageOf,
  placeOrderOnce,
  totalGrams,
  trackEcommerce,
  trackEvent,
  type ItemSource,
  type OrderTracking,
} from "./analytics";

// The spec's example (section 6): Gold Era 10 g 24K bar, rate 7137.10, making 750 → 72121.
const bar10g: ItemSource = {
  id: 31,
  nameEn: "Gold Era 10 g gold bar 24K",
  brandEn: "Gold Era",
  category: "bar",
  weightGrams: 10,
  karat: 24,
  metalPiastres: 7_137_100,
  laborPiastres: 75_000,
  pricePiastres: 7_212_100,
  inStock: true,
};
const pound8g: ItemSource = {
  id: 16,
  nameEn: "Gold Era gold pound 21K 8 g King George",
  brandEn: "Gold Era",
  category: "coin",
  weightGrams: 8,
  karat: 21,
  metalPiastres: 4_996_000,
  laborPiastres: 57_600,
  pricePiastres: 5_053_600,
  inStock: true,
};

/** GTM's data layer model: each push merged over the last, an undefined value clearing its key. */
function modelAt(layer: unknown[], eventName: string): Record<string, unknown> {
  const model: Record<string, unknown> = {};
  for (const push of layer) {
    Object.assign(model, push as Record<string, unknown>);
    if ((push as { event?: string }).event === eventName) return { ...model };
  }
  throw new Error(`no ${eventName}`);
}

let layer: unknown[];
beforeEach(() => {
  layer = [];
  vi.stubGlobal("window", { dataLayer: layer });
});
afterEach(() => vi.unstubAllGlobals());

describe("buildItem (section 5)", () => {
  it("builds the spec's view_item example exactly", () => {
    expect(buildItem(bar10g, 1, { item_list_id: "category_gold_ingots", item_list_name: "Category: Small gold bars", index: 2 })).toStrictEqual({
      item_id: "31",
      item_name: "Gold Era 10 g gold bar 24K",
      item_brand: "Gold Era",
      item_category: "Gold",
      item_category2: "Bar",
      item_category3: "10 g",
      item_category4: "24K",
      item_list_id: "category_gold_ingots",
      item_list_name: "Category: Small gold bars",
      index: 2,
      price: 72121,
      quantity: 1,
      weight_grams: 10,
      karat: "24",
      fineness: "999.9",
      gold_rate: 7137.1,
      making_charge: 750,
      stock_status: "in_stock",
    });
  });

  it("builds the 21K coin of the place_order example, with no list keys when there is no list", () => {
    const item = buildItem(pound8g);
    expect(item).toMatchObject({ item_category2: "Coin", item_category3: "8 g", item_category4: "21K", karat: "21", fineness: "875", price: 50536, gold_rate: 6245, making_charge: 576 });
    expect("item_list_id" in item || "index" in item).toBe(false);
  });

  it("labels weights, silver, wearable bars and stock as the contract says", () => {
    expect(buildItem({ ...bar10g, weightGrams: 0.25 }).item_category3).toBe("0.25 g");
    expect(buildItem({ ...bar10g, weightGrams: 31.1035 })).toMatchObject({ item_category3: "1 oz (31.1 g)", weight_grams: 31.1 });
    expect(buildItem({ ...bar10g, weightGrams: 1000 }).item_category3).toBe("1 kg");
    expect(buildItem({ ...bar10g, karat: 999 })).toMatchObject({ item_category: "Silver", item_category4: "999 silver", karat: "999", fineness: "999" });
    expect(buildItem({ ...bar10g, category: "pendants" }).item_category2).toBe("Wearable bar");
    expect(buildItem({ ...bar10g, category: "wear" }).item_category2).toBe("Wearable bar");
    expect(buildItem({ ...bar10g, inStock: false }).stock_status).toBe("out_of_stock");
  });

  it("keeps money and grams numbers with at most 2 decimals (R4)", () => {
    const item = buildItem({ ...bar10g, weightGrams: 0.25, metalPiastres: 178_428, laborPiastres: 10_001, pricePiastres: 188_429 });
    expect(item.price).toBe(1884.29);
    expect(item.gold_rate).toBe(7137.12);
    expect(item.making_charge).toBe(100.01);
    for (const value of [item.price, item.gold_rate, item.making_charge, item.weight_grams]) expect(typeof value).toBe("number");
  });
});

describe("value math (R12)", () => {
  it("add_to_cart of 2 × the 10 g bar: value 144242, 20 g", () => {
    const items = [buildItem(bar10g, 2)];
    expect(itemsValue(items)).toBe(144242);
    expect(totalGrams(items)).toBe(20);
  });

  it("sums several lines and takes an order-level discount off the checkout value", () => {
    const items = [buildItem(bar10g), buildItem(pound8g)];
    expect(itemsValue(items)).toBe(122657);
    expect(totalGrams(items)).toBe(18);
    expect(checkoutValue(items, 25_000)).toBe(122407);
    expect(checkoutValue(items)).toBe(122657);
  });

  it("does not drift with floating point", () => {
    const items = [buildItem({ ...bar10g, pricePiastres: 10 }, 3), buildItem({ ...bar10g, pricePiastres: 20 }, 1)];
    expect(itemsValue(items)).toBe(0.5);
  });
});

describe("GA cookies (section 6 rule 4)", () => {
  it("reads the client id from _ga", () => {
    expect(gaClientId("_ga=GA1.1.1234567890.1794132000")).toBe("1234567890.1794132000");
    expect(gaClientId("theme=dark; _ga=GA1.2.987.654; other=1")).toBe("987.654");
    expect(gaClientId("_gat=1; x_ga=GA1.1.1.2")).toBeUndefined();
    expect(gaClientId("_ga=GA1.1.abc.def")).toBeUndefined();
    expect(gaClientId("")).toBeUndefined();
  });

  it("reads the session id from both _ga_<suffix> formats", () => {
    expect(gaSessionId("_ga=GA1.1.1.2; _ga_ABC123XYZ=GS1.1.1794391200.3.1.1794391300.0.0.0")).toBe("1794391200");
    expect(gaSessionId("_ga_ABC123XYZ=GS2.1.s1794391200$o3$g1$t1794391300$j60$l0$h0; _ga=GA1.1.1.2")).toBe("1794391200");
    expect(gaSessionId("_ga_ABC=GS2.1.sabc$o1")).toBeUndefined();
    expect(gaSessionId("_ga=GA1.1.1.2")).toBeUndefined();
  });

  it("builds the order's analytics field, leaving out what is missing or invalid", () => {
    const lists = (id: number) =>
      id === 31 ? { item_list_id: "category_gold_bars", item_list_name: "Category: Gold bars", index: 2 } : id === 16 ? { item_list_id: "Bad Id!", item_list_name: "x", index: 0 } : null;
    expect(orderAnalytics([31, 16, 7], "_ga=GA1.1.11.22; _ga_X1=GS1.1.33.1.1.1.0.0.0", lists)).toStrictEqual({
      gaClientId: "11.22",
      gaSessionId: "33",
      lines: [{ productId: 31, itemListId: "category_gold_bars", itemListName: "Category: Gold bars", index: 2 }],
    });
    expect(orderAnalytics([7], "", lists)).toBeUndefined();
  });
});

describe("pushes", () => {
  const tracking: OrderTracking = {
    transaction_id: "GG-2026-000512",
    currency: "EGP",
    value: 122867,
    shipping: 210,
    service_fee: 0,
    tax: 0,
    coupon: "",
    shipping_tier: "Insured delivery",
    payment_type: "InstaPay",
    customer_type: "new",
    total_grams: 18,
    items: [buildItem(bar10g), buildItem(pound8g)],
  };
  const storage = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it("clears the ecommerce object before every ecommerce push, with a UUID event_id (R2, R14)", () => {
    trackEcommerce("view_item", { currency: "EGP", value: 72121, items: [buildItem(bar10g)] });
    expect(layer[0]).toStrictEqual({ ecommerce: null });
    expect(layer[1]).toMatchObject({ event: "view_item", event_id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/) });
  });

  it("pushes place_order once per order, even after a reload of the page (rule 5)", async () => {
    const store = storage();
    expect(placeOrderOnce(tracking, store)).toBe(true);
    expect(placeOrderOnce(tracking, store)).toBe(false);
    // A reload: a fresh module (no memory), the same localStorage.
    vi.resetModules();
    const fresh = await import("./analytics");
    expect(fresh.placeOrderOnce(tracking, store)).toBe(false);
    const placed = layer.filter((p) => (p as { event?: string }).event === "place_order");
    expect(placed).toStrictEqual([{ event: "place_order", event_id: "place_order_GG-2026-000512", ecommerce: tracking }]);
  });

  it("still pushes place_order only once when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const other = { ...tracking, transaction_id: "GG-2026-000777" };
    expect(placeOrderOnce(other, blocked)).toBe(true);
    expect(placeOrderOnce(other, blocked)).toBe(false);
  });

  it("resets a supporting event's keys, so filter_value does not leak into contact_click; the page context stays", () => {
    layer.push({ event: "virtual_page_view", page_type: "shop", page_language: "ar", login_status: "logged_in", user_id: "84213" });
    trackEvent("filter_apply", { filter_type: "category", filter_value: "coin", item_list_id: "shop_all" });
    trackEvent("contact_click", { method: "phone", placement: "footer" });
    const model = modelAt(layer, "contact_click");
    expect(model.filter_value).toBeUndefined();
    expect(model.filter_type).toBeUndefined();
    expect(model.item_list_id).toBeUndefined();
    expect(model).toMatchObject({ method: "phone", placement: "footer", user_id: "84213", login_status: "logged_in", page_language: "ar", page_type: "shop" });
    // price_calculator_use carries page_type, which must stay set for later ecommerce events.
    trackEvent("price_calculator_use", { weight_grams: 10, karat: "24", page_type: "shop" });
    expect(layer.at(-1)).not.toHaveProperty("page_type");
  });
});

describe("page context (section 7)", () => {
  it("tells language and page type from the path", () => {
    expect(pageOf("/")).toEqual({ language: "ar", type: "home" });
    expect(pageOf("/en")).toEqual({ language: "en", type: "home" });
    expect(pageOf("/en/shop/gold-era-10g")).toEqual({ language: "en", type: "product" });
    expect(pageOf("/gold-bars/10-gram").type).toBe("weight");
    expect(pageOf("/gold-coins").type).toBe("category");
    expect(pageOf("/gold-price-today").type).toBe("gold_prices");
    expect(pageOf("/en/zakat-calculator").type).toBe("zakat");
    expect(pageOf("/policies/returns").type).toBe("legal");
    expect(pageOf("/no-such-page").type).toBe("not_found");
  });

  it("drops personal data and secrets from the page URL (R11)", () => {
    const url = cleanUrl("https://goldgram.eg/en/sign-up?email=a%40b.c&firstName=Ali&mobile=0100&next=checkout&utm_source=x");
    expect(url.href).toBe("https://goldgram.eg/en/sign-up?next=checkout&utm_source=x");
    expect(cleanUrl("https://goldgram.eg/reset-password?token=abc").search).toBe("");
  });
});
