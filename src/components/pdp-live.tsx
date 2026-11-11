"use client";

import Image from "next/image";
import Link from "next/link";
import { MiniArt } from "@/components/chrome";
import { FaqList } from "@/components/home-client";
import { fmt, localePath } from "@/i18n";
import { buybackPiastres, cairoTime, pounds, poundsParts, productName, productSub, weightLabel } from "@/lib/format";
import { LISTS, selectItem } from "@/lib/analytics";
import { useLivePrices } from "@/lib/live-prices";
import { useLiveProducts } from "@/lib/live-products";
import type { Prices, Product } from "@/lib/types";
import { useListView } from "./analytics";
import { useI18n } from "./Providers";

const money = (piastres: number) => poundsParts(piastres).full;

/** The product page's price questions, kept in step with the live product and board. */
export function PdpFaq({ product, prices: initialPrices }: { product: Product; prices: Prices | null }) {
  const { t, locale } = useI18n();
  const [p] = useLiveProducts([product]);
  const { prices } = useLivePrices({ prices: initialPrices ?? undefined });
  const name = productName(p, locale);
  const time = prices ? cairoTime(prices.updatedAt) : "";
  const withPack = buybackPiastres(p, prices, "with");
  const withoutPack = buybackPiastres(p, prices, "without");
  const faq = [
    {
      q: fmt(t.pdp.faqPrice, { name }),
      a: fmt(t.pdp.faqPriceA, { price: pounds(p.pricePiastres), time, metal: money(p.metalPiastres), making: money(p.laborPiastres) }),
    },
    // Selling back is in the app (SELL-03): today's buyback figures when the board is known.
    {
      q: t.pdp.faqSell,
      a:
        withPack !== null && withoutPack !== null
          ? fmt(t.pdp.faqSellA, { with: pounds(withPack), without: pounds(withoutPack) })
          : t.pdp.faqSellNone,
    },
    { q: t.pdp.faqGet, a: t.pdp.faqGetA },
    { q: t.pdp.faqMakers, a: t.pdp.faqMakersA },
  ];
  return <FaqList items={faq} id="pdp-faq-list" />;
}

/** The same piece from other makers, re-sorted and re-priced as the board moves. */
export function PdpCompare({ product, sameWeight }: { product: Product; sameWeight: Product[] }) {
  const { t, locale } = useI18n();
  const rows = useLiveProducts(sameWeight).sort((a, b) => a.pricePiastres - b.pricePiastres);
  useListView(rows.length < 2 ? undefined : LISTS.pdpSameWeight, rows);
  if (rows.length < 2) return null;
  const shop = localePath(locale, `/shop`);

  return (
    <section className="pdp-section" aria-labelledby="pdp-compare">
      <h2 id="pdp-compare">{fmt(t.pdp.compare, { w: weightLabel(product.weightGrams, t) })}</h2>
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
            {rows.map((other, index) => (
              <tr key={other.id} className={other.id === product.id ? "this" : undefined}>
                <th scope="row">
                  {(locale === "ar" ? other.manufacturerAr : other.manufacturerEn) || productName(other, locale)}
                  {index === 0 ? <em className="pdp-tag">{t.pdp.bestPrice}</em> : null}
                </th>
                <td>
                  {pounds(other.pricePiastres)} <small>{t.product.egp}</small>
                </td>
                <td>{money(other.laborPiastres)}</td>
                <td>
                  {other.id === product.id ? (
                    <span className="pdp-this">{t.pdp.thisOne}</span>
                  ) : (
                    <Link className="pdp-view" href={`${shop}/${other.slug}`} onClick={() => selectItem(other, LISTS.pdpSameWeight, index)}>
                      {t.pdp.view}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link className="pdp-view cmp-more" href={localePath(locale, "/making-charges")}
>
        {t.compare.link}
      </Link>
    </section>
  );
}

/** The related pieces at the foot of the product page, with their live prices. */
export function PdpRelated({ related }: { related: Product[] }) {
  const { t, locale } = useI18n();
  const rows = useLiveProducts(related);
  useListView(LISTS.pdpOtherWeights, rows);
  const shop = localePath(locale, `/shop`);
  return (
    <div className="pdp-related">
      {rows.map((other, index) => (
        <Link className="pdp-card" href={`${shop}/${other.slug}`} key={other.id} onClick={() => selectItem(other, LISTS.pdpOtherWeights, index)}>
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
  );
}
