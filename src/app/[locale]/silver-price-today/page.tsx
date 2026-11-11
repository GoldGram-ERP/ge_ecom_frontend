import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { EntryFaq, EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { SilverPricesView } from "@/components/silver-prices-live";
import { hasLocale } from "@/i18n";
import { breadcrumbList, webPageJsonLd } from "@/lib/seo";
import { getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getPrices, getPricesOrNull, getPriceHistory } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/silver-price-today">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const [t, prices] = await Promise.all([getTexts(locale), getPricesOrNull()]);
  return seoMetadata({
    locale,
    path: "/silver-price-today",
    type: "static",
    entryType: "static",
    key: "silver-price-today",
    vars: { ...priceVars(prices, locale), name: t.seoNames.silverPrice },
  });
}

export default async function SilverPricesPage({ params }: PageProps<"/[locale]/silver-price-today">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, entry, prices, history] = await Promise.all([getTexts(locale), getSeoEntry("static", "silver-price-today"), getPrices(), getPriceHistory("silver", 30)]);
  const name = entryH1(entry, locale, t.prices.silverTitle);
  return (
    <div className="page buy-page">
      <JsonLd
        data={[
          webPageJsonLd({ locale, path: "/silver-price-today", name, dateModified: prices.updatedAt }),
          breadcrumbList([
            { name: t.prices.crumbHome, path: "/", locale },
            { name: entry?.breadcrumbLabel?.[locale] || t.prices.silverTitle, path: "/silver-price-today", locale },
          ]),
        ]}
      />
      <EntryHeadCode entry={entry} />
      <SiteHeader />
      <SilverPricesView initial={prices} history={history} h1={name}>
        <EntryIntro entry={entry} locale={locale} />
        <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
      </SilverPricesView>
    </div>
  );
}
