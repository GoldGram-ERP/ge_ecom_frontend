import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareTool } from "@/components/CompareTool";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { ALL_KINDS, isKind } from "@/lib/kinds";
import { getCashback, getPricesOrNull, getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import "../../styles/compare.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/making-charges">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.making.title} · GoldGram` };
}

export default async function MakingChargesPage({ params, searchParams }: PageProps<"/[locale]/making-charges">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  // No catch on the catalogue: if it cannot be loaded, error.tsx offers a retry.
  const [t, products, prices, cashback, query] = await Promise.all([
    getTexts(locale),
    getProducts(),
    getPricesOrNull(),
    getCashback(),
    searchParams,
  ]);

  return (
    <div className="page">
      <SiteHeader />

      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <div className="kicker">{t.making.kicker}</div>
            <h1>{t.making.title}</h1>
            <p className="buy-note" style={{ maxWidth: "70ch", marginTop: "var(--s2)" }}>{t.making.intro}</p>

            {products.length === 0 ? (
              <p className="buy-note">{t.making.empty}</p>
            ) : (
              // A kind and a weight (the first of each until the visitor picks), then that piece
              // from every brand: price, cashback with and without packaging, and add to cart.
              <div className="cmp">
                <CompareTool
                  products={products}
                  prices={prices}
                  cashback={cashback}
                  offered={ALL_KINDS}
                  allKinds
                  details={false}
                  kind={isKind(query.c) ? query.c : undefined}
                  weight={typeof query.w === "string" ? Number(query.w) : undefined}
                />
              </div>
            )}

            <p className="buy-note" style={{ marginTop: "var(--s6)" }}>{t.making.note}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
