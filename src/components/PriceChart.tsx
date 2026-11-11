"use client";

import { useId, useRef, useState } from "react";
import { fmt } from "@/i18n";
import { trackEvent } from "@/lib/analytics";
import { api } from "@/lib/client-api";
import { cairoDate, cairoTime, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import type { PriceHistory, Prices } from "@/lib/types";
import { useI18n } from "./Providers";
import { Button } from "./controls";

export const PERIOD_DAYS = [1, 7, 30, 90, 180, 365] as const;
const RANGE: Record<number, string> = { 1: "24h", 7: "7d", 30: "30d", 90: "3m", 180: "6m", 365: "1y" };
const W = 640;
const H = 220;

type Point = PriceHistory["points"][number];

/**
 * A published price only moves when staff publish a new one, so the line is drawn in steps,
 * spaced by time: flat until the next publish, then straight to the new price.
 */
function stepPath(points: Point[]): { line: string; x: (at: number) => number; y: (value: number) => number } {
  const start = Date.parse(points[0].at);
  const span = Date.parse(points[points.length - 1].at) - start || 1;
  const values = points.map((p) => p.buyPiastres);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (at: number) => ((at - start) / span) * W;
  // A price that did not move is drawn across the middle, not along the floor.
  const y = (value: number) => (max === min ? H / 2 : H - 14 - ((value - min) / (max - min)) * (H - 40));
  let line = `M0,${y(values[0]).toFixed(1)}`;
  for (const p of points.slice(1)) {
    const px = x(Date.parse(p.at)).toFixed(1);
    line += `H${px}V${y(p.buyPiastres).toFixed(1)}`;
  }
  // Carry the last price to the right edge, so a single price still draws a line.
  return { line: `${line}H${W}`, x, y };
}

/** The price history of one metal, with the period chosen by the visitor. */
export function PriceChart({ metal, initial, initialDays, initialPrices }: { metal: "gold" | "silver"; initial: PriceHistory; initialDays: number; initialPrices: Prices }) {
  const { locale, t } = useI18n();
  const { prices } = useLivePrices({ prices: initialPrices });
  const [days, setDays] = useState(initialDays);
  const [history, setHistory] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<Point | null>(null);
  const asked = useRef(initialDays);
  const gradient = useId();

  async function choose(next: number) {
    if (next !== days) trackEvent("price_chart_range", { range: RANGE[next] });
    setDays(next);
    setFailed(false);
    asked.current = next;
    try {
      const fresh = await api<PriceHistory>(`/prices/history?metal=${metal}&days=${next}`);
      // A slower answer for a period no longer chosen is dropped.
      if (asked.current === next) setHistory(fresh);
    } catch {
      if (asked.current === next) setFailed(true);
    }
  }

  const points = history.points;
  const currentBuy = prices ? (metal === "gold" ? prices.karats.find((k) => k.karat === 21)?.buyPiastres : prices.silver.buyPiastres) : undefined;
  const currentSell = prices ? (metal === "gold" ? prices.karats.find((k) => k.karat === 21)?.sellPiastres : prices.silver.sellPiastres) : undefined;
  const lastHistory = points[points.length - 1];
  const live =
    currentBuy !== undefined && prices && lastHistory && Date.parse(prices.updatedAt) > Date.parse(lastHistory.at)
      ? { at: prices.updatedAt, buyPiastres: currentBuy, sellPiastres: currentSell ?? currentBuy }
      : null;
  const shownPoints = live ? [...points, live] : points;
  const changed = new Set(shownPoints.map((p) => p.buyPiastres)).size > 1;
  const period = t.prices.periods[PERIOD_DAYS.indexOf(days as (typeof PERIOD_DAYS)[number])];
  const first = shownPoints[0];
  const last = shownPoints[shownPoints.length - 1];
  const values = shownPoints.map((p) => p.buyPiastres);
  const change = last && first ? last.buyPiastres - first.buyPiastres : 0;
  const chart = shownPoints.length > 0 ? stepPath(shownPoints) : null;
  const shown = hover ?? last;

  function track(event: React.PointerEvent<SVGSVGElement>) {
    if (!chart || shownPoints.length === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    // Time runs left to right in both languages, like the axis under it.
    const ratio = (event.clientX - box.left) / box.width;
    const start = Date.parse(shownPoints[0].at);
    const at = start + ratio * (Date.parse(shownPoints[shownPoints.length - 1].at) - start);
    // The price in force at that moment: the last point published at or before it.
    setHover(shownPoints.filter((p) => Date.parse(p.at) <= at).pop() ?? shownPoints[0]);
  }

  return (
    <div className="pr-chart">
      <div className="pr-periods" role="group" aria-label={t.prices.periodsLabel}>
        {PERIOD_DAYS.map((d, index) => (
          <Button key={d} type="button" className={`fp${d === days ? " on" : ""}`} aria-pressed={d === days} onClick={() => choose(d)}>
            {t.prices.periods[index]}
          </Button>
        ))}
      </div>

      <div className="pr-stats">
        <div>
          <span>{hover ? `${cairoDate(hover.at, locale)} · ${cairoTime(hover.at)}` : period}</span>
          <b>{shown ? poundsParts(shown.buyPiastres).full : "—"}</b>
        </div>
        <div>
          <span>{t.prices.high}</span>
          <b>{values.length ? poundsParts(Math.max(...values)).full : "—"}</b>
        </div>
        <div>
          <span>{t.prices.low}</span>
          <b>{values.length ? poundsParts(Math.min(...values)).full : "—"}</b>
        </div>
        <div>
          <span>{t.prices.change}</span>
          <b className={change < 0 ? "down" : change > 0 ? "up" : undefined}>
            {change > 0 ? "+" : change < 0 ? "−" : ""}
            {poundsParts(Math.abs(change)).full}
          </b>
        </div>
      </div>

      {chart ? (
        <svg
          className="pr-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={fmt(t.prices.chartLabel, {
            period,
            start: poundsParts(first.buyPiastres).full,
            end: poundsParts(last.buyPiastres).full,
          })}
          onPointerMove={track}
          onPointerDown={track}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#C6A362" stopOpacity=".32" />
              <stop offset="1" stopColor="#C6A362" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} className="pr-grid" x1="0" x2={W} y1={H * f} y2={H * f} />
          ))}
          <path d={`${chart.line}V${H}H0Z`} fill={`url(#${gradient})`} />
          <path d={chart.line} className="pr-line" vectorEffect="non-scaling-stroke" />
          {hover ? <line className="pr-guide" x1={chart.x(Date.parse(hover.at))} x2={chart.x(Date.parse(hover.at))} y1="0" y2={H} vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      ) : null}

      <div className="pr-axis">
        <span>{first ? cairoDate(first.at, locale) : ""}</span>
        <span>{last ? cairoDate(last.at, locale) : ""}</span>
      </div>
      {failed ? <p className="pr-note" role="alert">{t.prices.loadError}</p> : !changed ? <p className="pr-note">{t.prices.noHistory}</p> : null}
      <p className="pr-note">{t.prices.chartNote}</p>
    </div>
  );
}
