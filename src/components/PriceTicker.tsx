"use client";

import Link from "next/link";
import { fmt } from "@/i18n";
import { changeParts, pounds, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import type { Prices } from "@/lib/types";
import { useI18n } from "./Providers";

type Item = { key: string; name: string; value: string; pct: number | null };

const usd = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * The live price strip above every page's header: gold per gram by karat, the pound and the
 * ounce in pounds, silver, and the international ounce in dollars. It follows the price stream,
 * so a publish in the dashboard shows here at once. It opens the prices page.
 */
export function PriceTicker({ initial }: { initial: Prices | null }) {
  const { t, href } = useI18n();
  const { prices, spot } = useLivePrices({ prices: initial });

  const items: Item[] = [
    ...(prices?.karats ?? []).map((k) => ({
      key: `k${k.karat}`,
      name: fmt(t.product.karat, { k: k.karat }),
      value: poundsParts(k.buyPiastres).full,
      pct: k.changePct,
    })),
    ...(prices?.units ?? []).map((u) => ({
      key: u.unit,
      name: u.unit === "ounce" ? t.board.ounce : t.board.pound,
      value: pounds(u.buyPiastres),
      pct: null,
    })),
    ...(prices ? [{ key: "silver", name: t.prices.silverCard, value: poundsParts(prices.silver.buyPiastres).full, pct: null }] : []),
    ...(spot ? [{ key: "spot", name: t.board.intl, value: `$${usd.format(spot.priceUsd)}`, pct: spot.changePct }] : []),
  ];

  const row = (copy: number) =>
    items.map((item) => {
      const change = item.pct === null ? null : changeParts(item.pct);
      return (
        <span className="tk-item" key={`${copy}-${item.key}`}>
          <span className="tk-name">{item.name}</span>
          <b dir="ltr">{item.value}</b>
          {change && (
            <i className={change.down ? "down" : item.pct === 0 ? "flat" : "up"} dir="ltr">
              {change.arrow} {change.value}
            </i>
          )}
        </span>
      );
    });

  return (
    <Link className="ticker" href={href("/prices")} aria-label={t.prices.nav}>
      {items.length > 0 && (
        <span className="tk-track">
          <span className="tk-run">{row(0)}</span>
          {/* the second copy makes the loop seamless; screen readers hear the prices once */}
          <span className="tk-run" aria-hidden="true">
            {row(1)}
          </span>
        </span>
      )}
    </Link>
  );
}
