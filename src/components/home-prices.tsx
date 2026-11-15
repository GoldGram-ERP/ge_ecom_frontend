"use client";

import Link from "next/link";
import { fmt } from "@/i18n";
import { cairoDate, cairoTime, karatLabel, pounds, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import type { Prices } from "@/lib/types";
import { useI18n } from "./Providers";

/**
 * The home page's price strip (PG-01): the gram by karat and the gold pound, with the time of the
 * board in Cairo. Rendered on the server from `initial`, then it follows the price stream like the
 * ticker, so the two never disagree.
 */
export function HomePrices({ initial }: { initial: Prices }) {
  const { t, locale, href } = useI18n();
  const prices = useLivePrices({ prices: initial }).prices ?? initial;
  const pound = prices.units.find((u) => u.unit === "pound");
  return (
    <section className="home-prices" id="prices" aria-labelledby="home-prices-title">
      <h2 className="kicker" id="home-prices-title">
        {t.home.pricesTitle}
      </h2>
      <div className="record">
        {prices.karats.map((k) => (
          <div className="cred" key={k.karat}>
            <span>{`${karatLabel(k.karat, t)} · ${t.prices.perGram}`}</span>
            <b dir="ltr">{poundsParts(k.buyPiastres).full}</b>
          </div>
        ))}
        {pound && (
          <div className="cred">
            <span>{`${t.board.pound} · ${fmt(t.board.unitWeight, { w: pound.weightGrams })}`}</span>
            <b dir="ltr">{pounds(pound.buyPiastres)}</b>
          </div>
        )}
      </div>
      <p className="pr-updated">
        <span className="live" />
        {fmt(t.prices.updated, { time: cairoTime(prices.updatedAt), date: cairoDate(prices.updatedAt, locale) })}
        <Link href={href("/gold-price-today")}>{t.home.pricesMore}</Link>
      </p>
    </section>
  );
}
