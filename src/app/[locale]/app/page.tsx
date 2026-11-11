import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreButtons } from "@/components/chrome";
import { ContentPage, contentMetadata } from "@/components/content-page";
import { fmt, hasLocale } from "@/i18n";
import { karatLabel, pounds, poundsParts, weightText } from "@/lib/format";
import { mobileAppJsonLd } from "@/lib/seo";
import { getBusiness } from "@/lib/seo-data";
import { getPricesOrNull } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/app">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return contentMetadata(locale, "app", "/app", (await getTexts(locale)).seoNames.app);
}

// The app page (PG-14, replaces /sell): what the app does, today's buyback prices as information,
// and the store badges once their URLs are set (SELL-04, SCH-09).
export default async function AppPage({ params }: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, business, prices] = await Promise.all([getTexts(locale), getBusiness(), getPricesOrNull()]);
  return (
    <ContentPage locale={locale} pageKey="app" path="/app" title={t.pages.appTitle} fallback={t.pages.appText} jsonLd={[mobileAppJsonLd(business, locale)]}>
      <StoreButtons t={t} placement="app" />
      {prices ? (
        <section className="pr-sec">
          <h2>{t.pages.appBuyback}</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th scope="col">{t.board.perGram}</th>
                <th scope="col">{t.prices.colSell}</th>
              </tr>
            </thead>
            <tbody>
              {prices.karats.map((k) => (
                <tr key={k.karat}>
                  <th scope="row">{karatLabel(k.karat, t)}</th>
                  <td>{poundsParts(k.sellPiastres).full}</td>
                </tr>
              ))}
              {prices.units.map((u) => (
                <tr key={u.unit}>
                  <th scope="row">{`${u.unit === "ounce" ? t.board.ounce : t.board.pound} · ${fmt(t.board.unitWeight, { w: weightText(u.weightGrams) })}`}</th>
                  <td>{pounds(u.sellPiastres)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t.prices.silverCard}</th>
                <td>{poundsParts(prices.silver.sellPiastres).full}</td>
              </tr>
            </tbody>
          </table>
          <p className="pr-note">{t.pages.appBuybackNote}</p>
        </section>
      ) : null}
    </ContentPage>
  );
}
