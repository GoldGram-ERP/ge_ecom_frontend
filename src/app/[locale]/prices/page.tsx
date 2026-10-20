import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MiniArt } from "@/components/chrome";
import { GoldCalculator } from "@/components/GoldCalculator";
import { SiteHeader } from "@/components/header-client";
import { FaqList } from "@/components/home-client";
import { PriceChart } from "@/components/PriceChart";
import { fmt, hasLocale } from "@/i18n";
import { cairoDate, cairoTime, changeLine, karatLabel, pounds, poundsParts, productName, productSub, weightText } from "@/lib/format";
import type { Prices, Product } from "@/lib/types";
import { getPrices, getPriceHistory, getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/prices">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.prices.titleEgypt} · GoldGram`, description: t.prices.goldSub };
}

/** A sentence whose {placeholders} are filled with elements: the numbers keep their own font. */
function rich(template: string, values: Record<string, ReactNode>): ReactNode[] {
  return template.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? <b key={i}>{values[part]}</b> : part));
}

/** What to buy at today's price: 24K bars of 1, 5 and 10 g and the gold pound, when the catalogue has them. */
function picks(products: Product[]): Product[] {
  const sold = products.filter((p) => p.inStock !== false);
  const bar = (grams: number) => sold.find((p) => p.karat === 24 && p.weightGrams === grams && p.category !== "coin" && p.category !== "wear");
  const pound = sold.find((p) => p.category === "coin" && p.weightGrams === 8);
  return [bar(1), bar(5), bar(10), pound].filter((p): p is Product => Boolean(p));
}

