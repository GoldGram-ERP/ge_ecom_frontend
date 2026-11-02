"use client";

import { fmt } from "@/i18n";
import { cairoTime, pounds, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import { useLiveProducts } from "@/lib/live-products";
import type { Prices, Product } from "@/lib/types";
import { useI18n } from "./Providers";

const money = (piastres: number) => poundsParts(piastres).full;

/** The product page's price and what it is made of, kept current with the live price board. */
export function PdpPrice({ product, prices: initialPrices }: { product: Product; prices: Prices | null }) {
  const { t } = useI18n();
  const { prices } = useLivePrices({ prices: initialPrices ?? undefined });
  const [p] = useLiveProducts([product]);
  const silver = (p.karat as number) === 999;
  const time = prices ? cairoTime(prices.updatedAt) : "";
  return (
    <>
      <div className="pc-price pdp-price">
        {pounds(p.pricePiastres)}
        <u>{t.product.egp}</u>
      </div>
      {time ? <p className="pdp-note">{fmt(t.pdp.priceNote, { time })}</p> : null}
      {/* What the price is made of: the metal at today's gram price, and the maker's charge. */}
      <dl className="pdp-break" aria-label={t.pdp.breakdown}>
        <div>
          <dt>
            {silver ? t.pdp.metalSilver : t.pdp.metal}
            <small>{fmt(t.pdp.metalLine, { w: String(p.weightGrams), gram: money(p.gramPiastres) })}</small>
          </dt>
          <dd>{money(p.metalPiastres)}</dd>
        </div>
        <div>
          <dt>{t.pdp.making}</dt>
          <dd>{money(p.laborPiastres)}</dd>
        </div>
        <div className="pdp-break-total">
          <dt>{t.pdp.total}</dt>
          <dd>
            {pounds(p.pricePiastres)} <small>{t.product.egp}</small>
          </dd>
        </div>
      </dl>
    </>
  );
}
