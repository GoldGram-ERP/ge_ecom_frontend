import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/analytics";
import { SiteHeader } from "@/components/header-client";
import { GoldPricesView } from "@/components/prices-live";
import { EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { hasLocale } from "@/i18n";
import { breadcrumbList, faqPageJsonLd, webPageJsonLd } from "@/lib/seo";
import { getSeoEntry, getWeightList, isBar, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getPrices, getPricesOrNull, getPriceHistory, getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/gold-price-today">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const [t, prices] = await Promise.all([getTexts(locale), getPricesOrNull()]);
  return seoMetadata({
    locale,
    path: "/gold-price-today",
    type: "price",
    entryType: "static",
    key: "gold-price-today",
    vars: { ...priceVars(prices, locale), name: t.prices.titleEgypt },
  });
}

export default async function GoldPricesPage({ params }: PageProps<"/[locale]/gold-price-today">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  // No catch: if the prices cannot be loaded, error.tsx offers a retry.
  const [t, entry, prices, history, silverHistory, products] = await Promise.all([
    getTexts(locale),
    getSeoEntry("static", "gold-price-today"),
    getPrices(),
    getPriceHistory("gold", 30),
    getPriceHistory("silver", 30),
    getProducts(),
  ]);
  const weights = (await getWeightList(products))
    .map((w) => ({
      slug: w.slug,
      label: w.label[locale],
      fromPiastres: Math.min(...products.filter((p) => isBar(p) && p.weightGrams === w.grams).map((p) => p.pricePiastres)),
    }))
    .filter((w) => Number.isFinite(w.fromPiastres));
  const faq = (entry?.faq ?? []).map((f) => ({ q: f.q[locale], a: f.a[locale] })).filter((f) => f.q && f.a);
  const name = entryH1(entry, locale, t.prices.titleEgypt);

  return (
    <div className="page buy-page">
      {/* WebPage dated by the last price publish (SCH-08), its trail and the questions it shows. */}
      <JsonLd
        data={[
          webPageJsonLd({ locale, path: "/gold-price-today", name, dateModified: prices.updatedAt }),
          breadcrumbList([
            { name: t.prices.crumbHome, path: "/", locale },
            { name: entry?.breadcrumbLabel?.[locale] || t.prices.crumbGold, path: "/gold-price-today", locale },
          ]),
          faqPageJsonLd(faq.length ? faq : t.prices.faq),
        ]}
      />
      <EntryHeadCode entry={entry} />
      <TrackView event="price_page_view" params={{ metal: "gold" }} />
      <SiteHeader />
      <GoldPricesView
        initial={prices}
        history={history}
        silverHistory={silverHistory}
        products={products}
        h1={name}
        intro={<EntryIntro entry={entry} locale={locale} />}
        weights={weights}
        faq={faq}
      />
    </div>
  );
}
