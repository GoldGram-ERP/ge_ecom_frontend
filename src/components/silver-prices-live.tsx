"use client";

import Link from "next/link";
import { PriceChart } from "@/components/PriceChart";
import { fmt, localePath } from "@/i18n";
import { cairoDate, cairoTime, changeLine, changeToday, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import type { PriceHistory, Prices } from "@/lib/types";
import { useI18n } from "./Providers";

export function SilverPricesView({ initial, history }: { initial: Prices; history: PriceHistory }) {
  const { t, locale } = useI18n();
  const { prices } = useLivePrices({ prices: initial });
  const silver = prices?.silver;
  if (!prices || !silver) return null;
  const change = changeToday(history.points, silver.buyPiastres);

  return (
    <div className="band-off pr-band">
      <div className="wrap">
        <Link className="back pdp-back" href={localePath(locale, `/prices`)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
          {t.prices.backToGold}
        </Link>
        <section className="pr-head">
          <h1>{t.prices.silverTitle}</h1>
          <p>{t.prices.silverSub}</p>
          <p className="pr-updated">
            <span className="live" />
            {fmt(t.prices.updated, { time: cairoTime(prices.updatedAt), date: cairoDate(prices.updatedAt, locale) })}
          </p>
        </section>

        <div className="pr-cards pr-silver">
          <article className="pr-card main">
            <h2 className="pr-k">{t.prices.silverCard}</h2>
            <b className="pr-buy">{poundsParts(silver.buyPiastres).full}</b>
            <span className="pr-unit">
              {t.board.buy} · {t.prices.perGram}
            </span>
            <div className="pr-pair">
              <span>{t.board.sell}</span>
              <em>{poundsParts(silver.sellPiastres).full}</em>
            </div>
            <span className={`pr-chg${change === null ? " none" : change < 0 ? " down" : ""}`}>
              {change === null ? "—" : changeLine(change, locale, t.board.todayWord).text}
            </span>
          </article>
        </div>

        <section className="pr-sec">
          <h2>{t.prices.chartSilver}</h2>
          <PriceChart metal="silver" initial={history} initialDays={30} initialPrices={prices} />
        </section>

        <Link className="gold-btn pr-cta" href={localePath(locale, `/shop`)}>
          {t.prices.shop}
        </Link>
      </div>
    </div>
  );
}
