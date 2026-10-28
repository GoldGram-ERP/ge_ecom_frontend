import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareTool } from "@/components/CompareTool";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { isKind, type Kind, kindOf } from "@/lib/kinds";
import { getCashback, getPricesOrNull, getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import type { Product } from "@/lib/types";
import "../../styles/compare.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.compare.title} · GoldGram`, description: t.compare.sub };
}

/**
 * The choice in the address: `?c=small&w=10`. The product page's older link
 * (`?g=bar-24-10`: category, karat, weight) still lands on the same piece.
 */
function chosen(products: Product[], query: Record<string, string | string[] | undefined>): { kind?: Kind; weight?: number } {
  if (typeof query.g === "string") {
    const [category, karat, weight] = query.g.split("-");
    const piece = products.find((p) => p.category === category && String(p.karat) === karat && String(p.weightGrams) === weight);
    const kind = piece ? kindOf(piece) : null;
    if (piece && kind) return { kind, weight: piece.weightGrams };
  }
  return { kind: isKind(query.c) ? query.c : undefined, weight: typeof query.w === "string" ? Number(query.w) : undefined };
}

export default async function ComparePage({ params, searchParams }: PageProps<"/[locale]/compare">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, all, prices, cashback] = await Promise.all([getTexts(locale), getProducts(), getPricesOrNull(), getCashback()]);
  const products = all.filter((p) => kindOf(p) !== null);

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap cmp">
          <div className="cmp-head">
            <h1>{t.compare.title}</h1>
            <p>{t.compare.sub}</p>
          </div>
          {products.length === 0 ? (
            <p className="buy-empty">{t.compare.empty}</p>
          ) : (
            <CompareTool products={products} prices={prices} cashback={cashback} {...chosen(products, await searchParams)} />
          )}
        </div>
      </div>
    </div>
  );
}
