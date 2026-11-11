"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { fmt } from "@/i18n";
import { buybackPiastres, cairoTime, karatLabel, pounds, poundsParts, productName, weightLabel, weightText } from "@/lib/format";
import { KINDS, type Kind, pieceKind } from "@/lib/kinds";
import { useLivePrices } from "@/lib/live-prices";
import { useLiveProducts } from "@/lib/live-products";
import type { Prices, Product } from "@/lib/types";
import { FaqList } from "./home-client";
import { useI18n } from "./Providers";
import { AddButton } from "./ShopGrid";
import { Select } from "./controls";

const weightsOf = (products: Product[], kind: Kind) =>
  [...new Set(products.filter((p) => pieceKind(p) === kind).map((p) => p.weightGrams))].sort((a, b) => a - b);

const allWeights = (products: Product[]) => [...new Set(products.map((p) => p.weightGrams))].sort((a, b) => a - b);

/**
 * The compare page's tool: a kind and a weight, then that piece from every brand with its live
 * price and buy-back, and what to know about it. The choice is kept in the address to be shared.
 * The making-charges page shows the table alone (`details` off), offers worn pieces too, and with
 * `showAll` starts on every kind and weight, grouped, with "All" in both lists.
 */
export function CompareTool({
  products: rendered,
  prices: initialPrices,
  kind: askedKind,
  weight: askedWeight,
  offered = KINDS,
  allKinds = false,
  details = true,
  showAll = false,
}: {
  products: Product[];
  prices: Prices | null;
  kind?: Kind;
  weight?: number;
  /** The kinds the first list offers, in its order; a kind with no pieces is left out unless `allKinds`. */
  offered?: readonly Kind[];
  /** Offer every kind of `offered` even with no pieces: the table then says there are none. */
  allKinds?: boolean;
  /** Whether the "about" and questions section follows the table. */
  details?: boolean;
  /** Start on every kind and weight, grouped, with an "All" option in both filters (making charges). */
  showAll?: boolean;
}) {
  const { locale, t, href } = useI18n();
  const products = useLiveProducts(rendered);
  const { prices } = useLivePrices({ prices: initialPrices });

  const kinds = allKinds ? offered : offered.filter((k) => rendered.some((p) => pieceKind(p) === k));
  const startKind = askedKind && kinds.includes(askedKind) ? askedKind : kinds[0];
  const startWeights = weightsOf(rendered, startKind);
  // No weight only for a kind with no pieces (allKinds), or for "all kinds" on the making-charges page.
  const [choice, setChoice] = useState<{ kind: Kind | undefined; weight: number | undefined }>(() => {
    if (!showAll) {
      return {
        kind: startKind,
        weight: askedWeight !== undefined && startWeights.includes(askedWeight) ? askedWeight : startWeights[0],
      };
    }
    const kind = askedKind && kinds.includes(askedKind) ? askedKind : undefined;
    const weights = kind ? weightsOf(rendered, kind) : allWeights(rendered);
    return { kind, weight: askedWeight !== undefined && weights.includes(askedWeight) ? askedWeight : undefined };
  });
  const weights = choice.kind ? weightsOf(rendered, choice.kind) : allWeights(rendered);

  const pick = (kind: Kind | undefined, weight: number | undefined) => {
    setChoice({ kind, weight });
    // Next.js keeps its router in step with the native history calls.
    const params = new URLSearchParams();
    if (kind !== undefined) params.set("c", kind);
    if (weight !== undefined) params.set("w", String(weight));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  const rows = products
    .filter((p) => (choice.kind === undefined || pieceKind(p) === choice.kind) && (choice.weight === undefined || p.weightGrams === choice.weight))
    .sort((a, b) => a.pricePiastres - b.pricePiastres);
  const brand = (p: Product) => (locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || productName(p, locale);
  const egp = (piastres: number) => (
    <>
      {pounds(piastres)} <small>{t.product.egp}</small>
    </>
  );
  // The cashback columns: the number set in the dashboard (Cashback policies), with the
  // packaging or without, exactly as it shows there; 0 when the product offers none.
  const perGram = (p: Product, packaging: "with" | "without") => {
    const piastres = p.cashback ? (packaging === "with" ? p.cashback.withPackagingPiastres : p.cashback.withoutPackagingPiastres) : 0;
    return piastres % 100 ? poundsParts(piastres).full : pounds(piastres);
  };

  // Buy-back, live, for the questions below the table: today's metal sell value for the piece +
  // its cashback per gram × weight, each to the piastre as the sell page adds them; null with no
  // price board.
  type Packaging = "with" | "without";
  const buyback = (p: Product, packaging: Packaging): number | null => buybackPiastres(p, prices, packaging);

  const pieceName = (kind: Kind, weight: number) => {
    const template = kind === "silver" ? t.compare.nameSilver : kind === "pounds" ? t.compare.namePound : kind === "wear" ? t.compare.nameWear : t.compare.nameBar;
    return fmt(template, { w: weightText(weight) });
  };
  const name = choice.kind === undefined ? t.compare.all : choice.weight === undefined ? t.compare.kinds[choice.kind] : pieceName(choice.kind, choice.weight);
  const cheapest = rows[0];
  const dearest = rows[rows.length - 1];
  const time = prices ? cairoTime(prices.updatedAt) : "";
  const many = rows.length > 1;
  // The full making-charges table is read in groups: a heading per kind and weight, then its brands.
  const groups: { kind: Kind; weight: number; rows: Product[] }[] = [];
  if (showAll) {
    for (const p of rows) {
      const kind = pieceKind(p);
      let group = groups.find((g) => g.kind === kind && g.weight === p.weightGrams);
      if (!group) {
        group = { kind, weight: p.weightGrams, rows: [] };
        groups.push(group);
      }
      group.rows.push(p);
    }
    groups.sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.weight - b.weight);
  }

  let info: { about: string; faq: { q: string; a: string }[] } | null = null;
  if (cheapest) {
    const purity =
      choice.kind === "silver"
        ? "999"
        : cheapest.karat === 24 && choice.kind !== "pounds"
          ? "999.9"
          : karatLabel(cheapest.karat, t);
    const range = { min: pounds(cheapest.pricePiastres), max: pounds(dearest.pricePiastres), n: rows.length };
    const lowLabor = rows.reduce((low, p) => (p.laborPiastres < low.laborPiastres ? p : low), cheapest);
    const highLabor = Math.max(...rows.map((p) => p.laborPiastres));
    const sellWith = buyback(cheapest, "with");
    const sellWithout = buyback(cheapest, "without");
    info = {
      about: fmt(t.compare.aboutText, {
        name,
        purity,
        metal: choice.kind === "silver" ? t.compare.silver : t.compare.gold,
        brands: many ? fmt(t.compare.aboutMany, range) : fmt(t.compare.aboutOne, { brand: brand(cheapest), price: range.min }),
      }),
      faq: [
        {
          q: fmt(t.compare.faqPrice, { name }),
          a: many ? fmt(t.compare.faqPriceManyA, { ...range, time }) : fmt(t.compare.faqPriceOneA, { brand: brand(cheapest), price: range.min, time }),
        },
        {
          q: fmt(t.compare.faqCheapest, { name }),
          a: many
            ? fmt(t.compare.faqCheapestManyA, { brand: brand(cheapest), price: range.min, diff: pounds(dearest.pricePiastres - cheapest.pricePiastres) })
            : fmt(t.compare.faqCheapestOneA, { brand: brand(cheapest), name, price: range.min }),
        },
        {
          q: fmt(t.compare.faqMaking, { name }),
          a:
            many && highLabor !== lowLabor.laborPiastres
              ? fmt(t.compare.faqMakingManyA, { min: pounds(lowLabor.laborPiastres), max: pounds(highLabor), brand: brand(lowLabor) })
              : fmt(t.compare.faqMakingOneA, { making: pounds(lowLabor.laborPiastres), brand: brand(lowLabor) }),
        },
        {
          q: fmt(t.compare.faqSell, { name }),
          a: sellWith !== null && sellWithout !== null
            ? fmt(t.compare.faqSellA, {
                brand: brand(cheapest),
                with: pounds(sellWith),
                without: pounds(sellWithout),
              })
            : t.compare.faqSellNone,
        },
      ],
    };
  }

  const renderRow = (p: Product, index: number, size: number) => (
    <tr key={p.id} data-product={p.id}>
      <th scope="row">
        {brand(p)}
        {index === 0 && size > 1 ? <em className="pdp-tag">{t.compare.best}</em> : null}
      </th>
      <td className="cmp-price">{egp(p.pricePiastres)}</td>
      <td className="cmp-with">{perGram(p, "with")}</td>
      <td className="cmp-without">{perGram(p, "without")}</td>
      <td className="cmp-add">
        <AddButton productId={p.id} inStock={p.inStock !== false} stock={p.stock} />
      </td>
    </tr>
  );

  return (
    <>
      <div className="cmp-pick">
        <div className="f">
          <span id="cmp-kind-label">{t.compare.kind}</span>
          {showAll ? (
            <Select
              value={choice.kind ?? "all"}
              onChange={(kind) => (kind === "all" ? pick(undefined, undefined) : pick(kind, undefined))}
              aria-labelledby="cmp-kind-label"
              options={[["all", t.compare.all] as const, ...kinds.map((k) => [k, t.compare.kinds[k]] as const)]}
            />
          ) : (
            <Select
              value={choice.kind ?? startKind}
              onChange={(kind) => pick(kind, weightsOf(rendered, kind)[0])}
              aria-labelledby="cmp-kind-label"
              options={kinds.map((k) => [k, t.compare.kinds[k]] as const)}
            />
          )}
        </div>
        <div className="f">
          <span id="cmp-weight-label">{t.compare.weight}</span>
          {showAll ? (
            <Select
              value={choice.weight === undefined ? "all" : String(choice.weight)}
              onChange={(weight) => pick(choice.kind, weight === "all" ? undefined : Number(weight))}
              aria-labelledby="cmp-weight-label"
              options={[["all", t.compare.all] as const, ...weights.map((w) => [String(w), weightLabel(w, t)] as const)]}
            />
          ) : (
            <Select
              value={choice.weight === undefined ? "none" : String(choice.weight)}
              onChange={(weight) => (weight === "none" ? undefined : pick(choice.kind, Number(weight)))}
              aria-labelledby="cmp-weight-label"
              options={weights.length ? weights.map((w) => [String(w), weightLabel(w, t)] as const) : [["none", "—"] as const]}
            />
          )}
        </div>
      </div>

      <div className="pdp-table-wrap">
        <table className="pdp-table cmp-table">
          <caption className="vh">{name}</caption>
          <thead>
            <tr>
              <th scope="col">{t.compare.brand}</th>
              <th scope="col">{t.compare.price}</th>
              <th scope="col">{t.compare.withPackaging}</th>
              <th scope="col">{t.compare.withoutPackaging}</th>
              <td>
                <span className="vh">{t.compare.add}</span>
              </td>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="cmp-none">
                  {t.compare.noneOfKind}
                </td>
              </tr>
            ) : null}
            {showAll
              ? groups.map((group) => (
                  <Fragment key={`${group.kind}-${group.weight}`}>
                    <tr className="cmp-group">
                      <th scope="colgroup" colSpan={5}>
                        {pieceName(group.kind, group.weight)}
                      </th>
                    </tr>
                    {group.rows.map((p, index) => renderRow(p, index, group.rows.length))}
                  </Fragment>
                ))
              : rows.map((p, index) => renderRow(p, index, rows.length))}
          </tbody>
        </table>
      </div>
      <p className="cmp-note">{t.compare.note}</p>

      {details && info && cheapest ? (
        <div className="pr-read cmp-info">
          <section aria-labelledby="cmp-about">
            <h2 id="cmp-about">{fmt(t.compare.about, { name })}</h2>
            <p>{info.about}</p>
            {time ? <p className="cmp-about-note">{fmt(t.compare.aboutNote, { time })}</p> : null}
            <Link className="pdp-view cmp-more" href={href(`/shop/${cheapest.slug}`)}>
              {fmt(t.compare.aboutLink, { brand: brand(cheapest), name })}
            </Link>
          </section>
          <section aria-labelledby="cmp-faq">
            <h2 id="cmp-faq">{fmt(t.compare.faqTitle, { name })}</h2>
            <FaqList key={`${choice.kind}-${choice.weight}`} items={info.faq} id="cmp-faq-list" />
          </section>
        </div>
      ) : null}
    </>
  );
}
