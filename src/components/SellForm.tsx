"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { fmt } from "@/i18n";
import { api, ApiError, errorText } from "@/lib/client-api";
import { pounds, poundsParts } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import { site } from "@/lib/site";
import type { Prices } from "@/lib/types";
import { isEmail, normalizePhone } from "@/lib/validation";
import { Button, Option, Options, Select } from "./controls";
import { useI18n, useSession } from "./Providers";

type Kind = "bar" | "coin";
type Karat = "24" | "21" | "18";
type Condition = "sealed_invoice" | "sealed" | "opened";
type Handover = "branch" | "courier";
type Payout = "cash" | "instapay" | "bank";
type Field = "weight" | "name" | "mobile" | "email";

const MAX_QTY = 1000;
// Up to 2 decimals, as the server accepts.
const WEIGHT = /^\d{1,6}(\.\d{1,2})?$/;

interface Placed {
  reference: string;
  estimatePiastres: number;
}

/** The sale request: what, how it is handed over, how it is paid, who to call. The estimate follows the live board. */
export function SellForm({ prices: initial, branchPickup }: { prices: Prices | null; branchPickup: boolean }) {
  const { locale, t } = useI18n();
  const s = t.sell;
  const { user } = useSession();
  const { prices } = useLivePrices({ prices: initial });

  const [kind, setKind] = useState<Kind>("bar");
  const [karat, setKarat] = useState<Karat>("24");
  const [weight, setWeight] = useState("");
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<Condition>("sealed_invoice");
  const [handover, setHandover] = useState<Handover>(branchPickup ? "branch" : "courier");
  const [payout, setPayout] = useState<Payout>("instapay");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Placed | null>(null);

  // A signed-in customer starts with the email and mobile of their account.
  if (user && !prefilled) {
    setPrefilled(true);
    setEmail((v) => v || user.email);
    setMobile((v) => v || user.mobile);
  }

  const gram = prices?.karats.find((k) => String(k.karat) === karat)?.sellPiastres ?? null;
  const grams = WEIGHT.test(weight.trim()) ? Number(weight.trim()) : 0;
  const estimate = gram !== null ? Math.round(grams * qty * gram) : null;

  const payouts: [Payout, string][] = [
    ...(branchPickup ? ([["cash", s.cash]] as [Payout, string][]) : []),
    ["instapay", s.instapay],
    ["bank", s.bank],
  ];

  function pickKind(next: Kind) {
    setKind(next);
    // The pound is a 21K coin; bars are mostly 24K.
    setKarat(next === "coin" ? "21" : "24");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const phone = normalizePhone(mobile);
    const found: Partial<Record<Field, string>> = {};
    if (!grams) found.weight = s.errWeight;
    if (name.trim().length < 2) found.name = s.errName;
    if (!phone) found.mobile = s.errMobile;
    if (!isEmail(email)) found.email = s.errEmail;
    setErrors(found);
    setMessage(null);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const placed = await api<Placed>("/sell-requests", {
        body: {
          kind,
          karat: Number(karat),
          weightGrams: grams,
          qty,
          condition,
          handover: branchPickup ? handover : "courier",
          payout,
          name: name.trim(),
          mobile: phone,
          email: email.trim().toLowerCase(),
          locale,
        },
      });
      setDone(placed);
      window.scrollTo(0, 0);
    } catch (error) {
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        const fields = (Array.isArray(error.details) ? error.details : []) as { field?: string }[];
        const back: Partial<Record<Field, string>> = {};
        for (const { field } of fields) {
          if (field === "weightGrams") back.weight = s.errWeight;
          if (field === "name") back.name = s.errName;
          if (field === "mobile") back.mobile = s.errMobile;
          if (field === "email") back.email = s.errEmail;
        }
        setErrors(back);
        if (Object.keys(back).length === 0) setMessage(errorText(error, t));
      } else setMessage(errorText(error, t));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="done sell-done" role="status">
        <motion.div
          className="seal"
          aria-hidden="true"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
        >
          ✓
        </motion.div>
        <h2>{s.doneTitle}</h2>
        <p>{s.doneText}</p>
        <div className="ref" dir="ltr">
          {done.reference}
        </div>
        <p className="sell-done-est">
          {s.doneEstimate}: <b>{pounds(done.estimatePiastres)}</b> {t.product.egp}
        </p>
        <p>
          {s.doneHelp.split("{hotline}")[0]}
          <a href={`tel:${site.hotline}`} dir="ltr">
            {site.hotline}
          </a>
          {s.doneHelp.split("{hotline}")[1]}
        </p>
        <div className="done-acts">
          <Button
            type="button"
            className="gold-btn"
            onClick={() => {
              setDone(null);
              setWeight("");
              setQty(1);
            }}
          >
            {s.another}
          </Button>
        </div>
      </div>
    );
  }

  const bad = (field: Field) => (errors[field] ? "bad" : undefined);
  const fieldError = (field: Field) =>
    errors[field] ? (
      <small className="sell-err" id={`sell-${field}-err`}>
        {errors[field]}
      </small>
    ) : null;

  return (
    <form className="co-grid sell" onSubmit={submit} noValidate>
      <div>
        <h2 className="co-h">
          <i>1</i>
          {s.whatH}
        </h2>
        <div className="ff">
          <div className="f wide">
            <span id="sell-kind">{s.kind}</span>
            <div className="sell-chips" role="group" aria-labelledby="sell-kind">
              {(["bar", "coin"] as const).map((k) => (
                <Button key={k} type="button" className={`fp${kind === k ? " on" : ""}`} aria-pressed={kind === k} onClick={() => pickKind(k)}>
                  {k === "bar" ? s.bar : s.coin}
                </Button>
              ))}
            </div>
          </div>
          <div className="f">
            <span id="sell-karat">{s.karat}</span>
            <Select
              value={karat}
              onChange={setKarat}
              aria-labelledby="sell-karat"
              options={(["24", "21", "18"] as const).map((k) => [k, fmt(s.karatValue, { k })] as const)}
            />
          </div>
          <label className="f">
            <span>
              {s.weight}
              <em>*</em>
            </span>
            <input
              dir="ltr"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              maxLength={9}
              placeholder={s.weightPh}
              aria-invalid={Boolean(errors.weight)}
              aria-describedby={errors.weight ? "sell-weight-err" : undefined}
              className={bad("weight")}
              value={weight}
              onChange={(e) => setWeight(e.target.value.replace(",", "."))}
            />
            {fieldError("weight")}
          </label>
          <div className="f">
            <span id="sell-qty">{s.qty}</span>
            <div className="pdp-qty sell-qty" role="group" aria-labelledby="sell-qty">
              <Button type="button" aria-label={s.less} disabled={qty <= 1} onClick={() => setQty((n) => Math.max(1, n - 1))}>
                −
              </Button>
              <output aria-live="polite">{qty}</output>
              <Button type="button" aria-label={s.more} disabled={qty >= MAX_QTY} onClick={() => setQty((n) => Math.min(MAX_QTY, n + 1))}>
                +
              </Button>
            </div>
          </div>
        </div>

        <h3 className="sell-sub">{s.conditionH}</h3>
        <Options value={condition} onChange={setCondition} aria-label={s.conditionH}>
          {(
            [
              ["sealed_invoice", s.sealedInvoice, s.sealedInvoiceSub],
              ["sealed", s.sealed, s.sealedSub],
              ["opened", s.opened, s.openedSub],
            ] as const
          ).map(([value, title, sub]) => (
            <Option value={value} id={`sell-cond-${value}`} key={value}>
              <div>
                <b>{title}</b>
                <span>{sub}</span>
              </div>
            </Option>
          ))}
        </Options>

        <h2 className="co-h">
          <i>2</i>
          {s.handoverH}
        </h2>
        <Options value={handover} onChange={setHandover} aria-label={s.handoverH}>
          {branchPickup ? (
            <Option value="branch" id="sell-branch">
              <div>
                <b>{s.branch}</b>
                <span>{s.branchSub}</span>
              </div>
            </Option>
          ) : null}
          <Option value="courier" id="sell-courier">
            <div>
              <b>{s.courier}</b>
              <span>{s.courierSub}</span>
            </div>
          </Option>
        </Options>

        <h2 className="co-h">
          <i>3</i>
          {s.payoutH}
        </h2>
        <div className="sell-chips" role="group" aria-label={s.payoutH}>
          {payouts.map(([value, label]) => (
            <Button key={value} type="button" className={`fp${payout === value ? " on" : ""}`} aria-pressed={payout === value} onClick={() => setPayout(value)}>
              {label}
            </Button>
          ))}
        </div>

        <h2 className="co-h">
          <i>4</i>
          {s.contactH}
        </h2>
        <div className="ff">
          <label className="f wide">
            <span>
              {s.name}
              <em>*</em>
            </span>
            <input type="text" autoComplete="name" maxLength={120} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "sell-name-err" : undefined} className={bad("name")} value={name} onChange={(e) => setName(e.target.value)} />
            {fieldError("name")}
          </label>
          <label className="f">
            <span>
              {s.mobile}
              <em>*</em>
            </span>
            <input dir="ltr" type="tel" autoComplete="tel" maxLength={20} placeholder="01001234567" aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? "sell-mobile-err" : undefined} className={bad("mobile")} value={mobile} onChange={(e) => setMobile(e.target.value)} />
            {fieldError("mobile")}
          </label>
          <label className="f">
            <span>
              {s.email}
              <em>*</em>
            </span>
            <input dir="ltr" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "sell-email-err" : undefined} className={bad("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldError("email")}
          </label>
        </div>
      </div>

      <aside>
        <div className="order sell-est" aria-live="polite">
          <h3>{s.estimateH}</h3>
          <div className="sell-big">
            {estimate !== null ? pounds(estimate) : "—"} <small>{t.product.egp}</small>
          </div>
          {gram !== null ? (
            <>
              <div className="o-line">
                <span>{fmt(s.perGram, { w: grams ? String(grams) : "0", price: poundsParts(gram).full })}</span>
              </div>
              <div className="o-line">
                <span>{s.pieces}</span>
                <b>× {qty}</b>
              </div>
            </>
          ) : (
            <p className="notice">{s.noPrice}</p>
          )}
          <p className="sell-note">{s.estimateNote}</p>
          {message && (
            <p className="co-err" role="alert">
              <i>!</i>
              <span>{message}</span>
            </p>
          )}
          <Button type="submit" className="place" disabled={busy}>
            {busy ? s.sending : s.submit}
          </Button>
        </div>
        <div className="sell-info">
          <b>{s.infoH}</b>
          <p>{s.info}</p>
        </div>
      </aside>
    </form>
  );
}
