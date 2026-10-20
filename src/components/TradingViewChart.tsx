"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n";
import { Button } from "./controls";

// TradingView's own chart of spot gold. The phone is drawn at half size, so the widget is
// laid out at twice the box and scaled down with it (.tv-frame in site.css).
const SCRIPT = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
const INTERVALS = [
  ["60", "1H"],
  ["D", "D"],
  ["W", "W"],
  ["M", "M"],
] as const;
type Interval = (typeof INTERVALS)[number][0];

/** The chart card of the second phone: timeframe tabs, the live quote (children), the chart and its credit. */
export function TradingViewChart({
  locale,
  credit,
  children,
}: {
  locale: Locale;
  credit: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [interval, setTf] = useState<Interval>("D");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: "OANDA:XAUUSD",
      interval,
      timezone: "Africa/Cairo",
      theme: "dark",
      style: "1",
      locale: locale === "ar" ? "ar_AE" : "en",
      backgroundColor: "#0E1B32",
      gridColor: "rgba(231, 210, 160, 0.08)",
      hide_top_toolbar: true,
      hide_side_toolbar: true,
      hide_legend: true,
      hide_volume: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    el.replaceChildren(widget, script);
    return () => el.replaceChildren();
  }, [interval, locale]);

  return (
    <div className="sc-tv">
      <div className="tv-top">
        <span className="tv-sym">GOLD</span>
        <span className="tv-tf" dir="ltr">
          {INTERVALS.map(([value, text]) => (
            <Button
              key={value}
              type="button"
              className={interval === value ? "on" : undefined}
              aria-pressed={interval === value}
              onClick={() => setTf(value)}
            >
              {text}
            </Button>
          ))}
        </span>
      </div>
      {children}
      <div className="tv-frame" dir="ltr">
        <div className="tv-scale">
          <div ref={box} className="tradingview-widget-container" />
        </div>
      </div>
      <a className="tv-by" href="https://www.tradingview.com/symbols/XAUUSD/" target="_blank" rel="noopener nofollow">
        {credit}
      </a>
    </div>
  );
}
