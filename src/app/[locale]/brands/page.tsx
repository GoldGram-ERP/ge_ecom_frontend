import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt } from "@/i18n";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { getProducts } from "@/lib/server-api";
import { priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/brands">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return seoMetadata({ locale, path: "/brands", type: "static", entryType: "static", key: "brands", vars: { ...priceVars(null, locale), name: t.brands.title } });
}

export default async function BrandsPage({ params }: PageProps<"/[locale]/brands">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const products = await getProducts();

  // The brands that have pieces on sale, with how many each has.
  const brands = new Map<string, { slug: string; name: string; count: number }>();
  for (const p of products) {
    const name = locale === "ar" ? p.manufacturerAr : p.manufacturerEn;
    const brand = brands.get(p.manufacturerSlug) ?? { slug: p.manufacturerSlug, name, count: 0 };
    brand.count += 1;
    brands.set(p.manufacturerSlug, brand);
  }

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <h1>{t.brands.title}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s3)", marginTop: "var(--s4)" }}>
              {[...brands.values()].map((brand) => (
                <Link key={brand.slug} className="brand-card" href={localePath(locale, `/brands/${brand.slug}`)}>
                  <b>{brand.name}</b>
                  <span>{fmt(t.brands.pieces, { n: String(brand.count) })}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
