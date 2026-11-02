"use client";

import { useState } from "react";
import { fmt } from "@/i18n";
import { cairoTime, karatLabel, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import type { Karat, Prices } from "@/lib/types";
import { NISAB_SILVER_GRAMS, ZAKAT_KARATS, ZAKAT_PERCENT, zakatOf } from "@/lib/zakat";
import { useI18n } from "./Providers";

const money = (piastres: number) => poundsParts(piastres).full;

/** The gold nisab as three equal karat figures; the due check still uses 97 g at 21K. */
const NISAB_GOLD_BY_KARAT: readonly { karat: Karat; grams: number }[] = [
  { karat: 24, grams: 85 },
  { karat: 21, grams: 97 },
  { karat: 18, grams: 113 },
];

/** A typed amount: empty is nothing, a negative or unreadable one is flagged and counted as nothing. */
function read(text: string): { value: number; bad: boolean } {
  if (text.trim() === "") return { value: 0, bad: false };
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value >= 0 && value <= 1e9 ? { value, bad: false } : { value: 0, bad: true };
}

function Amount({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const { t } = useI18n();
  const { bad } = read(value);
  return (
    <label className="f">
      <span>{label}</span>
      <input
        id={id}
        className={bad ? "bad" : undefined}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        dir="ltr"
        placeholder="0"
        value={value}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${id}-err` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {bad ? (
        <em className="zk-err" id={`${id}-err`}>
          {t.zakat.invalid}
        </em>
      ) : hint ? (
        <em className="zk-hint">{hint}</em>
      ) : null}
    </label>
  );
}

/** Gold per karat, silver and cash, valued at the live board, against the nisab. */
export function ZakatCalculator({ initial }: { initial: Prices | null }) {
  const { t } = useI18n();
  const { prices } = useLivePrices({ prices: initial });
  const [gold, setGold] = useState<Record<Karat, string>>({ 24: "", 21: "", 18: "" });
  const [silver, setSilver] = useState("");
  const [cash, setCash] = useState("");

  if (!prices) return <p className="zk-warn">{t.zakat.unavailable}</p>;

  const rate = String(ZAKAT_PERCENT);
  const z = zakatOf(prices, {
    gold: Object.fromEntries(ZAKAT_KARATS.map((k) => [k, read(gold[k]).value])),
    silverGrams: read(silver).value,
    cashPiastres: Math.round(read(cash).value * 100),
  });
  const egp = <small className="egp">{t.product.egp}</small>;

  return (
    <div className="pr-layout zk">
      <form className="zk-form" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>{t.zakat.goldTitle}</legend>
          <p className="zk-lede">{t.zakat.goldHint}</p>
          <div className="zk-grid">
            {ZAKAT_KARATS.map((k) => (
              <Amount
                key={k}
                id={`zk-gold-${k}`}
                label={fmt(t.zakat.grams, { k: karatLabel(k, t) })}
                value={gold[k]}
                onChange={(v) => setGold((g) => ({ ...g, [k]: v }))}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.zakat.silverTitle}</legend>
          <div className="zk-grid">
            <Amount id="zk-silver" label={t.zakat.silverGrams} value={silver} onChange={setSilver} />
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.zakat.cashTitle}</legend>
          <div className="zk-grid">
            <Amount id="zk-cash" label={t.zakat.cash} value={cash} onChange={setCash} hint={t.zakat.cashHint} />
          </div>
        </fieldset>
        <p className="pr-calc-note">{fmt(t.zakat.priceNote, { time: cairoTime(prices.updatedAt) })}</p>
      </form>

      <aside className="pr-side">
        <section className={`zk-result${z.due ? " due" : ""}`} aria-labelledby="zk-result-title">
          <h2 id="zk-result-title">{t.zakat.resultTitle}</h2>
          {/* announced as the numbers change, so a screen reader hears the result too */}
          <div aria-live="polite">
            <p className="zk-verdict">{z.due ? t.zakat.due : t.zakat.none}</p>
            {z.due ? (
              <p className="zk-big" data-zakat={z.zakatPiastres}>
                {money(z.zakatPiastres)} {egp}
              </p>
            ) : null}
            <p className="zk-why">
              {z.due
                ? fmt(t.zakat.dueText, { rate, total: money(z.totalPiastres), nisab: money(z.nisabGoldPiastres) })
                : fmt(t.zakat.noneText, { nisab: money(z.nisabGoldPiastres) })}
            </p>
            {z.silverOnly ? (
              <p className="zk-silver-note">
                {fmt(t.zakat.silverNote, {
                  nisab: money(z.nisabSilverPiastres),
                  rate,
                  amount: money(Math.round((z.totalPiastres * ZAKAT_PERCENT) / 100)),
                })}
              </p>
            ) : null}
          </div>
          <dl className="zk-lines">
            <div>
              <dt>{t.zakat.gold}</dt>
              <dd>{money(z.goldPiastres)}</dd>
            </div>
            <div>
              <dt>{t.zakat.silver}</dt>
              <dd>{money(z.silverPiastres)}</dd>
            </div>
            <div>
              <dt>{t.zakat.cashLine}</dt>
              <dd>{money(z.cashPiastres)}</dd>
            </div>
            <div className="zk-total">
              <dt>{t.zakat.total}</dt>
              <dd data-total={z.totalPiastres}>
                {money(z.totalPiastres)} {egp}
              </dd>
            </div>
          </dl>
        </section>

        <section className="pr-calc zk-nisab" aria-labelledby="zk-nisab-title">
          <h2 id="zk-nisab-title">{t.zakat.nisabTitle}</h2>
          <dl className="zk-lines">
            {NISAB_GOLD_BY_KARAT.map(({ karat, grams }) => (
              <div key={karat} data-nisab-karat={karat}>
                <dt>{karatLabel(karat, t)}</dt>
                <dd>
                  {grams} {t.product.grams}
                </dd>
              </div>
            ))}
            <div>
              <dt>{fmt(t.zakat.nisabSilver, { g: NISAB_SILVER_GRAMS })}</dt>
              <dd data-nisab="silver">
                {money(z.nisabSilverPiastres)} {egp}
              </dd>
            </div>
          </dl>
          <p className="pr-calc-note">{t.zakat.nisabNote}</p>
        </section>

        <section className="zk-warn" aria-labelledby="zk-warn-title">
          <h2 id="zk-warn-title">{t.zakat.disclaimerTitle}</h2>
          <p>{t.zakat.disclaimer}</p>
        </section>
      </aside>
    </div>
  );
}
