import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { PriceChart } from "@/components/PriceChart";
import { fmt, hasLocale } from "@/i18n";
import { cairoDate, cairoTime, poundsParts } from "@/lib/format";
import { getPrices, getPriceHistory } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/prices/silver">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.prices.silverTitle} · GoldGram`, description: t.prices.silverSub };
}

export default async function SilverPricesPage({ params }: PageProps<"/[locale]/prices/silver">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const [prices, history] = await Promise.all([getPrices(), getPriceHistory("silver", 30)]);
  const { silver } = prices;

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off pr-band">
        <div className="wrap">
          <Link className="back pdp-back" href={`/${locale}/prices`}>
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
            </article>
          </div>

          <section className="pr-sec">
            <h2>{t.prices.chartSilver}</h2>
            <PriceChart metal="silver" initial={history} initialDays={30} />
          </section>

          <Link className="gold-btn pr-cta" href={`/${locale}/shop`}>
            {t.prices.shop}
          </Link>
        </div>
      </div>
    </div>
  );
}
