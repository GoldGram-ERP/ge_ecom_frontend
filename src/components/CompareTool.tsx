"use client";

import Link from "next/link";
import { useState } from "react";
import { fmt } from "@/i18n";
import { cairoTime, karatLabel, pounds, productName, weightLabel, weightText } from "@/lib/format";
import { KINDS, type Kind, kindOf } from "@/lib/kinds";
import { useLivePrices } from "@/lib/live-prices";
import { useLiveProducts } from "@/lib/live-products";
import type { Prices, Product } from "@/lib/types";
import { FaqList } from "./home-client";
import { useI18n } from "./Providers";
import { AddButton } from "./ShopGrid";
import { Select } from "./controls";

const weightsOf = (products: Product[], kind: Kind) =>
  [...new Set(products.filter((p) => kindOf(p) === kind).map((p) => p.weightGrams))].sort((a, b) => a - b);

/**
 * The compare page's tool: a kind and a weight, then that piece from every brand with its live
 * price and buy-back, and what to know about it. The choice is kept in the address to be shared.
 */
export function CompareTool({
  products: rendered,
  prices: initialPrices,
  kind: askedKind,
  weight: askedWeight,
}: {
  products: Product[];
  prices: Prices | null;
  kind?: Kind;
  weight?: number;
}) {
  const { locale, t, href } = useI18n();
  const products = useLiveProducts(rendered);
  const { prices } = useLivePrices({ prices: initialPrices });

  const kinds = KINDS.filter((k) => rendered.some((p) => kindOf(p) === k));
  const startKind = askedKind && kinds.includes(askedKind) ? askedKind : kinds[0];
  const startWeights = weightsOf(rendered, startKind);
  const [choice, setChoice] = useState(() => ({
    kind: startKind,
    weight: askedWeight !== undefined && startWeights.includes(askedWeight) ? askedWeight : startWeights[0],
  }));
  const weights = weightsOf(rendered, choice.kind);

  const pick = (kind: Kind, weight: number) => {
    setChoice({ kind, weight });
    // Next.js keeps its router in step with the native history calls.
    window.history.replaceState(null, "", `?c=${kind}&w=${weight}`);
  };

  const rows = products
    .filter((p) => kindOf(p) === choice.kind && p.weightGrams === choice.weight)
    .sort((a, b) => a.pricePiastres - b.pricePiastres);
  const brand = (p: Product) => (locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || productName(p, locale);
  const egp = (piastres: number) => (
    <>
      {pounds(piastres)} <small>{t.product.egp}</small>
    </>
  );
  const ask = <span className="cmp-ask">{t.compare.none}</span>;

  const template = choice.kind === "silver" ? t.compare.nameSilver : choice.kind === "pounds" ? t.compare.namePound : t.compare.nameBar;
  const name = fmt(template, { w: weightText(choice.weight) });
  const cheapest = rows[0];
  const dearest = rows[rows.length - 1];
  const time = prices ? cairoTime(prices.updatedAt) : "";
  const many = rows.length > 1;

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
    const sold = rows.find((p) => p.buyback);
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
          a: sold?.buyback
            ? fmt(t.compare.faqSellA, {
                brand: brand(sold),
                with: pounds(sold.buyback.withPackagingPiastres),
                without: pounds(sold.buyback.withoutPackagingPiastres),
              })
            : t.compare.faqSellNone,
        },
      ],
    };
  }

  return (
    <>
      <div className="cmp-pick">
        <div className="f">
          <span id="cmp-kind-label">{t.compare.kind}</span>
          <Select
            value={choice.kind}
            onChange={(kind) => pick(kind, weightsOf(rendered, kind)[0])}
            aria-labelledby="cmp-kind-label"
            options={kinds.map((k) => [k, t.compare.kinds[k]] as const)}
          />
        </div>
        <div className="f">
          <span id="cmp-weight-label">{t.compare.weight}</span>
          <Select
            value={String(choice.weight)}
            onChange={(weight) => pick(choice.kind, Number(weight))}
            aria-labelledby="cmp-weight-label"
            options={weights.map((w) => [String(w), weightLabel(w, t)] as const)}
          />
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
            {rows.map((p, index) => (
              <tr key={p.id} data-product={p.id}>
                <th scope="row">
                  {brand(p)}
                  {index === 0 && many ? <em className="pdp-tag">{t.compare.best}</em> : null}
                </th>
                <td className="cmp-price">{egp(p.pricePiastres)}</td>
                <td className="cmp-with">{p.buyback ? egp(p.buyback.withPackagingPiastres) : ask}</td>
                <td className="cmp-without">{p.buyback ? egp(p.buyback.withoutPackagingPiastres) : ask}</td>
                <td className="cmp-add">
                  <AddButton productId={p.id} inStock={p.inStock !== false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="cmp-note">{t.compare.note}</p>

      {info && cheapest ? (
        <div className="pr-read cmp-info">
          <section aria-labelledby="cmp-about">
            <h2 id="cmp-about">{fmt(t.compare.about, { name })}</h2>
            <p>{info.about}</p>
            {time ? <p className="cmp-about-note">{fmt(t.compare.aboutNote, { time })}</p> : null}
            <Link className="pdp-view cmp-more" href={href(`/shop/${cheapest.id}`)}>
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
