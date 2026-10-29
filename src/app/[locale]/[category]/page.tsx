import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ShopGrid } from "@/components/ShopGrid";
import { hasLocale, type Locale } from "@/i18n";
import { isSilver } from "@/lib/kinds";
import { getTexts } from "@/lib/site-texts";
import { getProducts } from "@/lib/server-api";
import type { Product } from "@/lib/types";

/** Not a catalogue slug: the silver page's marker. */
const SILVER = "@silver";

// Clean, SEO-friendly URLs (the URL Map) mapped to the catalogue's own category slugs, so the
// shop's filters and data stay unchanged: /en/gold-bars renders the "bar" category. /silver is
// the metal, not a category: every 999 piece, whatever its category (the old /shop?m=silver).
const CATEGORY_URLS: Record<string, string> = {
  "gold-bars": "bar",
  "gold-coins": "coin",
  "gold-ingots": "ingot",
  "gold-bar-pendants": "wear",
  silver: SILVER,
};

const pick = (products: Product[], slug: string) =>
  products.filter((p) => (slug === SILVER ? isSilver(p) : p.category === slug));

async function pageName(locale: Locale, slug: string, products: Product[]): Promise<string | null> {
  if (slug === SILVER) return (await getTexts(locale)).nav.silver;
  if (products.length === 0) return null;
  return locale === "ar" ? products[0].categoryNameAr : products[0].categoryNameEn;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[category]">): Promise<Metadata> {
  const { locale, category } = await params;
  if (!hasLocale(locale) || !CATEGORY_URLS[category]) return {};
  const slug = CATEGORY_URLS[category];
  const name = await pageName(locale, slug, pick(await getProducts(), slug));
  return name ? { title: `${name} · GoldGram` } : {};
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/[category]">) {
  const { locale, category } = await params;
  if (!hasLocale(locale)) notFound();
  const slug = CATEGORY_URLS[category];
  if (!slug) notFound();
  const t = await getTexts(locale);
  const all = await getProducts();
  const products = pick(all, slug);
  // The menu always links silver, so its page stays up (empty) when there is none on sale.
  const name = await pageName(locale, slug, products);
  if (name === null) notFound();
  // The grid gets every piece, with all the shop's filters, and starts on this page's own: the
  // category, or for silver the category its pieces are in (none on sale: an empty filter).
  const initial = slug === SILVER ? (products[0]?.category ?? "silver") : slug;

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
            <ShopGrid products={all} initial={initial} />
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
