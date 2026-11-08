import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { GoldPricesView } from "@/components/prices-live";
import { hasLocale } from "@/i18n";
import { getPrices, getPriceHistory, getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/prices">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.prices.titleEgypt} · GoldGram`, description: t.prices.goldSub };
}

export default async function GoldPricesPage({ params }: PageProps<"/[locale]/prices">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  // No catch: if the prices cannot be loaded, error.tsx offers a retry.
  const [prices, history, silverHistory, products] = await Promise.all([getPrices(), getPriceHistory("gold", 30), getPriceHistory("silver", 30), getProducts()]);
  return (
    <div className="page buy-page">
      <SiteHeader />
      <GoldPricesView initial={prices} history={history} silverHistory={silverHistory} products={products} />
    </div>
  );
}
