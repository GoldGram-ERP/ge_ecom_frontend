import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ShopGrid } from "@/components/ShopGrid";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { getProducts } from "@/lib/server-api";

// Clean, SEO-friendly category URLs (the URL Map) mapped to the catalogue's own category slugs,
// so the shop's filters and data stay unchanged: /en/gold-bars renders the "bar" category.
const CATEGORY_URLS: Record<string, string> = {
  "gold-bars": "bar",
  "gold-coins": "coin",
  "gold-ingots": "ingot",
  "gold-bar-pendants": "wear",
};

export async function generateMetadata({ params }: PageProps<"/[locale]/[category]">): Promise<Metadata> {
  const { locale, category } = await params;
  if (!hasLocale(locale) || !CATEGORY_URLS[category]) return {};
  const slug = CATEGORY_URLS[category];
  const product = (await getProducts()).find((p) => p.category === slug);
  if (!product) return {};
  const name = locale === "ar" ? product.categoryNameAr : product.categoryNameEn;
  return { title: `${name} · GoldGram` };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/[category]">) {
  const { locale, category } = await params;
  if (!hasLocale(locale)) notFound();
  const slug = CATEGORY_URLS[category];
  if (!slug) notFound();
  const t = await getTexts(locale);
  const products = (await getProducts()).filter((p) => p.category === slug);
  if (products.length === 0) notFound();
  const name = locale === "ar" ? products[0].categoryNameAr : products[0].categoryNameEn;

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <div className="shop-preset">
              <h1>{name}</h1>
              <Link href={localePath(locale, `/shop`)}>{t.shop.all}</Link>
            </div>
            <ShopGrid products={products} initial={slug} />
            <div className="assure">
              {t.shop.assure.map((item) => (
                <div className="as" key={item.t}>
                  <span>{item.t}</span>
                  <p>{item.d}</p>
                </div>
              ))}
            </div>
            <p className="buy-note">{t.shop.note}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
