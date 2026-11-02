"use client";

import Image from "next/image";
import { localePath } from "@/i18n";
import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { artClass, artStyle, pounds, productName, productSub } from "@/lib/format";
import { useLiveProducts } from "@/lib/live-products";
import type { Product } from "@/lib/types";
import { CarouselScroller } from "./carousel-scroller";
import { AddButton } from "./ShopGrid";

/** Horizontal scroll-snap row of the shop's product cards, priced from the live catalogue. */
export function StarterCarousel({ products: rendered, locale, t }: { products: Product[]; locale: Locale; t: Dict }) {
  const products = useLiveProducts(rendered);
  return (
    <CarouselScroller label={t.starter.title} locale={locale}>
      {products.map((p) => {
        const photo = p.imageIds?.[0];
        return (
          <article className="pcard" key={p.id}>
            <Link className="pc-link" href={localePath(locale, `/shop/${p.slug}`)}>
              {photo ? (
                <div className="pc-frame">
                  <Image unoptimized className="pc-photo" src={`/api/products/${p.id}/images/${photo}`} alt="" width={328} height={328} loading="lazy" />
                </div>
              ) : (
                <div className="niche">
                  <div className="stand" />
                  <div className="obj">
                    <div className={artClass(p.category)} style={artStyle(p.category, 0)} />
                  </div>
                </div>
              )}
              <div className="pc-name">{productName(p, locale)}</div>
              <div className="pc-sub">{productSub(p, t)}</div>
            </Link>
            <div className="pc-price">
              {pounds(p.pricePiastres)}
              <u>{t.product.egp}</u>
            </div>
            <AddButton productId={p.id} inStock={p.inStock !== false} stock={p.stock} />
          </article>
        );
      })}
    </CarouselScroller>
  );
}
