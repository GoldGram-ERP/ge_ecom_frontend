import type { ElementType, ReactNode } from "react";
import type { GaItem } from "@/lib/analytics";

/**
 * Wrap any banner, hero offer or campaign block in <Promotion> and Google Analytics tracks it,
 * with no other code: view_promotion once per page view when half of it has been on screen, and
 * select_promotion on each click inside it. The tracker (Analytics, in the layout) finds it by the
 * data attributes this writes, also when it is added to the page after the first render.
 *
 * Adding a banner:
 *   <Promotion id="eid-2027" name="Eid gold offer" creative="eid-hero-ar" slot="home_hero">
 *     <Link href="/shop">...</Link>
 *   </Promotion>
 *
 * - id: stable and unique per campaign (becomes promotion_id), e.g. "eid-2027".
 * - name: what the campaign is called in reports (promotion_name).
 * - creative: the artwork or wording variant (creative_name), so two designs can be compared.
 * - slot: where on the page it sits (creative_slot), e.g. "home_hero", "shop_top", "footer_band".
 * - items: only when the banner promotes specific products: GaItem objects from buildItem().
 * Keep personal data out of all of them. Server-safe: it renders a plain element and no script.
 */
export function Promotion({
  id,
  name,
  creative,
  slot,
  items,
  as: Tag = "div",
  className,
  children,
}: {
  id: string;
  name: string;
  creative: string;
  slot: string;
  items?: GaItem[];
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={className} data-promotion-id={id} data-promotion-name={name} data-promotion-creative={creative} data-promotion-slot={slot} data-promotion-items={items?.length ? JSON.stringify(items) : undefined}>
      {children}
    </Tag>
  );
}
