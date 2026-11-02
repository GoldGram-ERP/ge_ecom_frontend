"use client";

import Link from "next/link";
import { MiniArt } from "@/components/chrome";
import { localePath } from "@/i18n";
import { changeLine, changeParts, karatLabel, pounds, poundsParts, productShortName } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import { useLiveProducts } from "@/lib/live-products";
import type { Prices, Product } from "@/lib/types";
import { useI18n } from "./Providers";

/** The account crown's “live gold price” and today's move. */
export function AccountCrown({ prices: initial }: { prices: Prices }) {
  const { t, locale } = useI18n();
  const { prices } = useLivePrices({ prices: initial });
  const k24 = prices?.karats.find((k) => k.karat === 24) ?? prices?.karats[0];
  if (!k24) return null;
  const change = changeLine(k24.changePct, locale, t.account.today);
  return (
    <>
      <div className="ac-price">{poundsParts(k24.buyPiastres).full}</div>
      <div className="ac-chg" style={change.down ? { color: "#E79A8E" } : undefined}>
        {change.text}
      </div>
    </>
  );
}

/** The popular pieces on the account home, with their live prices and karat moves. */
export function AccountPopular({ products: rendered, prices: initial }: { products: Product[]; prices: Prices }) {
  const { t, locale } = useI18n();
  const products = useLiveProducts(rendered);
  const { prices } = useLivePrices({ prices: initial });
  const shop = localePath(locale, `/shop`);
  return (
    <>
      {products.map((p) => {
        const move = changeParts(prices?.karats.find((k) => k.karat === p.karat)?.changePct ?? 0);
        return (
          <Link className="pc" href={`${shop}/${p.id}`} key={p.id}>
            <MiniArt category={p.category} />
            <b>{productShortName(p, t)}</b>
            <i>
              {pounds(p.pricePiastres)} <small className="egp">{t.product.egp}</small>
            </i>
            {p.category === "bar" ? (
              <em style={move.down ? { color: "#C0452B" } : undefined}>
                {move.down ? "↓" : "↑"} {move.value}
              </em>
            ) : (
              <em className="muted">{karatLabel(p.karat, t)}</em>
            )}
          </Link>
        );
      })}
    </>
  );
}
