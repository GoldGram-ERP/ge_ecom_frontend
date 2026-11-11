"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pageOf, trackEvent } from "@/lib/analytics";
import { karatLabel, poundsParts } from "@/lib/format";
import type { Prices } from "@/lib/types";
import { useI18n } from "./Providers";
import { Select } from "./controls";

/** Weight × today's price per gram of a karat, at the buy price and at the buy-back (sell) price. */
export function GoldCalculator({ karats }: { karats: Prices["karats"] }) {
  const { t, href } = useI18n();
  const [weight, setWeight] = useState("10");
  const [karat, setKarat] = useState(String(karats.find((k) => k.karat === 24)?.karat ?? karats[0].karat));
  const grams = Number(weight.replace(",", "."));
  const price = karats.find((k) => String(k.karat) === karat);
  const valid = weight.trim() !== "" && Number.isFinite(grams) && grams > 0 && grams <= 100_000 && price;
  const amount = (perGram: number) => (valid ? poundsParts(Math.round(grams * perGram)).full : "—");

  // GA4 price_calculator_use: a second after the visitor changes the weight or karat, when a result shows.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!valid) return;
    const timer = setTimeout(() => trackEvent("price_calculator_use", { weight_grams: grams, karat, page_type: pageOf(window.location.pathname).type }), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the visitor's inputs only
  }, [weight, karat]);

  return (
    <section className="pr-calc" aria-labelledby="pr-calc-title">
      <h2 id="pr-calc-title">{t.prices.calcTitle}</h2>
      <div className="pr-calc-in">
        <label className="f">
          <span>{t.prices.calcWeight}</span>
          <input id="pr-weight" type="number" inputMode="decimal" min="0" step="any" dir="ltr" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <div className="f">
          <span id="pr-karat-label">{t.prices.calcKarat}</span>
          <Select value={karat} onChange={setKarat} aria-labelledby="pr-karat-label" options={karats.map((k) => [String(k.karat), karatLabel(k.karat, t)] as const)} />
        </div>
      </div>
      {/* announced as the numbers change, so a screen reader hears the result too */}
      <dl className="pr-calc-out" aria-live="polite">
        <div>
          <dt>{t.prices.calcBuy}</dt>
          <dd>
            {price ? amount(price.buyPiastres) : "—"} <small className="egp">{t.product.egp}</small>
          </dd>
        </div>
        <div>
          <dt>{t.prices.calcSell}</dt>
          <dd>
            {price ? amount(price.sellPiastres) : "—"} <small className="egp">{t.product.egp}</small>
          </dd>
        </div>
      </dl>
      <p className="pr-calc-note">{t.prices.calcNote}</p>
      <Link className="pr-more" href={href("/shop")}>
        {t.prices.calcShop}
      </Link>
    </section>
  );
}
