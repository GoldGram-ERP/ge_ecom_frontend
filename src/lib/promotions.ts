import { onPage, trackEcommerce, type GaItem } from "./analytics";

// view_promotion / select_promotion (GA4 spec, section 7, row 11). Any element carrying
// data-promotion-id is tracked; <Promotion> in components/Promotion.tsx writes those attributes.
// No banner is tracked by name here: adding one never needs code in this file.

export const PROMOTION_SELECTOR = "[data-promotion-id]";

export interface PromotionData {
  id: string;
  name: string;
  creative?: string;
  slot?: string;
  items?: GaItem[];
}

/** GA4 keeps 100 characters of an event parameter; this pushes what GA4 would store anyway. */
const clip = (s: string): string => s.trim().slice(0, 100);

/** Reads a promotion from an element's data-promotion-* attributes; null without an id and a name. */
export function readPromotion(get: (attribute: string) => string | null): PromotionData | null {
  const id = clip(get("data-promotion-id") ?? "");
  const name = clip(get("data-promotion-name") ?? "");
  if (!id || !name) return null;
  const creative = clip(get("data-promotion-creative") ?? "");
  const slot = clip(get("data-promotion-slot") ?? "");
  let items: GaItem[] | undefined;
  try {
    const parsed: unknown = JSON.parse(get("data-promotion-items") ?? "null");
    if (Array.isArray(parsed) && parsed.length) items = parsed as GaItem[];
  } catch {
    // not JSON: sent without items
  }
  return { id, name, ...(creative ? { creative } : {}), ...(slot ? { slot } : {}), ...(items ? { items } : {}) };
}

/** The ecommerce object of both events, in Google's recommended format. */
export const promotionEcommerce = (p: PromotionData): Record<string, unknown> => ({
  promotion_id: p.id,
  promotion_name: p.name,
  ...(p.creative ? { creative_name: p.creative } : {}),
  ...(p.slot ? { creative_slot: p.slot } : {}),
  ...(p.items ? { items: p.items } : {}),
});

/** One banner is one id in one slot with one creative; the same banner rendered twice counts once. */
export const promotionKey = (p: PromotionData): string => `promotion:${p.id}|${p.creative ?? ""}|${p.slot ?? ""}`;

/** At least half visible; or, for a banner taller than the screen, half the screen filled by it. */
export function isViewed(entry: { isIntersecting: boolean; intersectionRatio: number; intersectionRect: { height: number }; rootBounds: { height: number } | null }): boolean {
  if (!entry.isIntersecting) return false;
  return entry.intersectionRatio >= 0.5 || (entry.rootBounds !== null && entry.intersectionRect.height >= entry.rootBounds.height * 0.5);
}

/** view_promotion, once per promotion per page view, after the page's virtual_page_view (R7, R8). */
export function viewPromotion(p: PromotionData): void {
  onPage(`view_${promotionKey(p)}`, () => trackEcommerce("view_promotion", promotionEcommerce(p)));
}

/** select_promotion: one push per click. */
export const selectPromotion = (p: PromotionData): void => trackEcommerce("select_promotion", promotionEcommerce(p));
