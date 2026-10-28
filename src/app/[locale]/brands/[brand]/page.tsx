import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ShopGrid } from "@/components/ShopGrid";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { getProducts } from "@/lib/server-api";

// A brand's own page: every piece that brand makes. /en/brands/btc, /ar/brands/btc.
export async function generateMetadata({ params }: PageProps<"/[locale]/brands/[brand]">): Promise<Metadata> {
  const { locale, brand } = await params;
  if (!hasLocale(locale)) return {};
  const product = (await getProducts()).find((p) => p.manufacturerSlug === brand);
  if (!product) return {};
  const name = locale === "ar" ? product.manufacturerAr : product.manufacturerEn;
  return { title: `${name} · GoldGram` };
}

export default async function BrandPage({ params }: PageProps<"/[locale]/brands/[brand]">) {
  const { locale, brand } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const products = (await getProducts()).filter((p) => p.manufacturerSlug === brand);
  if (products.length === 0) notFound();
  const name = locale === "ar" ? products[0].manufacturerAr : products[0].manufacturerEn;

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <div className="shop-preset">
              <h1>{name}</h1>
              <Link href={localePath(locale, `/brands`)}>{t.brands.title}</Link>
            </div>
            <ShopGrid products={products} initial="all" />
            <p className="buy-note">{t.shop.note}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
