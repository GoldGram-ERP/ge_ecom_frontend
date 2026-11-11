import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { SiteHeader } from "@/components/header-client";
import { ViewItem } from "@/components/analytics";
import { StoreButtons } from "@/components/chrome";
import { PdpCompare, PdpFaq, PdpRelated } from "@/components/pdp-live";
import { EntryFaq, EntryHeadCode, entryH1 } from "@/components/seo-blocks";
import { PdpPrice } from "@/components/PdpPrice";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductTabs } from "@/components/ProductTabs";
import { fmt, hasLocale } from "@/i18n";
import { artClass, artStyle, buybackPiastres, karatLabel, pounds, poundsParts, productName, productPurity, productSub, weightLabel, weightText } from "@/lib/format";
import { absoluteUrl, breadcrumbList, jsonLd, productJsonLd } from "@/lib/seo";
import { cairoToday, egp, getBusiness, getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { filterPath } from "@/lib/shop-links";
import type { Product } from "@/lib/types";
import { getTexts } from "@/lib/site-texts";
import { getPricesOrNull, getProducts } from "@/lib/server-api";

// The catalogue is small and public, so a piece is found in the same list the shop shows:
// no endpoint of its own, and a hidden or unknown piece is a 404 like any other address.
// The handle is the slug (btc-gold-bar-10g-24k); an old numeric id still resolves, to be redirected.
const findProduct = cache(async (handle: string) => {
  const products = await getProducts();
  const product = products.find((p) => p.slug === handle) ?? products.find((p) => String(p.id) === handle);
  if (!product) return null;
  // The drawn piece grows with its position inside its category, as on the shop grid.
  const rank = products.filter((p) => p.category === product.category).indexOf(product);
  // The same weight, karat and kind from other makers: the comparison table, cheapest first.
  const sameWeight = products
    .filter((p) => p.category === product.category && p.karat === product.karat && p.weightGrams === product.weightGrams)
    .sort((a, b) => a.pricePiastres - b.pricePiastres);
  // Other pieces of its kind, nearest weights first: the cards at the foot of the page.
  const related = products
    .filter((p) => p.category === product.category && !sameWeight.includes(p))
    .sort((a, b) => Math.abs(a.weightGrams - product.weightGrams) - Math.abs(b.weightGrams - product.weightGrams))
    .slice(0, 4);
  return { product, rank, sameWeight, related };
});

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(locale)) return {};
  const found = await findProduct(id);
  if (!found) return {};
  const { product: p } = found;
  const prices = await getPricesOrNull();
  const first = p.imageIds[0];
  // The template's values are the ones the page shows: the total, and the making charge per gram (DSH-02).
  return seoMetadata({
    locale,
    path: `/shop/${p.slug}`,
    type: "product",
    entryType: "product",
    key: p.slug,
    vars: {
      ...priceVars(prices, locale),
      name: productName(p, locale),
      price_buy: egp(p.pricePiastres),
      price: egp(p.pricePiastres),
      making_per_gram: egp(p.laborPiastres / p.weightGrams),
      weight: weightText(p.weightGrams),
      karat: (p.karat as number) === 999 ? "999" : String(p.karat),
      brand: locale === "ar" ? p.manufacturerAr : p.manufacturerEn,
    },
    image: first ? absoluteUrl("ar", `/api/products/${p.id}/images/${first}`) : undefined,
    imageAlt: altOf(p, first, locale, 0),
  });
}

/**
 * A photo's alt text (MED-01): the dashboard's, "" for a decorative one, else the product's name
 * with the photo's number after the first.
 */
function altOf(p: Product, imageId: number | undefined, locale: "ar" | "en", index: number): string {
  const own = p.imageAlts?.find((a) => a.id === imageId);
  if (own?.decorative) return "";
  const name = productName(p, locale);
  return own?.[locale]?.trim() || (index === 0 ? name : `${name} (${index + 1})`);
}

const money = (piastres: number) => poundsParts(piastres).full;

