import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/analytics";
import { SiteHeader } from "@/components/header-client";
import { EntryFaq, EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { ShopGrid } from "@/components/ShopGrid";
import { fmt, hasLocale, type Locale, localePath } from "@/i18n";
import { buybackPiastres, cairoDate, cairoTime, pounds, poundsParts, productName, weightText } from "@/lib/format";
import { breadcrumbList, itemListJsonLd } from "@/lib/seo";
import { getSeoEntry, getWeightList, isBar, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getPricesOrNull, getProducts } from "@/lib/server-api";
import { mergeBars } from "@/lib/shop-links";
import { getTexts } from "@/lib/site-texts";

// One page per bar weight (PG-04): /gold-bars/10-gram. Only weights with products exist; any other
// weight, or any other category, is a 404 (IDX-06).
async function load(locale: Locale, category: string, slug: string) {
  if (category !== "gold-bars") return null;
  const products = await getProducts();
  const weights = await getWeightList(products);
  const index = weights.findIndex((w) => w.slug === slug);
  if (index < 0) return null;
  const weight = weights[index];
  const bars = products.filter((p) => isBar(p) && p.weightGrams === weight.grams).sort((a, b) => a.pricePiastres - b.pricePiastres);
  if (!bars.length) return null;
  const sold = bars.filter((p) => p.inStock !== false);
  const from = (sold.length ? sold : bars)[0];
  return { weight, bars, from, neighbours: [weights[index - 1], weights[index + 1]].filter(Boolean), label: weight.label[locale] };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[category]/[weight]">): Promise<Metadata> {
  const { locale, category, weight: slug } = await params;
  if (!hasLocale(locale)) return {};
  const [found, prices] = await Promise.all([load(locale, category, slug), getPricesOrNull()]);
  if (!found) return {};
  const fromPrice = pounds(found.from.pricePiastres);
  return seoMetadata({
    locale,
    path: `/gold-bars/${slug}`,
    type: "weight",
    entryType: "weight",
    key: slug,
    vars: { ...priceVars(prices, locale), name: found.label, weight: weightText(found.weight.grams), price_buy: fromPrice, price_from: fromPrice, karat: "24" },
    image: found.from.imageIds[0] ? `/api/products/${found.from.id}/images/${found.from.imageIds[0]}` : undefined,
  });
}

export default async function WeightPage({ params }: PageProps<"/[locale]/[category]/[weight]">) {
  const { locale, category, weight: slug } = await params;
  if (!hasLocale(locale)) notFound();
  const found = await load(locale, category, slug);
  if (!found) notFound();
  const [t, prices, entry] = await Promise.all([getTexts(locale), getPricesOrNull(), getSeoEntry("weight", slug)]);
  const { bars, from, neighbours, label } = found;
  const w = label;
  const making = bars.map((p) => p.laborPiastres / p.weightGrams);
  const money = (piastres: number) => `${pounds(piastres)} ${t.product.egp}`;
  const h1 = entryH1(entry, locale, fmt(t.weight.title, { w }));
  const trail = [
    { name: t.pdp.home, path: "/", locale },
    { name: t.weight.all, path: "/gold-bars", locale },
    { name: entry?.breadcrumbLabel?.[locale] || label, path: `/gold-bars/${slug}`, locale },
  ];

  return (
    <div className="page buy-page">
      <JsonLd data={[breadcrumbList(trail), itemListJsonLd(locale, bars.map((p) => ({ name: productName(p, locale), path: `/shop/${p.slug}` })))]} />
      <EntryHeadCode entry={entry} />
      <TrackView event="view_item_list" params={{ item_list_id: `weight-${slug}`, items: bars.map((p) => ({ item_id: p.slug, item_name: p.nameEn, weight: p.weightGrams, karat: p.karat, item_brand: p.manufacturerEn })) }} />
      <SiteHeader />
      <div className="band-off pr-band">
        <div className="wrap">
          <nav className="pr-crumb" aria-label={t.pdp.breadcrumb}>
            <Link href={localePath(locale, "")}>{trail[0].name}</Link>
            <span aria-hidden="true">›</span>
            <Link href={localePath(locale, "/gold-bars")}>{trail[1].name}</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{trail[2].name}</span>
          </nav>

          <section className="pr-head">
            <h1>{h1}</h1>
            <p className="pr-summary">
              {t.weight.gold} <b>{money(from.metalPiastres)}</b> · {t.weight.making} <b>{money(from.laborPiastres)}</b> · {t.weight.from}{" "}
              <b>{money(from.pricePiastres)}</b>
            </p>
            {prices ? (
              <p className="pr-updated">
                <span className="live" />
                {fmt(t.weight.updated, { time: cairoTime(prices.updatedAt), date: cairoDate(prices.updatedAt, locale) })}
              </p>
            ) : null}
            <EntryIntro entry={entry} locale={locale} />
          </section>

          <section className="pr-sec">
            <h2>{fmt(t.weight.brandsTitle, { w })}</h2>
            <div className="pdp-table-wrap">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th scope="col">{t.weight.brand}</th>
                    <th scope="col">{t.weight.perGram}</th>
                    <th scope="col">{t.weight.total}</th>
                    <th scope="col">{t.weight.buyback}</th>
                    <th scope="col">{t.weight.cashback}</th>
                    <th scope="col">{t.weight.stock}</th>
                  </tr>
                </thead>
                <tbody>
                  {bars.map((p, i) => {
                    const buyback = buybackPiastres(p, prices);
                    return (
                      <tr key={p.id}>
                        <th scope="row">
                          <Link className="pr-row-link" href={localePath(locale, `/shop/${p.slug}`)}>
                            {(locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || productName(p, locale)}
                          </Link>
                        </th>
                        <td>{poundsParts(making[i]).full}</td>
                        <td>{pounds(p.pricePiastres)}</td>
                        <td>{buyback === null ? "—" : pounds(buyback)}</td>
                        <td>{p.cashback ? poundsParts(p.cashback.withPackagingPiastres).full : "—"}</td>
                        <td>{p.inStock === false ? t.weight.outOfStock : t.weight.inStock}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pr-sec">
            <ShopGrid products={mergeBars(bars)} initial="all" />
          </section>

          {neighbours.length ? (
            <section className="pr-sec">
              <h2>{t.weight.others}</h2>
              <div className="brands weight-tiles">
                {neighbours.map((n) => (
                  <Link className="brand-card" key={n.slug} href={localePath(locale, `/gold-bars/${n.slug}`)}>
                    <b>{n.label[locale]}</b>
                    <span>{fmt(t.brands.pieces, { n: n.productCount })}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
        </div>
      </div>
    </div>
  );
}