export default async function GoldPricesPage({ params }: PageProps<"/[locale]/prices">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  // No catch: if the prices cannot be loaded, error.tsx offers a retry.
  const [prices, history, products] = await Promise.all([getPrices(), getPriceHistory("gold", 30), getProducts()]);
  const k24 = prices.karats.find((k) => k.karat === 24) ?? prices.karats[0];
  const k21 = prices.karats.find((k) => k.karat === 21) ?? prices.karats[0];
  const ounce = prices.units.find((u) => u.unit === "ounce");
  const today = (pct: number) => changeLine(pct, locale, "");
  // Units are priced from a karat, so they move with it: the ounce with 24K, the pound with 21K.
  const unitChange = (unit: "ounce" | "pound") => (unit === "ounce" ? k24.changePct : k21.changePct);
  const unitName = (u: Prices["units"][number]) => `${u.unit === "ounce" ? t.board.ounce : t.board.pound} · ${fmt(t.board.unitWeight, { w: weightText(u.weightGrams) })}`;
  const toBuy = picks(products);

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off pr-band">
        <div className="wrap">
          <nav className="pr-crumb" aria-label={t.prices.crumbGold}>
            <Link href={`/${locale}`}>{t.prices.crumbHome}</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{t.prices.crumbGold}</span>
          </nav>

          <section className="pr-head">
            <h1>{t.prices.titleEgypt}</h1>
            <p className="pr-summary">
              {rich(t.prices.summary, {
                k24: poundsParts(k24.buyPiastres).full,
                k21: poundsParts(k21.buyPiastres).full,
                time: cairoTime(prices.updatedAt),
              })}
            </p>
            <p className="pr-updated">
              <span className="live" />
              {fmt(t.prices.updated, { time: cairoTime(prices.updatedAt), date: cairoDate(prices.updatedAt, locale) })}
            </p>
          </section>

          <div className="pr-layout">
            <section className="pr-main" aria-labelledby="pr-karats">
              <h2 id="pr-karats">{t.prices.karatsTitle}</h2>
              <table className="pr-table pr-karats">
                <thead>
                  <tr>
                    <th scope="col">{t.board.perGram}</th>
                    <th scope="col">{t.board.buy}</th>
                    <th scope="col">{t.board.sell}</th>
                    <th scope="col">{t.prices.colToday}</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.karats.map((k) => {
                    const change = today(k.changePct);
                    return (
                      <tr key={k.karat}>
                        <th scope="row">{karatLabel(k.karat, t)}</th>
                        <td>{poundsParts(k.buyPiastres).full}</td>
                        <td>{poundsParts(k.sellPiastres).full}</td>
                        <td className={`pr-today${change.down ? " down" : ""}`}>{change.text}</td>
                      </tr>
                    );
                  })}
                  {prices.units.map((u) => {
                    const change = today(unitChange(u.unit));
                    return (
                      <tr key={u.unit}>
                        <th scope="row">{unitName(u)}</th>
                        <td>{pounds(u.buyPiastres)}</td>
                        <td>{pounds(u.sellPiastres)}</td>
                        <td className={`pr-today${change.down ? " down" : ""}`}>{change.text}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <th scope="row">
                      <Link className="pr-row-link" href={`/${locale}/prices/silver`}>
                        {t.prices.silverCard}
                      </Link>
                    </th>
                    <td>{poundsParts(prices.silver.buyPiastres).full}</td>
                    <td>{poundsParts(prices.silver.sellPiastres).full}</td>
                    <td className="pr-today none">—</td>
                  </tr>
                </tbody>
              </table>
              <p className="pr-note">{t.prices.perGram} · {t.prices.goldSub}</p>
            </section>

            <aside className="pr-side">
              {ounce ? (
                <article className="pr-card main pr-ounce">
                  <h2 className="pr-k">{t.prices.ounceTitle}</h2>
                  <b className="pr-buy">{pounds(ounce.buyPiastres)}</b>
                  <span className="pr-unit">
                    {t.board.buy} · {t.product.egp}
                  </span>
                  <div className="pr-pair">
                    <span>{t.board.sell}</span>
                    <em>{pounds(ounce.sellPiastres)}</em>
                  </div>
                  <span className={`pr-chg${today(k24.changePct).down ? " down" : ""}`}>{changeLine(k24.changePct, locale, t.board.todayWord).text}</span>
                  <p className="pr-ounce-note">{t.prices.ounceNote}</p>
                </article>
              ) : null}
              <GoldCalculator karats={prices.karats} />
            </aside>
          </div>

          <section className="pr-sec">
            <h2>{t.prices.movementTitle}</h2>
            <p className="pr-move">
              {rich(t.prices.movementLine, { c21: today(k21.changePct).text, c24: today(k24.changePct).text })}
            </p>
            <PriceChart metal="gold" initial={history} initialDays={30} />
          </section>

          {toBuy.length > 0 ? (
            <section className="pr-sec">
              <h2>{t.prices.buyTitle}</h2>
              <div className="pr-buyrow">
                {toBuy.map((p) => {
                  const photo = p.imageIds?.[0];
                  return (
                    <Link className="pr-pick" href={`/${locale}/shop/${p.id}`} key={p.id}>
                      {photo ? (
                        <span className="pr-pick-art">
                          <Image unoptimized src={`/api/products/${p.id}/images/${photo}`} alt="" width={160} height={160} loading="lazy" />
                        </span>
                      ) : (
                        <MiniArt category={p.category} className="pr-pick-art" />
                      )}
                      <b>{productName(p, locale)}</b>
                      <span>{productSub(p, t)}</span>
                      <em>
                        {pounds(p.pricePiastres)} <small className="egp">{t.product.egp}</small>
                      </em>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="pr-sec pr-read">
            <section>
              <h2>{t.prices.driversTitle}</h2>
              {t.prices.drivers.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </section>
            <section>
              <h2>{t.prices.faqTitle}</h2>
              <FaqList items={t.prices.faq} id="pr-faq" />
            </section>
          </div>

          <Link className="gold-btn pr-cta" href={`/${locale}/shop`}>
            {t.prices.shop}
          </Link>
        </div>
      </div>
    </div>
  );
}
