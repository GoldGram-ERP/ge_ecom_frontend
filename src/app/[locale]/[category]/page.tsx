import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/analytics";
import { SiteHeader } from "@/components/header-client";
import { EntryFaq, EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { ShopGrid } from "@/components/ShopGrid";
import { type Dict, fmt, hasLocale, type Locale, localePath } from "@/i18n";
import { pounds, productName } from "@/lib/format";
import { isSilver } from "@/lib/kinds";
import { itemListJsonLd } from "@/lib/seo";
import { getSeoEntry, getWeightList, isBar, priceVars, type Weight } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getPricesOrNull, getProducts } from "@/lib/server-api";
import { CATEGORY_URLS, mergeBars, SHOP_LINKS, SILVER } from "@/lib/shop-links";
import { getTexts } from "@/lib/site-texts";
import type { Product } from "@/lib/types";

/** The page's pieces: silver by its metal, else those of any of the page's category slugs. */
const pick = (products: Product[], slugs: readonly string[]) =>
  products.filter((p) => (slugs[0] === SILVER ? isSilver(p) : slugs.includes(p.category)));

/** Each category's own name for search ({name} in its template). */
const SEO_NAME: Record<string, keyof Dict["seoNames"]> = {
  "gold-bars": "goldBars",
  "gold-coins": "goldCoins",
  "gold-bar-pendants": "pendants",
  silver: "silver",
};

/**
 * The heading: the category's own name from the catalogue, else (silver, or a category with no
 * piece on sale right now) the menu's name for the link, so a link in the menu never leads nowhere.
 */
function pageName(t: Dict, locale: Locale, url: string, slugs: readonly string[], products: Product[]): string {
  if (slugs[0] !== SILVER && products.length > 0) {
    return locale === "ar" ? products[0].categoryNameAr : products[0].categoryNameEn;
  }
  const link = SHOP_LINKS.find((l) => l.path === `/${url}`);
  return link ? t.nav[link.label] : t.nav.shop;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[category]">): Promise<Metadata> {
  const { locale, category } = await params;
  if (!hasLocale(locale) || !CATEGORY_URLS[category]) return {};
  const [t, products, prices] = await Promise.all([getTexts(locale), getProducts(), getPricesOrNull()]);
  const shown = pick(products, CATEGORY_URLS[category]);
  return seoMetadata({
    locale,
    path: `/${category}`,
    type: "category",
    entryType: "category",
    key: category,
    vars: { ...priceVars(prices, locale), name: t.seoNames[SEO_NAME[category]] },
    // An empty category is noindex until it has products (IDX-05, PG-06).
    noindex: shown.length === 0,
  });
}

/** The weight tiles of the bars hub (PG-03): each weight's from-price, linking to its own page. */
function WeightTiles({ weights, bars, locale, t }: { weights: Weight[]; bars: Product[]; locale: Locale; t: Dict }) {
  if (!weights.length) return null;
  return (
    <div className="brands weight-tiles">
      {weights.map((w) => {
        const from = Math.min(...bars.filter((p) => p.weightGrams === w.grams).map((p) => p.pricePiastres));
        return (
          <Link className="brand-card" key={w.slug} href={localePath(locale, `/gold-bars/${w.slug}`)}>
            <b>{w.label[locale]}</b>
            <span>{Number.isFinite(from) ? `${t.weight.from} ${pounds(from)} ${t.product.egp}` : fmt(t.brands.pieces, { n: w.productCount })}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/[category]">) {
  const { locale, category } = await params;
  if (!hasLocale(locale)) notFound();
  const slugs = CATEGORY_URLS[category];
  if (!slugs) notFound();
  const [t, entry, raw] = await Promise.all([getTexts(locale), getSeoEntry("category", category), getProducts()]);
  // Every bar under one Bars filter: the hub has small bars merged in (TEC-05).
  const all = mergeBars(raw);
  const products = pick(raw, slugs);
  const bars = category === "gold-bars" ? raw.filter(isBar) : [];
  const weights = category === "gold-bars" ? await getWeightList(raw) : [];
  // The menu links every one of these pages, so each stays up (its filter empty) with none on sale.
  const name = entryH1(entry, locale, pageName(t, locale, category, slugs, mergeBars(products)));
  // The grid gets every piece, with all the shop's filters, and starts on this page's own: the
  // category its pieces are in (whichever of its slugs that is), else an empty filter.
  const initial = mergeBars(products)[0]?.category ?? (slugs[0] === SILVER ? "silver" : slugs[0]);

  return (
    <div className="page buy-page">
      <JsonLd data={products.length ? itemListJsonLd(locale, products.map((p) => ({ name: productName(p, locale), path: `/shop/${p.slug}` }))) : null} />
      <EntryHeadCode entry={entry} />
      <TrackView event="view_item_list" params={{ item_list_id: category, items: products.map((p) => ({ item_id: p.slug, item_name: p.nameEn, weight: p.weightGrams, karat: p.karat, item_brand: p.manufacturerEn })) }} />
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <ShopGrid
              products={all}
              initial={initial}
              heading={{ name, allHref: localePath(locale, "/shop") }}
              intro={<EntryIntro entry={entry} locale={locale} />}
              before={<WeightTiles weights={weights} bars={bars} locale={locale} t={t} />}
            />
            <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
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
