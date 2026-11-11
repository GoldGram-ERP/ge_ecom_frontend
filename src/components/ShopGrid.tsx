"use client";

import Image from "next/image";
import { localePath } from "@/i18n";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/i18n";
import { cart, qtyLimit, qtyOf, useCart } from "@/lib/cart";
import { useLiveProducts } from "@/lib/live-products";
import { filterPath } from "@/lib/shop-links";
import { artClass, artStyle, pounds, productName, productSub } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { useI18n } from "./Providers";
import { Button, Reveal } from "./controls";

type Filter = "all" | Category;

export function AddButton({ productId, inStock, stock }: { productId: number; inStock: boolean; stock?: number | null }) {
  const { t } = useI18n();
  const inCart = qtyOf(useCart(), productId);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (!inStock) {
    return (
      <Button className="pc-buy" type="button" disabled>
        {t.shop.outOfStock}
      </Button>
    );
  }
  // Every piece in stock is already in the cart: nothing more can be ordered.
  if (inCart >= qtyLimit(stock) && !added) {
    return (
      <Button className="pc-buy" type="button" disabled>
        {t.shop.allInCart}
      </Button>
    );
  }
  return (
    <Button
      className={`pc-buy${added ? " added" : ""}`}
      type="button"
      // Off while "Added" shows, so a double click does not add a second piece.
      disabled={added}
      onClick={() => {
        if (timer.current) return; // a second click before the button has turned off
        cart.add(productId, stock);
        setAdded(true);
        timer.current = setTimeout(() => {
          timer.current = null;
          setAdded(false);
        }, 1200);
      }}
    >
      {/* aria-live so the confirmation is announced, not only shown */}
      <span aria-live="polite">{added ? t.shop.added : t.shop.add}</span>
    </Button>
  );
}

/**
 * The shop's filters and pieces. With `heading` (the menu's category pages) the grid also draws
 * the page heading, which follows the chosen filter: the page's own name for the filter it opened
 * on, a category's name for another, and "Shop" for all; its link goes to the whole shop.
 */
export function ShopGrid({
  products: rendered,
  initial,
  heading,
  intro,
  before,
}: {
  products: Product[];
  initial: Filter;
  heading?: { name: string; allHref: string };
  /** Server-rendered blocks under the heading: the page's intro text, then (the bars hub) its weight tiles. */
  intro?: React.ReactNode;
  before?: React.ReactNode;
}) {
  const { locale, t } = useI18n();
  const products = useLiveProducts(rendered);
  const [filter, setFilter] = useState<Filter>(initial);

  // One filter per category that has pieces, named and ordered as the dashboard sets them.
  const filters: { id: Filter; label: string }[] = [{ id: "all", label: t.shop.all }];
  for (const p of products) {
    if (!filters.some((f) => f.id === p.category)) {
      filters.push({ id: p.category, label: locale === "ar" ? p.categoryNameAr : p.categoryNameEn });
    }
  }

  // The drawn object grows with its position inside its own category, whatever the filter.
  const rank = new Map<number, number>();
  const seen: Record<string, number> = {};
  for (const p of products) {
    rank.set(p.id, seen[p.category] ?? 0);
    seen[p.category] = (seen[p.category] ?? 0) + 1;
  }

  const shown = filter === "all" ? products : products.filter((p) => p.category === filter);
  const title =
    filter === initial ? heading?.name : filter === "all" ? t.nav.shop : filters.find((f) => f.id === filter)?.label;
  // The browser tab's title follows another filter's name; the page's own filter keeps its SEO title.
  const ownTitle = useRef<string | null>(null);
  useEffect(() => {
    if (!heading) return;
    ownTitle.current ??= document.title;
    document.title = filter === initial || !title ? ownTitle.current : `${title} · GoldGram`;
  }, [heading, title, filter, initial]);

  return (
    <>
      {heading ? (
        <div className="shop-preset">
          <h1>{title}</h1>
          <Link href={heading.allHref}>{t.shop.all}</Link>
        </div>
      ) : null}
      {intro}
      {before}
      <div className="filters" role="group" aria-label={t.shop.filterLabel}>
        {filters.map((f) => (
          <Button
            key={f.id}
            className={`fp${filter === f.id ? " on" : ""}`}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              // On a menu category page the address follows the filter (its clean URL), so a
              // copied or reloaded link opens on it. Next.js keeps its router in step.
              if (heading) window.history.replaceState(null, "", localePath(locale, filterPath(f.id)));
            }}
          >
            {f.label}
          </Button>
        ))}
        <span className="fcount" aria-live="polite">
          {fmt(shown.length === 1 ? t.shop.piece : t.shop.pieces, { n: shown.length })}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="buy-empty">{t.shop.empty}</p>
      ) : (
        <div className="grid-buy">
          {shown.map((p, index) => {
            // The staff's own photo when the product has one; the drawn piece otherwise.
            const photo = p.imageIds?.[0];
            const description = locale === "ar" ? p.descriptionAr : p.descriptionEn;
            return (
            <Reveal as="article" className="pcard" key={p.id} delay={Math.min(index, 5) * 40}>
                {/* The picture, name and description open the piece's own page; the button stays outside the link. */}
                <Link className="pc-link" href={localePath(locale, `/shop/${p.slug}`)}>
                  {photo ? (
                    <div className="pc-frame">
                      {/* The name follows as text, so the picture adds nothing for a screen reader. Served as stored: it is small already. */}
                      <Image unoptimized className="pc-photo" src={`/api/products/${p.id}/images/${photo}`} alt="" width={328} height={328} loading="lazy" />
                    </div>
                  ) : (
                    <div className="niche">
                      <div className="stand" />
                      <div className="obj">
                        <div className={artClass(p.category)} style={artStyle(p.category, rank.get(p.id) ?? 0)} />
                      </div>
                    </div>
                  )}
                  <div className="pc-name">{productName(p, locale)}</div>
                  <div className="pc-sub">{productSub(p, t)}</div>
                  {description ? <p className="pc-desc">{description}</p> : null}
                </Link>
                <div className="pc-price">
                  {pounds(p.pricePiastres)}
                  <u>{t.product.egp}</u>
                </div>
                <AddButton productId={p.id} inStock={p.inStock !== false} stock={p.stock} />
              </Reveal>
            );
          })}
        </div>
      )}
    </>
  );
}
