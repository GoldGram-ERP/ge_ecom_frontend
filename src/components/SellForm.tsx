"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { fmt } from "@/i18n";
import { api, ApiError, errorText } from "@/lib/client-api";
import { pounds, poundsParts, productName, weightLabel } from "@/lib/format";
import { useLivePrices } from "@/lib/live-prices";
import { site } from "@/lib/site";
import type { Prices, Product } from "@/lib/types";
import { isEmail, normalizePhone } from "@/lib/validation";
import { Button, Option, Options, Select } from "./controls";
import { useI18n, useSession } from "./Providers";

type Kind = "bar" | "coin";
type Karat = "24" | "21" | "18";
type Condition = "sealed_invoice" | "opened";
type Handover = "branch" | "courier";
type Payout = "bank" | "cash";
type Field = "weight" | "name" | "mobile" | "email";

/** Cashback per gram, in piastres, for a piece of a brand GoldGram sells (dashboard settings). */
export interface Cashback {
  sealed: number;
  opened: number;
}

const MAX_QTY = 1000;
// Up to 2 decimals, as the server accepts.
const WEIGHT = /^\d{1,6}(\.\d{1,2})?$/;
const OTHER = "other";
// Only gold is bought back: a silver piece has no karat on the board.
const GOLD: number[] = [24, 21, 18];

interface Placed {
  reference: string;
  estimatePiastres: number;
}

/** 4000 → "40", 3550 → "35.50". */
const perGramText = (piastres: number): string => (piastres % 100 ? poundsParts(piastres).full : pounds(piastres));

/** Coins are their own kind; every other category (bars, wearables) is sold back as a bar. */
const kindOf = (product: Product): Kind => (product.category === "coin" ? "coin" : "bar");

/** The sale request: what, how it is handed over, how it is paid, who to call. The estimate follows the live board. */
export function SellForm({
  prices: initial,
  branchPickup,
  products,
  cashback,
}: {
  prices: Prices | null;
  branchPickup: boolean;
  products: Product[];
  cashback: Cashback;
}) {
  const { locale, t } = useI18n();
  const s = t.sell;
  const { user } = useSession();
  const { prices } = useLivePrices({ prices: initial });

  const [kind, setKind] = useState<Kind>("bar");
  const [brand, setBrand] = useState("");
  const [productId, setProductId] = useState("");
  const [karat, setKarat] = useState<Karat>("24");
  const [weight, setWeight] = useState("");
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<Condition>("sealed_invoice");
  const [handover, setHandover] = useState<Handover>(branchPickup ? "branch" : "courier");
  const [payout, setPayout] = useState<Payout>("bank");
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

  // The brands of this kind in the catalogue, then the pieces of the chosen one, lightest first.
  const ofKind = products.filter((p) => kindOf(p) === kind && GOLD.includes(p.karat));
  const brands = [...new Map(ofKind.map((p) => [String(p.manufacturerId), (locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || p.manufacturerEn])).entries()];
  const brandValue = brand === OTHER || brands.some(([id]) => id === brand) ? brand : (brands[0]?.[0] ?? OTHER);
  const pieces = ofKind.filter((p) => String(p.manufacturerId) === brandValue).sort((a, b) => a.weightGrams - b.weightGrams || a.id - b.id);
  const product = brandValue === OTHER ? null : (pieces.find((p) => String(p.id) === productId) ?? pieces[0] ?? null);
  const pieceLabel = (p: Product) => {
    const label = weightLabel(p.weightGrams, t);
    // Two pieces of the same weight (a bar and a pendant) are told apart by their names.
    return pieces.some((o) => o !== p && weightLabel(o.weightGrams, t) === label) ? `${label} · ${productName(p, locale)}` : label;
  };

  // The same sums as the server's sellEstimate: the sale price and the cashback, each to the piastre.
  const gram = prices?.karats.find((k) => k.karat === (product ? product.karat : Number(karat)))?.sellPiastres ?? null;
  const grams = product ? product.weightGrams : WEIGHT.test(weight.trim()) ? Number(weight.trim()) : 0;
  const cashbackGram = product ? (condition === "sealed_invoice" ? cashback.sealed : cashback.opened) : 0;
  const sale = gram !== null ? Math.round(grams * qty * gram) : null;
  const cashbackTotal = Math.round(grams * qty * cashbackGram);
  const estimate = sale !== null ? sale + cashbackTotal : null;

  const payouts: [Payout, string][] = [["bank", s.bank], ...(branchPickup ? ([["cash", s.cash]] as [Payout, string][]) : [])];

  function pickKind(next: Kind) {
    setKind(next);
    setProductId("");
    // The pound is a 21K coin; bars are mostly 24K.
    setKarat(next === "coin" ? "21" : "24");
  }

  function pickBrand(next: string) {
    setBrand(next);
    setProductId("");
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
          // For a brand we sell the server takes the product's own karat and weight; these only pass validation.
          karat: product ? product.karat : Number(karat),
          weightGrams: product ? Math.max(0.01, Math.round(product.weightGrams * 100) / 100) : grams,
          ...(product ? { productId: product.id } : {}),
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
            <span id="sell-brand">{s.brand}</span>
            <Select value={brandValue} onChange={pickBrand} aria-labelledby="sell-brand" options={[...brands, [OTHER, s.otherBrand] as const]} />
          </div>
          {product ? (
            <div className="f">
              <span id="sell-piece">{s.weightPick}</span>
              <Select value={String(product.id)} onChange={setProductId} aria-labelledby="sell-piece" options={pieces.map((p) => [String(p.id), pieceLabel(p)] as const)} />
            </div>
          ) : (
            <>
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
            </>
          )}
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
              ["sealed_invoice", s.sealedInvoice, s.sealedInvoiceSub, cashback.sealed],
              ["opened", s.opened, s.openedSub, cashback.opened],
            ] as const
          ).map(([value, title, sub, perGram]) => (
            <Option value={value} id={`sell-cond-${value}`} key={value}>
              <div>
                <b>{title}</b>
                {product ? <span>{fmt(sub, { cb: perGramText(perGram) })}</span> : null}
              </div>
            </Option>
          ))}
        </Options>
        {product ? null : <p className="sell-note">{s.noCashback}</p>}

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
            {estimate !== null ? poundsParts(estimate).full : "—"} <small>{t.product.egp}</small>
          </div>
          {gram !== null && sale !== null ? (
            <>
              <div className="o-line">
                <span>{fmt(s.perGram, { w: grams ? String(grams) : "0", price: poundsParts(gram).full })}</span>
              </div>
              <div className="o-line sell-sale">
                <span>{s.salePrice}</span>
                <b>{poundsParts(sale).full}</b>
              </div>
              {product ? (
                <div className="o-line sell-cashback">
                  <span>{s.cashback}</span>
                  <b>{poundsParts(cashbackTotal).full}</b>
                </div>
              ) : (
                <p className="sell-note sell-nocb">{s.noCashback}</p>
              )}
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
