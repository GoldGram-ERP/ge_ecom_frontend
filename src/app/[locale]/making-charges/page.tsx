import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareTool } from "@/components/CompareTool";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { ALL_KINDS, isKind } from "@/lib/kinds";
import { getPricesOrNull, getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import { getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { EntryFaq, EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { breadcrumbList } from "@/lib/seo";
import "../../styles/compare.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/making-charges">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const [t, prices] = await Promise.all([getTexts(locale), getPricesOrNull()]);
  return seoMetadata({ locale, path: "/making-charges", type: "static", entryType: "static", key: "making-charges", vars: { ...priceVars(prices, locale), name: t.seoNames.makingCharges } });
}

export default async function MakingChargesPage({ params, searchParams }: PageProps<"/[locale]/making-charges">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  // No catch on the catalogue: if it cannot be loaded, error.tsx offers a retry.
  const [t, products, prices, query, entry] = await Promise.all([getTexts(locale), getProducts(), getPricesOrNull(), searchParams, getSeoEntry("static", "making-charges")]);

  return (
    <div className="page">
      <JsonLd data={breadcrumbList([{ name: t.pdp.home, path: "/", locale }, { name: entry?.breadcrumbLabel?.[locale] || t.making.title, path: "/making-charges", locale }])} />
      <EntryHeadCode entry={entry} />
      <SiteHeader />

      <div className="band-off">
        <div className="wrap">
          {/* The same header as the prices and zakat pages. */}
          <section className="pr-head">
            <div className="kicker">{t.making.kicker}</div>
            <h1>{entryH1(entry, locale, t.making.title)}</h1>
            <p>{t.making.intro}</p>
            <EntryIntro entry={entry} locale={locale} />
          </section>
          <section>
            {products.length === 0 ? (
              <p className="buy-note">{t.making.empty}</p>
            ) : (
              // Every kind and weight from every brand at first, grouped, then the visitor filters
              // down; "All" in both lists brings the full table back. ?c= and ?w= still pick a view.
              <div className="cmp">
                <CompareTool
                  products={products}
                  prices={prices}
                  offered={ALL_KINDS}
                  allKinds
                  details={false}
                  showAll
                  kind={isKind(query.c) ? query.c : undefined}
                  weight={typeof query.w === "string" ? Number(query.w) : undefined}
                />
              </div>
            )}

            <p className="buy-note" style={{ marginTop: "var(--s6)" }}>{t.making.note}</p>
            <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
          </section>
        </div>
      </div>
    </div>
  );
}