export default async function ProductPage({ params }: PageProps<"/[locale]/shop/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const found = await findProduct(id);
  if (!found) notFound();
  // Reached by the old numeric id (or any non-canonical handle): send on to the name URL, once.
  if (found.product.slug !== id) permanentRedirect(localePath(locale, `/shop/${found.product.slug}`));
  const [t, prices, entry, business] = await Promise.all([getTexts(locale), getPricesOrNull(), getSeoEntry("product", id), getBusiness()]);
  const { product: p, rank, sameWeight, related } = found;
  const name = productName(p, locale);
  const maker = locale === "ar" ? p.manufacturerAr : p.manufacturerEn;
  const description = locale === "ar" ? p.descriptionAr : p.descriptionEn;
  const kind = (locale === "ar" ? p.categoryNameAr : p.categoryNameEn) || null;
  // Silver is priced at 999, which the shop's karat type does not list.
  const silver = (p.karat as number) === 999;
  const shop = localePath(locale, `/shop`);
  const buyback = buybackPiastres(p, prices);
  const kindPath = filterPath(p.category);

  const specs: [string, string][] = [
    ...(kind ? ([[t.pdp.specType, kind]] as [string, string][]) : []),
    ...(maker ? ([[t.pdp.specMaker, maker]] as [string, string][]) : []),
    [t.pdp.specWeight, weightLabel(p.weightGrams, t)],
    [t.pdp.specKarat, silver ? "999" : karatLabel(p.karat, t)],
    [t.pdp.specPurity, productPurity(p, t)],
    [t.pdp.specPackaging, t.pdp.specPackagingValue],
  ];

  return (
    <div className="page buy-page">
      {/* Product + Offer (price = the total shown on the page, availability follows stock) and the visible trail. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            productJsonLd({
              name,
              description: (description || productSub(p, t)).replace(/\s+/g, " ").trim(),
              url: absoluteUrl(locale, `/shop/${p.slug}`),
              images: p.imageIds.map((imageId) => absoluteUrl("ar", `/api/products/${p.id}/images/${imageId}`)),
              brand: maker ?? "",
              weightGrams: p.weightGrams,
              pricePiastres: p.pricePiastres,
              inStock: p.inStock !== false,
              sku: p.slug,
              karat: p.karat,
              purity: productPurity(p, t),
              makingPerGramPiastres: Math.round(p.laborPiastres / p.weightGrams),
              seller: business.siteName[locale],
              priceValidUntil: cairoToday(),
            }),
            // The same steps as the visible trail (SCH-03).
            breadcrumbList([
              { name: t.pdp.home, path: "/", locale },
              { name: t.nav.shop, path: "/shop", locale },
              ...(kind ? [{ name: kind, path: kindPath, locale }] : []),
              { name: entry?.breadcrumbLabel?.[locale] || name, path: `/shop/${p.slug}`, locale },
            ]),
          ]),
        }}
      />
      <EntryHeadCode entry={entry} />
      <ViewItem product={p} />
      <SiteHeader />

      <div className="band-off pdp-band">
        <div className="wrap">
          <nav className="pdp-crumbs" aria-label={t.pdp.breadcrumb}>
            <Link href={localePath(locale, ``)}>{t.pdp.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href={shop}>{t.nav.shop}</Link>
            {kind ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={localePath(locale, kindPath)}>{kind}</Link>
              </>
            ) : null}
            <span aria-hidden="true">/</span>
            <span aria-current="page">{entry?.breadcrumbLabel?.[locale] || name}</span>
          </nav>

          <article className="pdp">
            {p.imageIds.length > 0 ? (
              <ProductGallery productId={p.id} imageIds={p.imageIds} name={name} alts={p.imageIds.map((imageId, i) => altOf(p, imageId, locale, i))} />
            ) : (
              <div className="pdp-gallery">
                <div className="niche pdp-niche">
                  <div className="stand" />
                  <div className="obj">
                    <div className={artClass(p.category)} style={artStyle(p.category, rank)} />
                  </div>
                </div>
              </div>
            )}

            <div className="pdp-info">
              {maker ? <p className="pdp-maker">{fmt(t.pdp.by, { maker })}</p> : null}
              <h1 className="pdp-name">{entryH1(entry, locale, name)}</h1>
              <p className="pdp-sub">{productSub(p, t)}</p>
              <PdpPrice product={p} prices={prices} />
              {/* Buyback as information, selling in the app (SELL-02), with the store badges once set (SELL-04). */}
              {buyback !== null ? (
                <p className="pdp-note">
                  {fmt(t.pdp.buybackLine, { amount: pounds(buyback) })} <Link href={localePath(locale, "/app")}>{t.pdp.buybackApp}</Link>
                </p>
              ) : null}
              <StoreButtons t={t} placement="product" />

              <ProductBuy product={p} />
              <p className={`pdp-stock${p.inStock === false ? " out" : ""}`}>{p.inStock === false ? t.pdp.soldOut : t.pdp.inStock}</p>
            </div>
          </article>

          <div className="assure">
            {t.shop.assure.map((item) => (
              <div className="as" key={item.t}>
                <span>{item.t}</span>
                <p>{item.d}</p>
              </div>
            ))}
          </div>

          <ProductTabs
            tabs={[
              {
                label: t.pdp.tabDetails,
                panel: (
                  <div className="pdp-details">
                    <div>
                      <h2>{t.pdp.about}</h2>
                      <p>{description || productSub(p, t)}</p>
                    </div>
                    <div>
                      <h2>{t.pdp.specs}</h2>
                      <dl className="pdp-specs">
                        {specs.map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                ),
              },
              { label: t.pdp.tabMaking, panel: <p className="pdp-text">{fmt(t.pdp.makingText, { making: money(p.laborPiastres) })}</p> },
              { label: t.pdp.tabDelivery, panel: <p className="pdp-text">{t.pdp.deliveryText}</p> },
            ]}
          />

          <PdpCompare product={p} sameWeight={sameWeight} />

          <section className="pdp-section" aria-labelledby="pdp-faq">
            <h2 id="pdp-faq">{fmt(t.pdp.faqTitle, { name })}</h2>
            <PdpFaq product={p} prices={prices} />
          </section>
          <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} className="pdp-section" />


          {related.length > 0 ? (
            <section className="pdp-section" aria-labelledby="pdp-related">
              <h2 id="pdp-related">{t.pdp.related}</h2>
              <PdpRelated related={related} />
            </section>
          ) : null}

          <p className="buy-note">{t.shop.note}</p>
        </div>
      </div>
    </div>
  );
}
