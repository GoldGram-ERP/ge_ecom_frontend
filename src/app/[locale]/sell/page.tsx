import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { SellForm } from "@/components/SellForm";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { branchPickup, getPricesOrNull } from "@/lib/server-api";

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
  // Read on the server, so the branch options never flicker in or out.
  const [prices, branch] = await Promise.all([getPricesOrNull(), branchPickup()]);

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
          <SellForm prices={prices} branchPickup={branch} />
        </div>
      </div>
    </div>
  );
}
