"use client";

import { useState, type ReactNode } from "react";
import { fmt, type Dict, type Locale } from "@/i18n";
import { cairoTime, changeLine, changeParts, pounds, poundsParts, weightText } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import type { Prices, Spot } from "@/lib/types";
import { TradingViewChart } from "./TradingViewChart";

type Board = Dict["board"];

const usd = (value: number, digits: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

/** A number that glows green or red for a moment when it moves, like a dealing screen. */
function Tick({ value, children }: { value: number; children: ReactNode }) {
  const [last, setLast] = useState(value);
  const [move, setMove] = useState<{ dir: "up" | "down"; n: number } | null>(null);
  if (value !== last) {
    setLast(value);
    setMove({ dir: value > last ? "up" : "down", n: (move?.n ?? 0) + 1 });
  }
  return (
    <span key={move?.n ?? 0} className={move ? `tick ${move.dir}` : "tick"}>
      {children}
    </span>
  );
}

/** First phone: today's local prices, straight from the price board. */
function BoardPhone({ prices, board, karat, locale }: { prices: Prices | null; board: Board; karat: string; locale: Locale }) {
  const k24 = prices?.karats.find((k) => k.karat === 24);
  const head = k24 ? poundsParts(k24.buyPiastres) : null;
  const change = k24 ? changeLine(k24.changePct, locale, board.todayWord) : null;
  const [before, after] = karat.split("{k}");

  return (
    <div className="phone">
      <div className="screen">
        <div className="sc-head">
          <span className="sc-kick">{board.today}</span>
          <b>
            {head && k24 ? (
              <Tick value={k24.buyPiastres}>
                {head.int}
                <u>.{head.dec}</u>
              </Tick>
            ) : (
              "—"
            )}
          </b>
          <em>{board.unit24}</em>
          {change && <span className={`sc-chg${change.down ? " down" : ""}`}>{change.text}</span>}
        </div>

        <div className="sc-table">
          <div className="sc-hrow">
            <span>{board.perGram}</span>
            <i>{board.buy}</i>
            <i>{board.sell}</i>
          </div>
          {prices?.karats.map((k) => (
            <div className="sc-row" key={k.karat}>
              <span>
                {before}
                {k.karat}
                {after && <u>{after}</u>}
              </span>
              <b>
                <Tick value={k.buyPiastres}>{poundsParts(k.buyPiastres).full}</Tick>
              </b>
              <em>
                <Tick value={k.sellPiastres}>{poundsParts(k.sellPiastres).full}</Tick>
              </em>
            </div>
          ))}
          {prices?.units.map((u) => (
            <div className="sc-row sc-unit" key={u.unit}>
              <span>
                {u.unit === "ounce" ? board.ounce : board.pound}
                <u>{fmt(board.unitWeight, { w: weightText(u.weightGrams) })}</u>
              </span>
              <b>
                <Tick value={u.buyPiastres}>{pounds(u.buyPiastres)}</Tick>
              </b>
              <em>
                <Tick value={u.sellPiastres}>{pounds(u.sellPiastres)}</Tick>
              </em>
            </div>
          ))}
        </div>

        <div className="sc-foot">
          {prices ? (
            <>
              <span className="live" />
              {board.indicative} · {cairoTime(prices.updatedAt)}
            </>
          ) : (
            board.unavailable
          )}
        </div>
      </div>
    </div>
  );
}

/** Second phone: the international ounce, live, over TradingView's chart of spot gold. */
function IntlPhone({ spot, board, locale }: { spot: Spot | null; board: Board; locale: Locale }) {
  const [int, dec] = spot ? usd(spot.priceUsd, 2).split(".") : [];
  const down = (spot?.changePct ?? 0) < 0;
  const move =
    spot?.changeUsd != null && spot.changePct != null
      ? { usd: usd(Math.abs(spot.changeUsd), 2), pct: changeParts(spot.changePct) }
      : null;

  return (
    <div className="phone">
      <div className="screen">
        <div className="sc-head">
          <span className="sc-kick">{board.intl}</span>
          <b>
            {spot ? (
              <Tick value={spot.priceUsd}>
                {int}
                <u>.{dec}</u>
              </Tick>
            ) : (
              "—"
            )}
          </b>
          <em>{board.usdOunce}</em>
          {move && (
            <span className={`sc-chg${down ? " down" : ""}`} dir="ltr">
              {move.pct.arrow} {move.pct.value} · {move.usd}
            </span>
          )}
        </div>

        <TradingViewChart locale={locale} credit={board.chartBy}>
          <div className="tv-quote" dir="ltr">
            {spot ? (
              <>
                <Tick value={spot.priceUsd}>{usd(spot.priceUsd, 3)}</Tick>
                {move && (
                  <em className={down ? undefined : "up"}>
                    {down ? "−" : "+"}
                    {move.usd} ({down ? "−" : "+"}
                    {move.pct.value})
                  </em>
                )}
              </>
            ) : (
              "—"
            )}
          </div>
        </TradingViewChart>

        <div className="sc-foot">
          {spot ? (
            <>
              <span className="live" />
              {board.spot} · {cairoTime(spot.at)}
            </>
          ) : (
            board.unavailable
          )}
        </div>
      </div>
    </div>
  );
}

export function Phones({
  prices: initial,
  spot: initialSpot,
  board,
  karat,
  locale,
}: {
  prices: Prices | null;
  spot: Spot | null;
  board: Board;
  karat: string;
  locale: Locale;
}) {
  const { prices, spot } = useLivePrices({ prices: initial, spot: initialSpot });
  return (
    <div className="phones">
      <BoardPhone prices={prices} board={board} karat={karat} locale={locale} />
      <IntlPhone spot={spot} board={board} locale={locale} />
    </div>
  );
}
