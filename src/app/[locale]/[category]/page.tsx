import type { Metadata } from "next";
import { localePath } from "@/i18n";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ShopGrid } from "@/components/ShopGrid";
import { hasLocale, type Locale } from "@/i18n";
import { isSilver } from "@/lib/kinds";
import { CATEGORY_URLS, SHOP_LINKS, SILVER } from "@/lib/shop-links";
import { getTexts } from "@/lib/site-texts";
import { getProducts } from "@/lib/server-api";
import type { Product } from "@/lib/types";

/** The page's pieces: silver by its metal, else those of any of the page's category slugs. */
const pick = (products: Product[], slugs: readonly string[]) =>
  products.filter((p) => (slugs[0] === SILVER ? isSilver(p) : slugs.includes(p.category)));

/**
 * The heading: the category's own name from the catalogue, else (silver, or a category with no
 * piece on sale right now) the menu's name for the link, so a link in the menu never leads nowhere.
 */
async function pageName(locale: Locale, url: string, slugs: readonly string[], products: Product[]): Promise<string> {
  if (slugs[0] !== SILVER && products.length > 0) {
    return locale === "ar" ? products[0].categoryNameAr : products[0].categoryNameEn;
  }
  const link = SHOP_LINKS.find((l) => l.path === `/${url}`);
  const nav = (await getTexts(locale)).nav;
  return link ? nav[link.label] : nav.shop;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[category]">): Promise<Metadata> {
  const { locale, category } = await params;
  if (!hasLocale(locale) || !CATEGORY_URLS[category]) return {};
  const slugs = CATEGORY_URLS[category];
  const name = await pageName(locale, category, slugs, pick(await getProducts(), slugs));
  return { title: `${name} · GoldGram` };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/[category]">) {
  const { locale, category } = await params;
  if (!hasLocale(locale)) notFound();
  const slugs = CATEGORY_URLS[category];
  if (!slugs) notFound();
  const t = await getTexts(locale);
  const all = await getProducts();
  const products = pick(all, slugs);
  // The menu links every one of these pages, so each stays up (its filter empty) with none on sale.
  const name = await pageName(locale, category, slugs, products);
  // The grid gets every piece, with all the shop's filters, and starts on this page's own: the
  // category its pieces are in (whichever of its slugs that is), else an empty filter.
  const initial = products[0]?.category ?? (slugs[0] === SILVER ? "silver" : slugs[0]);

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <ShopGrid products={all} initial={initial} heading={{ name, allHref: localePath(locale, "/shop") }} />
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
