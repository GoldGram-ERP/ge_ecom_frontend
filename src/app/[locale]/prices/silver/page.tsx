import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { SilverPricesView } from "@/components/silver-prices-live";
import { hasLocale } from "@/i18n";
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
  const [prices, history] = await Promise.all([getPrices(), getPriceHistory("silver", 30)]);
  return (
    <div className="page buy-page">
      <SiteHeader />
      <SilverPricesView initial={prices} history={history} />
    </div>
  );
}
