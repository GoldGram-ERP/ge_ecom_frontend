import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { MiniArt } from "@/components/chrome";
import { SiteHeader } from "@/components/header-client";
import { FaqList } from "@/components/home-client";
import { PdpPrice } from "@/components/PdpPrice";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductTabs } from "@/components/ProductTabs";
import { fmt, hasLocale } from "@/i18n";
import { artClass, artStyle, cairoTime, karatLabel, pounds, poundsParts, productName, productPurity, productSub, weightLabel } from "@/lib/format";
import { getTexts } from "@/lib/site-texts";
import { getPricesOrNull, getProducts } from "@/lib/server-api";
import type { Product } from "@/lib/types";

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
  const t = await getTexts(locale);
  const { product } = found;
  const description = locale === "ar" ? product.descriptionAr : product.descriptionEn;
  return { title: `${productName(product, locale)} · GoldGram`, description: description || productSub(product, t) };
}

const money = (piastres: number) => poundsParts(piastres).full;

export default async function ProductPage({ params }: PageProps<"/[locale]/shop/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const found = await findProduct(id);
  if (!found) notFound();
  // Reached by the old numeric id (or any non-canonical handle): send on to the name URL, once.
  if (found.product.slug !== id) permanentRedirect(localePath(locale, `/shop/${found.product.slug}`));
  const [t, prices] = await Promise.all([getTexts(locale), getPricesOrNull()]);
  const { product: p, rank, sameWeight, related } = found;
  const name = productName(p, locale);
  const maker = locale === "ar" ? p.manufacturerAr : p.manufacturerEn;
  const description = locale === "ar" ? p.descriptionAr : p.descriptionEn;
  const time = prices ? cairoTime(prices.updatedAt) : "";
  const kind = (locale === "ar" ? p.categoryNameAr : p.categoryNameEn) || null;
  // Silver is priced at 999, which the shop's karat type does not list.
  const silver = (p.karat as number) === 999;
  const shop = localePath(locale, `/shop`);
  const link = (product: Product) => `${shop}/${product.slug}`;

  const specs: [string, string][] = [
    ...(kind ? ([[t.pdp.specType, kind]] as [string, string][]) : []),
    ...(maker ? ([[t.pdp.specMaker, maker]] as [string, string][]) : []),
    [t.pdp.specWeight, weightLabel(p.weightGrams, t)],
    [t.pdp.specKarat, silver ? "999" : karatLabel(p.karat, t)],
    [t.pdp.specPurity, productPurity(p, t)],
    [t.pdp.specPackaging, t.pdp.specPackagingValue],
  ];
  const faq = [
    {
      q: fmt(t.pdp.faqPrice, { name }),
      a: fmt(t.pdp.faqPriceA, { price: pounds(p.pricePiastres), time, metal: money(p.metalPiastres), making: money(p.laborPiastres) }),
    },
    // The stored buy-back amounts are fixed when a product is made and go stale as gold moves
    // (and some live ones are mistyped), so no amount is promised here until they follow the price.
    { q: t.pdp.faqSell, a: t.pdp.faqSellNone },
    { q: t.pdp.faqGet, a: t.pdp.faqGetA },
    { q: t.pdp.faqMakers, a: t.pdp.faqMakersA },
  ];

  return (
    <div className="page buy-page">
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
                <Link href={`${shop}?c=${p.category}`}>{kind}</Link>
              </>
            ) : null}
            <span aria-hidden="true">/</span>
            <span aria-current="page">{name}</span>
          </nav>

          <article className="pdp">
            {p.imageIds.length > 0 ? (
              <ProductGallery productId={p.id} imageIds={p.imageIds} name={name} />
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
              <h1 className="pdp-name">{name}</h1>
              <p className="pdp-sub">{productSub(p, t)}</p>
              <PdpPrice product={p} note={time ? <p className="pdp-note">{fmt(t.pdp.priceNote, { time })}</p> : null} />

              <ProductBuy productId={p.id} inStock={p.inStock !== false} stock={p.stock} />
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

          {sameWeight.length > 1 ? (
            <section className="pdp-section" aria-labelledby="pdp-compare">
              <h2 id="pdp-compare">{fmt(t.pdp.compare, { w: weightLabel(p.weightGrams, t) })}</h2>
              <div className="pdp-table-wrap">
                <table className="pdp-table">
                  <thead>
                    <tr>
                      <th scope="col">{t.pdp.compareMaker}</th>
                      <th scope="col">{t.pdp.comparePrice}</th>
                      <th scope="col">{t.pdp.compareMaking}</th>
                      <th scope="col">
                        <span className="vh">{t.pdp.view}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sameWeight.map((other, index) => (
                      <tr key={other.id} className={other.id === p.id ? "this" : undefined}>
                        <th scope="row">
                          {(locale === "ar" ? other.manufacturerAr : other.manufacturerEn) || productName(other, locale)}
                          {index === 0 ? <em className="pdp-tag">{t.pdp.bestPrice}</em> : null}
                        </th>
                        <td>
                          {pounds(other.pricePiastres)} <small>{t.product.egp}</small>
                        </td>
                        <td>{money(other.laborPiastres)}</td>
                        <td>
                          {other.id === p.id ? (
                            <span className="pdp-this">{t.pdp.thisOne}</span>
                          ) : (
                            <Link className="pdp-view" href={link(other)}>
                              {t.pdp.view}
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link className="pdp-view cmp-more" href={localePath(locale, `/compare?g=${p.category}-${p.karat}-${p.weightGrams}`)}>
                {t.compare.link}
              </Link>
            </section>
          ) : null}

          <section className="pdp-section" aria-labelledby="pdp-faq">
            <h2 id="pdp-faq">{fmt(t.pdp.faqTitle, { name })}</h2>
            <FaqList items={faq} id="pdp-faq-list" />
          </section>

          {related.length > 0 ? (
            <section className="pdp-section" aria-labelledby="pdp-related">
              <h2 id="pdp-related">{t.pdp.related}</h2>
              <div className="pdp-related">
                {related.map((other) => (
                  <Link className="pdp-card" href={link(other)} key={other.id}>
                    <div className="pdp-card-art">
                      {other.imageIds[0] ? (
                        <Image unoptimized src={`/api/products/${other.id}/images/${other.imageIds[0]}`} alt="" width={240} height={240} loading="lazy" />
                      ) : (
                        <MiniArt category={other.category} />
                      )}
                    </div>
                    <b>{productName(other, locale)}</b>
                    <span>{productSub(other, t)}</span>
                    <span className="pc-price">
                      {pounds(other.pricePiastres)}
                      <u>{t.product.egp}</u>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <p className="buy-note">{t.shop.note}</p>
        </div>
      </div>
    </div>
  );
}
