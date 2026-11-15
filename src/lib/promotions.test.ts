import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { samePage } from "./analytics";
import { isViewed, promotionEcommerce, promotionKey, readPromotion, selectPromotion, viewPromotion } from "./promotions";

const attrs = (o: Record<string, string>) => (name: string) => o[name] ?? null;
const hero = { "data-promotion-id": "eid-2027", "data-promotion-name": "Eid gold offer", "data-promotion-creative": "eid-hero-ar", "data-promotion-slot": "home_hero" };

let layer: unknown[];
beforeEach(() => {
  layer = [];
  vi.stubGlobal("window", { dataLayer: layer, location: { pathname: "/" } });
  samePage();
});
afterEach(() => vi.unstubAllGlobals());

describe("promotion payload", () => {
  it("reads the four fields and builds Google's ecommerce object", () => {
    const p = readPromotion(attrs(hero))!;
    expect(promotionEcommerce(p)).toStrictEqual({ promotion_id: "eid-2027", promotion_name: "Eid gold offer", creative_name: "eid-hero-ar", creative_slot: "home_hero" });
  });
  it("needs an id and a name; leaves out empty optional fields; clips to 100", () => {
    expect(readPromotion(attrs({ "data-promotion-id": "x" }))).toBeNull();
    expect(readPromotion(attrs({ "data-promotion-name": "x" }))).toBeNull();
    expect(promotionEcommerce(readPromotion(attrs({ "data-promotion-id": "x", "data-promotion-name": "n" }))!)).toStrictEqual({ promotion_id: "x", promotion_name: "n" });
    expect(readPromotion(attrs({ ...hero, "data-promotion-name": "n".repeat(150) }))!.name).toHaveLength(100);
  });
  it("carries items only when valid JSON array", () => {
    const item = { item_id: "1" };
    expect(promotionEcommerce(readPromotion(attrs({ ...hero, "data-promotion-items": JSON.stringify([item]) }))!).items).toStrictEqual([item]);
    expect(promotionEcommerce(readPromotion(attrs({ ...hero, "data-promotion-items": "{bad" }))!)).not.toHaveProperty("items");
  });
});

describe("visibility", () => {
  const rect = (height: number) => ({ height });
  it("is viewed at half visible, not before", () => {
    expect(isViewed({ isIntersecting: true, intersectionRatio: 0.5, intersectionRect: rect(50), rootBounds: { height: 800 } })).toBe(true);
    expect(isViewed({ isIntersecting: true, intersectionRatio: 0.49, intersectionRect: rect(49), rootBounds: { height: 800 } })).toBe(false);
    expect(isViewed({ isIntersecting: false, intersectionRatio: 0, intersectionRect: rect(0), rootBounds: { height: 800 } })).toBe(false);
  });
  it("counts a banner taller than the screen once it fills half of it", () => {
    expect(isViewed({ isIntersecting: true, intersectionRatio: 0.2, intersectionRect: rect(400), rootBounds: { height: 800 } })).toBe(true);
  });
});

describe("pushes", () => {
  const p = readPromotion(attrs(hero))!;
  it("view_promotion fires once per promotion per page view, cleared first with an event_id", () => {
    viewPromotion(p);
    viewPromotion(p);
    viewPromotion(p);
    expect(layer).toHaveLength(2);
    expect(layer[0]).toStrictEqual({ ecommerce: null });
    expect(layer[1]).toMatchObject({ event: "view_promotion", event_id: expect.stringMatching(/^[0-9a-f-]{36}$/), ecommerce: { promotion_id: "eid-2027" } });
    viewPromotion({ ...p, slot: "shop_top" });
    expect(layer).toHaveLength(4);
    expect(promotionKey(p)).not.toBe(promotionKey({ ...p, slot: "shop_top" }));
  });
  it("select_promotion fires on every call (one per click)", () => {
    selectPromotion(p);
    selectPromotion(p);
    expect(layer.filter((x) => (x as { event?: string }).event === "select_promotion")).toHaveLength(2);
  });
});
