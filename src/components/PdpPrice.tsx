"use client";

import { fmt } from "@/i18n";
import { pounds, poundsParts } from "@/lib/format";
import { useLiveProducts } from "@/lib/live-products";
import type { Product } from "@/lib/types";
import { useI18n } from "./Providers";

const money = (piastres: number) => poundsParts(piastres).full;

/** The product page's price and what it is made of, kept current with the live price board. */
export function PdpPrice({ product, note }: { product: Product; note?: React.ReactNode }) {
  const { t } = useI18n();
  const [p] = useLiveProducts([product]);
  const silver = (p.karat as number) === 999;
  return (
    <>
      <div className="pc-price pdp-price">
        {pounds(p.pricePiastres)}
        <u>{t.product.egp}</u>
      </div>
      {note}
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
