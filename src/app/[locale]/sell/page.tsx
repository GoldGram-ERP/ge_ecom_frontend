import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { type Cashback, SellForm } from "@/components/SellForm";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { branchPickup, getPricesOrNull, getProducts } from "@/lib/server-api";
import type { Product } from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** The cashback per gram set in the dashboard; none when the backend does not say. */
async function sellCashback(): Promise<Cashback> {
  try {
    const response = await fetch(`${API_URL}/api/settings`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = response.ok ? ((await response.json()) as Partial<Record<"sellCashbackSealedPiastres" | "sellCashbackOpenedPiastres", number>>) : {};
    return { sealed: data.sellCashbackSealedPiastres ?? 0, opened: data.sellCashbackOpenedPiastres ?? 0 };
  } catch {
    return { sealed: 0, opened: 0 };
  }
}

async function productsOrNone(): Promise<Product[]> {
  try {
    return await getProducts();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps<"/[locale]/sell">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.sell.title} · GoldGram`, description: t.sell.sub };
}

export default async function SellPage({ params }: PageProps<"/[locale]/sell">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  // Read on the server, so the branch options, the brands and the cashback never flicker in or out.
  const [prices, branch, products, cashback] = await Promise.all([getPricesOrNull(), branchPickup(), productsOrNone(), sellCashback()]);

  return (
    <div className="page checkout-page sell-page">
      <SiteHeader />
      <div className="band-navy">
        <div className="wrap">
          <section className="co-top">
            <div className="kicker">{t.sell.kicker}</div>
            <h1>{t.sell.title}</h1>
            <p className="sell-lede">{t.sell.sub}</p>
            <ol className="co-steps sell-steps">
              {t.sell.steps.map((label, i) => (
                <li className="co-step" key={label}>
                  <i>0{i + 1}</i>
                  {label}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
      <div className="band-off">
        <div className="wrap">
          <SellForm prices={prices} branchPickup={branch} products={products} cashback={cashback} />
        </div>
      </div>
    </div>
  );
}
