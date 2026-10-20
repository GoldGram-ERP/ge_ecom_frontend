"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmt } from "@/i18n";
import { cart, useCart } from "@/lib/cart";
import { api, ApiError, CLAIM_KEY, errorText } from "@/lib/client-api";
import { useLivePrices } from "@/lib/live-prices";
import { pounds, productName, productPurity, shortWeight } from "@/lib/format";
import type { Fulfilment, PaymentMethod, PaymentMethodInfo, PlacedOrder, Quote, Zone } from "@/lib/types";
import { GOVERNORATES, isEmail, normalizeNationalId, normalizePassport, normalizePhone, type Governorate } from "@/lib/validation";
import { MiniArt } from "./chrome";
import { Button, Check, Option, Options, Select } from "./controls";
import { ProofUpload } from "./proof-upload";
import { useI18n, useSession } from "./Providers";

type TextField = "firstName" | "lastName" | "street" | "apartment" | "nationalId" | "phone" | "email" | "deliveryAddress" | "notes";
type ErrorKey = TextField | "terms";
type Errors = Partial<Record<ErrorKey, "required" | "invalid">>;

const EMPTY_FORM: Record<TextField, string> = {
  firstName: "", lastName: "", street: "", apartment: "", nationalId: "", phone: "", email: "", deliveryAddress: "", notes: "",
};

// How the backend names fields in a VALIDATION_FAILED answer → the field on this form.
const SERVER_FIELDS: Record<string, ErrorKey> = {
  "customer.firstName": "firstName",
  "customer.lastName": "lastName",
  "customer.street": "street",
  "customer.apartment": "apartment",
  "customer.nationalId": "nationalId",
  "customer.phone": "phone",
  "customer.email": "email",
  deliveryAddress: "deliveryAddress",
  notes: "notes",
  acceptTerms: "terms",
};

export function Checkout({ branchPickup }: { branchPickup: boolean }) {
  const { locale, t, href } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const lines = useCart();

  // Delivery cost per governorate and the payment methods on offer, as staff set them in the dashboard.
  const [zones, setZones] = useState<Zone[]>([]);
  const [methods, setMethods] = useState<PaymentMethodInfo[] | null>(null);
  useEffect(() => {
    api<Zone[]>("/zones").then(setZones, () => setZones([]));
    api<PaymentMethodInfo[]>("/payment-methods").then(setMethods, () => setMethods(null));
  }, []);

  const [form, setForm] = useState(EMPTY_FORM);
  const [governorate, setGovernorate] = useState<Governorate>("cairo");
  // Which document the customer identifies with; each has its own rule.
  const [idType, setIdType] = useState<"national_id" | "passport">("national_id");
  const passport = idType === "passport";
  const [otherAddress, setOtherAddress] = useState(false);
  // Collection from the branch first when the dashboard offers it, delivery otherwise.
  const [fulfilment, setFulfilment] = useState<Fulfilment>(branchPickup ? "branch" : "delivery");
  // Nothing is chosen for the customer: a method staff switched off must never be sent unseen.
  const [picked, setPicked] = useState<PaymentMethod | null>(null);
  const [terms, setTerms] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    id: number;
    reference: string;
    totalPiastres: number;
    payment: PaymentMethod;
    guestToken?: string;
    email: string;
    phone: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // A signed-in customer starts with the email and mobile from their account.
  const [prefilled, setPrefilled] = useState(false);
  if (user && !prefilled) {
    setPrefilled(true);
    setForm((f) => ({ ...f, email: f.email || user.email, phone: f.phone || user.mobile }));
  }

  // ---- the server-priced summary ----
  const [retry, setRetry] = useState(0);
  // Live board: when staff publish a new price its updatedAt changes, which re-keys the
  // quote below so the shown total refreshes on its own. A customer who sits here never
  // holds a stale total — and the server re-prices the order at submit regardless.
  const { prices: liveBoard } = useLivePrices();
  // Only a method that is on offer counts as chosen.
  const payment = picked && (methods === null || methods.some((m) => m.code === picked)) ? picked : null;
  const quoteKey = JSON.stringify([lines, fulfilment, payment, governorate, retry, liveBoard?.updatedAt ?? ""]);
  const [loaded, setLoaded] = useState<{ key: string; quote: Quote } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const hasLines = lines.length > 0;
  const quote = hasLines ? (loaded?.quote ?? null) : null;
  const quoteFresh = hasLines && loaded?.key === quoteKey;
  const quoteFailed = hasLines && failedKey === quoteKey;
  const unavailableText = t.checkout.errUnavailable;

  useEffect(() => {
    if (!hasLines || done) return;
    const controller = new AbortController();
    api<Quote>("/orders/quote", { body: { items: lines, fulfilment, ...(payment ? { paymentMethod: payment } : {}), governorate }, signal: controller.signal })
      .then((q) => {
        setLoaded({ key: quoteKey, quote: q });
        if (q.unavailable.length) {
          cart.drop(q.unavailable);
          setNotice(unavailableText);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailedKey(quoteKey);
      });
    return () => controller.abort();
    // quoteKey stands for lines, fulfilment, payment method, governorate and retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, hasLines, done]);

  // The same key is sent again only when the very same order is retried (EC-03).
  const attempt = useRef<{ payload: string; key: string } | null>(null);

  const set = (field: TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const labels: Record<ErrorKey, string> = {
    firstName: t.checkout.firstName,
    lastName: t.checkout.lastName,
    street: t.checkout.street,
    apartment: t.checkout.apartment,
    nationalId: passport ? t.checkout.passport : t.checkout.nationalId,
    phone: t.checkout.phone,
    email: t.checkout.email,
    deliveryAddress: t.checkout.deliveryAddress,
    notes: t.checkout.notesLabel,
    terms: t.checkout.termsWord,
  };
  const wantsOtherAddress = fulfilment === "delivery" && otherAddress;

  function validate(): Errors {
    const found: Errors = {};
    const need = (field: TextField, max: number, min = 1) => {
      const value = form[field].trim();
      if (!value) found[field] = "required";
      else if (value.length < min || value.length > max) found[field] = "invalid";
    };
    need("firstName", 60);
    need("lastName", 60);
    need("street", 200, 3);
    if (form.apartment.trim().length > 200) found.apartment = "invalid";
    if (!form.nationalId.trim()) found.nationalId = "required";
    else if (!(passport ? normalizePassport(form.nationalId) : normalizeNationalId(form.nationalId))) found.nationalId = "invalid";
    if (!form.phone.trim()) found.phone = "required";
    else if (!normalizePhone(form.phone)) found.phone = "invalid";
    if (!form.email.trim()) found.email = "required";
    else if (!isEmail(form.email)) found.email = "invalid";
    if (wantsOtherAddress) need("deliveryAddress", 500);
    if (form.notes.length > 1000) found.notes = "invalid";
    return found;
  }

  function fieldsMessage(found: Errors): string {
    const names = (Object.keys(found) as ErrorKey[]).filter((k) => k !== "terms" && found[k]).map((k) => labels[k]);
    return fmt(t.checkout.errFields, { fields: names.join(locale === "ar" ? "، " : ", ") });
  }

  async function place() {
    setNotice(null);
    if (!hasLines) {
      setMessage(t.checkout.errEmpty);
      return;
    }
    const found = validate();
    if (!terms) found.terms = "required";
    setErrors(found);
    const badFields = Object.keys(found).filter((k) => k !== "terms");
    if (badFields.length) {
      setMessage(fieldsMessage(found));
      document.getElementById(`co-${badFields[0]}`)?.focus();
      return;
    }
    if (!payment) {
      setMessage(t.checkout.errPayment);
      document.getElementById(methods?.[0] ? `pay-${methods[0].code}` : "pay-bank")?.focus();
      return;
    }
    if (!terms) {
      setMessage(t.checkout.errTerms);
      return;
    }
    if (!quote || !quoteFresh) return;
    if (fulfilment === "delivery" && !quote.deliveryAvailable) {
      setMessage(t.checkout.errNoZone);
      return;
    }

    const body = {
      items: lines,
      fulfilment,
      paymentMethod: payment,
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        street: form.street.trim(),
        ...(form.apartment.trim() ? { apartment: form.apartment.trim() } : {}),
        governorate,
        ...(passport ? { idType, nationalId: normalizePassport(form.nationalId) } : { nationalId: normalizeNationalId(form.nationalId) }),
        phone: normalizePhone(form.phone),
        email: form.email.trim().toLowerCase(),
      },
      ...(wantsOtherAddress ? { deliveryAddress: form.deliveryAddress.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      acceptTerms: true,
      expectedTotalPiastres: quote.totalPiastres,
      locale,
    };
    const payload = JSON.stringify(body);
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() };

    setBusy(true);
    setMessage(null);
    try {
      const order = await api<PlacedOrder>("/orders", {
        body,
        headers: { "Idempotency-Key": attempt.current.key },
      });
      cart.clear();
      setDone({
        id: order.id,
        reference: order.reference,
        totalPiastres: order.totalPiastres,
        payment,
        guestToken: order.guestToken,
        email: body.customer.email,
        phone: body.customer.phone ?? "",
      });
      // The account page offered next can claim this order, from this browser only.
      if (order.guestToken) sessionStorage.setItem(CLAIM_KEY, order.guestToken);
      window.scrollTo(0, 0);
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  }

  function handleFailure(error: unknown) {
    if (!(error instanceof ApiError)) {
      setMessage(t.errors.generic);
      return;
    }
    switch (error.code) {
      case "VALIDATION_FAILED": {
        const found: Errors = {};
        for (const d of Array.isArray(error.details) ? (error.details as { field?: string; code?: string }[]) : []) {
          const key = d.field ? SERVER_FIELDS[d.field] : undefined;
          if (key) found[key] = d.code === "required" ? "required" : "invalid";
        }
        setErrors(found);
        const named = Object.keys(found).some((k) => k !== "terms");
        setMessage(named ? fieldsMessage(found) : found.terms ? t.checkout.errTerms : t.errors.generic);
        break;
      }
      case "PRICE_CHANGED": {
        const fresh = error.details as Quote | undefined;
        if (fresh && Array.isArray(fresh.lines)) setLoaded({ key: quoteKey, quote: fresh });
        else setRetry((n) => n + 1);
        setMessage(t.checkout.errPriceChanged);
        break;
      }
      case "PRODUCT_UNAVAILABLE": {
        const d = error.details as number[] | { unavailable?: number[]; ids?: number[] } | undefined;
        const ids = Array.isArray(d) ? d : (d?.unavailable ?? d?.ids ?? []);
        if (ids.length) cart.drop(ids);
        else setRetry((n) => n + 1);
        setMessage(t.checkout.errUnavailable);
        break;
      }
      case "MARKET_CLOSED":
        setMessage(t.checkout.errPaused);
        break;
      case "STORE_CLOSED":
        setMessage(t.checkout.errStoreClosed);
        break;
      case "KYC_REQUIRED":
        setMessage(t.checkout.errKyc);
        break;
      case "OUT_OF_STOCK":
        setRetry((n) => n + 1);
        setMessage(t.checkout.errStock);
        break;
      case "NO_DELIVERY_ZONE":
        setMessage(t.checkout.errNoZone);
        break;
      case "PAYMENT_METHOD_UNAVAILABLE":
        // switched off in the dashboard while the page was open
        setPicked(null);
        setMessage(t.checkout.errPayment);
        break;
      case "BRANCH_CLOSED":
        // switched off in the dashboard while the page was open
        setFulfilment("delivery");
        setMessage(t.checkout.errBranchClosed);
        break;
      case "ACCOUNT_SUSPENDED":
        setMessage(t.checkout.errSuspended);
        break;
      case "UNAUTHENTICATED":
        // identity checks are on, so a guest must sign in first; then they come back here
        router.push(href("/sign-in?next=checkout"));
        break;
      case "CART_EMPTY":
        setMessage(t.checkout.errEmpty);
        break;
      default:
        setMessage(errorText(error, t));
    }
  }

  const step = done ? 2 : 1;
  const zone = zones.find((z) => z.governorate === governorate);
  const deliveryBlocked = fulfilment === "delivery" && quote !== null && quoteFresh && !quote.deliveryAvailable;
  const offers = (code: PaymentMethod) => methods === null || methods.some((m) => m.code === code);
  // Where to send the money for the method of the placed order, as set in the dashboard.
  const payTo = done ? (methods?.find((m) => m.code === done.payment)?.payTo.trim() ?? "") : "";
  const [termsBefore, termsBetween, termsAfter] = t.checkout.terms.split(/\{terms\}|\{privacy\}/);
  const bad = (field: ErrorKey) => (errors[field] ? "bad" : undefined);
  // What the single "Handling" figure is made of, for the line under it.
  const amount = (piastres: number) => `${pounds(piastres)} ${t.product.egp}`;
  const handlingParts = quote
    ? [
        quote.shippingPiastres > 0 && fmt(t.checkout.handlingDelivery, { n: amount(quote.shippingPiastres) }),
        quote.feePiastres > 0 && fmt(t.checkout.handlingFee, { n: amount(quote.feePiastres) }),
        quote.discountPiastres > 0 && fmt(t.checkout.handlingDiscount, { n: amount(quote.discountPiastres) }),
      ].filter((part): part is string => Boolean(part))
    : [];

  return (
    <>
      <div className="band-navy">
        <div className="wrap">
          <section className="co-top">
            <div className="kicker">{t.checkout.kicker}</div>
            <h1>{t.checkout.title}</h1>
            <div className="co-steps">
              {t.checkout.steps.map((label, i) => (
                <span className={`co-step${i === step ? " on" : ""}`} key={label} aria-current={i === step ? "step" : undefined}>
                  <i>0{i + 1}</i>
                  {label}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="band-off">
        <div className="wrap">
          {done ? (
            <div className="done" role="status">
              {/* The seal arrives with a small spring and the tick draws itself: one moment, then still. */}
              <motion.div
                className="seal"
                aria-hidden="true"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
              >
                <svg viewBox="0 0 32 32" width="34" height="34">
                  <motion.path
                    d="M8.5 16.5l5.2 5.2L23.5 11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  />
                </svg>
              </motion.div>
              <h2>{t.checkout.doneTitle}</h2>
              <p>{t.checkout.doneText}</p>

              <div className="done-card">
                <div className="done-row">
                  <span>{t.checkout.refLabel}</span>
                  <div className="done-ref">
                    {/* shown with the prototype's en dash: GG–482913 */}
                    <div className="ref">{done.reference.replace("-", "–")}</div>
                    <Button
                      type="button"
                      className="done-copy"
                      onClick={() => {
                        void navigator.clipboard?.writeText(done.reference).then(
                          () => setCopied(true),
                          () => undefined,
                        );
                      }}
                    >
                      {copied ? t.checkout.copied : t.checkout.copy}
                    </Button>
                  </div>
                </div>
                <div className="done-row">
                  <span>{t.checkout.total}</span>
                  <b>
                    {pounds(done.totalPiastres)} <small>{t.product.egp}</small>
                  </b>
                </div>
                <div className="done-row">
                  <span>{t.checkout.payment}</span>
                  <b className="done-pay">{done.payment === "instapay" ? t.checkout.instapay : t.checkout.bank}</b>
                </div>
                <div className="done-row done-payto">
                  <span>{t.checkout.payTo}</span>
                  {payTo ? (
                    <b dir="auto">{payTo}</b>
                  ) : (
                    <p>{t.checkout.payToEmail}</p>
                  )}
                </div>
              </div>

              <ol className="done-steps">
                {t.checkout.doneSteps.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ol>

              <ProofUpload orderId={done.id} guestToken={done.guestToken} />

              {done.guestToken && (
                <div className="done-account">
                  <p>{t.checkout.accountOffer}</p>
                  <Link
                    className="gold-btn"
                    href={href(`/sign-up?${new URLSearchParams({ email: done.email, mobile: done.phone })}`)}
                  >
                    {fmt(t.checkout.accountCreate, { email: done.email })}
                  </Link>
                </div>
              )}

              <div className="done-acts">
                <Link className={done.guestToken ? "done-link" : "gold-btn"} href={href("/shop")}>
                  {t.checkout.backToShop}
                </Link>
                {!done.guestToken && (
                  <Link className="done-link" href={href("/account")}>
                    {t.checkout.seeOrders}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="co-grid">
              <div>
                <h2 className="co-h">{t.checkout.details}</h2>
                <div className="ff">
                  <label className="f">
                    <span>
                      {t.checkout.firstName}
                      <em>*</em>
                    </span>
                    <input id="co-firstName" type="text" autoComplete="given-name" maxLength={60} required aria-invalid={Boolean(errors.firstName)} className={bad("firstName")} value={form.firstName} onChange={set("firstName")} />
                  </label>
                  <label className="f">
                    <span>
                      {t.checkout.lastName}
                      <em>*</em>
                    </span>
                    <input id="co-lastName" type="text" autoComplete="family-name" maxLength={60} required aria-invalid={Boolean(errors.lastName)} className={bad("lastName")} value={form.lastName} onChange={set("lastName")} />
                  </label>
                  {/* shown, not asked */}
                  <div className="f wide f-fixed">
                    <span>{t.checkout.country}</span>
                    <p>{t.checkout.countryValue}</p>
                  </div>
                  <label className="f wide">
                    <span>
                      {t.checkout.street}
                      <em>*</em>
                    </span>
                    <input id="co-street" type="text" autoComplete="address-line1" maxLength={200} required placeholder={t.checkout.streetPh} aria-invalid={Boolean(errors.street)} className={bad("street")} value={form.street} onChange={set("street")} />
                  </label>
                  <label className="f wide">
                    <span>{t.checkout.apartment}</span>
                    <input id="co-apartment" type="text" autoComplete="address-line2" maxLength={200} placeholder={t.checkout.optional} aria-invalid={Boolean(errors.apartment)} className={bad("apartment")} value={form.apartment} onChange={set("apartment")} />
                  </label>
                  <label className="f">
                    <span>
                      {t.checkout.governorate}
                      <em>*</em>
                    </span>
                    <Select
                      value={governorate}
                      onChange={setGovernorate}
                      aria-label={t.checkout.governorate}
                      options={GOVERNORATES.map((g) => [g, t.governorates[g]] as const)}
                    />
                  </label>
                  <label className="f">
                    <span>
                      {t.checkout.idType}
                      <em>*</em>
                    </span>
                    <Select
                      value={idType}
                      onChange={(next) => {
                        setIdType(next);
                        // a number typed for the other document is judged again, by the new rule
                        setErrors((prev) => ({ ...prev, nationalId: undefined }));
                      }}
                      aria-label={t.checkout.idType}
                      options={[
                        ["national_id", t.checkout.nationalId],
                        ["passport", t.checkout.idPassport],
                      ]}
                    />
                  </label>
                  <label className="f">
                    <span>
                      {passport ? t.checkout.passport : t.checkout.nationalId}
                      <em>*</em>
                    </span>
                    <input id="co-nationalId" dir="ltr" type="text" inputMode={passport ? "text" : "numeric"} autoComplete="off" maxLength={20} required placeholder={passport ? t.checkout.passportPh : t.checkout.nationalIdPh} aria-invalid={Boolean(errors.nationalId)} className={bad("nationalId")} value={form.nationalId} onChange={set("nationalId")} />
                  </label>
                  <label className="f">
                    <span>
                      {t.checkout.phone}
                      <em>*</em>
                    </span>
                    <input id="co-phone" dir="ltr" type="tel" autoComplete="tel" maxLength={20} required placeholder="01x xxxx xxxx" aria-invalid={Boolean(errors.phone)} className={bad("phone")} value={form.phone} onChange={set("phone")} />
                  </label>
                  <label className="f">
                    <span>
                      {t.checkout.email}
                      <em>*</em>
                    </span>
                    <input id="co-email" dir="ltr" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" aria-invalid={Boolean(errors.email)} className={bad("email")} value={form.email} onChange={set("email")} />
                  </label>
                </div>

                <label className="f wide" style={{ marginTop: "var(--s2)" }}>
                  <span>{t.checkout.notesLabel}</span>
                  <textarea id="co-notes" maxLength={1000} placeholder={t.checkout.notesPh} className={bad("notes")} value={form.notes} onChange={set("notes")} />
                </label>
                <p className="co-legal">{t.checkout.idLegal}</p>

                <h2 className="co-h">{t.checkout.how}</h2>
                <Options value={fulfilment} onChange={setFulfilment} aria-label={t.checkout.how}>
                  {branchPickup ? (
                    <Option value="branch" id="ship-branch">
                      <div>
                        <b>{t.checkout.branch}</b>
                        <span>{t.checkout.branchSub}</span>
                        <u>{t.checkout.free}</u>
                      </div>
                    </Option>
                  ) : null}
                  <Option value="delivery" id="ship-delivery">
                    <div>
                      <b>{t.checkout.delivery}</b>
                      <span>{t.checkout.deliverySub}</span>
                      <u>{zone ? `${pounds(zone.costPiastres)} ${t.product.egp}` : "—"}</u>
                    </div>
                  </Option>
                </Options>
                {deliveryBlocked && <p className="notice">{t.checkout.errNoZone}</p>}
                {fulfilment === "delivery" && (
                  <label className="chk">
                    <Check checked={otherAddress} onChange={setOtherAddress} />
                    <span>{t.checkout.otherAddress}</span>
                  </label>
                )}
                {wantsOtherAddress && (
                  <label className="f wide" style={{ marginTop: "var(--s2)" }}>
                    <span>{t.checkout.deliveryAddress}</span>
                    <textarea id="co-deliveryAddress" maxLength={500} required placeholder={t.checkout.deliveryAddressPh} aria-invalid={Boolean(errors.deliveryAddress)} className={bad("deliveryAddress")} value={form.deliveryAddress} onChange={set("deliveryAddress")} />
                  </label>
                )}

                <h2 className="co-h">{t.checkout.payment}</h2>
                {/* "" leaves every option unticked until the customer picks one */}
                <Options value={payment ?? ("" as PaymentMethod)} onChange={setPicked} aria-label={t.checkout.payment}>
                  {offers("instapay") && (
                    <Option value="instapay" id="pay-instapay">
                      <div>
                        <b>{t.checkout.instapay}</b>
                        <span>{t.checkout.instapaySub}</span>
                      </div>
                    </Option>
                  )}
                  {offers("bank") && (
                    <Option value="bank" id="pay-bank">
                      <div>
                        <b>{t.checkout.bank}</b>
                        <span>{t.checkout.bankSub}</span>
                      </div>
                    </Option>
                  )}
                </Options>
                <div className="pay-note">{t.checkout.payNote}</div>
              </div>

              {/* the receipt: what is bought, what it costs, and the one button */}
              <aside>
                <div className="order">
                  <h3>{t.checkout.summary}</h3>
                  <div aria-live="polite" aria-busy={hasLines && !quoteFresh && !quoteFailed}>
                    {!hasLines ? (
                      <div className="o-empty">{t.checkout.empty}</div>
                    ) : quote ? (
                      quote.lines.map((line) => (
                        <div className="ol" key={line.productId}>
                          <MiniArt category={line.category} photo={line.imageId ? `/api/products/${line.productId}/images/${line.imageId}` : undefined} className="ol-art" />
                          {/* the quantity is written before the weight and shown after it: "Gold bar ¼g × 2" */}
                          <b>
                            <span>{productName(line, locale)}</span>
                            {line.qty > 1 ? <span className="ol-qty"> × {line.qty}</span> : null} <span>{shortWeight(line.weightGrams, t)}</span>
                          </b>
                          <em>
                            {pounds(line.lineTotalPiastres)} <small className="egp">{t.product.egp}</small>
                          </em>
                          <i>{productPurity(line, t)}</i>
                          <Button type="button" className="drop" aria-label={fmt(t.checkout.removeLabel, { name: productName(line, locale) })} onClick={() => cart.removeOne(line.productId)}>
                            {t.checkout.remove}
                          </Button>
                        </div>
                      ))
                    ) : quoteFailed ? null : (
                      <div className="o-empty">{t.checkout.updating}</div>
                    )}
                    {quoteFailed && (
                      <div className="o-empty" role="alert">
                        {t.checkout.errQuote}{" "}
                        <Button type="button" className="peek" onClick={() => setRetry((n) => n + 1)}>
                          {t.checkout.retry}
                        </Button>
                      </div>
                    )}
                  </div>
                  {notice && <p className="notice">{notice}</p>}

                  <div className="o-line">
                    <span>{t.checkout.subtotal}</span>
                    <div className="money">
                      <b>{quote ? pounds(quote.subtotalPiastres) : "0"}</b> <small className="egp">{t.product.egp}</small>
                    </div>
                  </div>
                  <div className="o-line">
                    <span>{t.checkout.handling}</span>
                    {quote && quote.handlingPiastres !== 0 ? (
                      <div className="money">
                        <b>{pounds(quote.handlingPiastres)}</b> <small className="egp">{t.product.egp}</small>
                      </div>
                    ) : (
                      <b>{t.checkout.free}</b>
                    )}
                  </div>
                  {handlingParts.length > 0 && <p className="o-sub">{handlingParts.join(" · ")}</p>}
                  <div className="o-total">
                    <span>{t.checkout.total}</span>
                    <div className="money">
                      <b>{quote ? pounds(quote.totalPiastres) : "0"}</b> <small className="egp">{t.product.egp}</small>
                    </div>
                  </div>

                  {deliveryBlocked && <p className="notice">{t.checkout.errNoZone}</p>}
                  {quote && quote.outOfStock.length > 0 && <p className="notice">{t.checkout.errStock}</p>}
                  {quote?.trading === "paused" && <p className="notice">{t.checkout.errPaused}</p>}
                  {quote?.trading === "closed" && <p className="notice">{t.checkout.errStoreClosed}</p>}

                  <label className={`chk${errors.terms ? " bad" : ""}`}>
                    <Check
                      checked={terms}
                      onChange={(checked) => {
                        setTerms(checked);
                        setErrors((prev) => ({ ...prev, terms: undefined }));
                      }}
                    />
                    <span>
                      {termsBefore}
                      <Link href={href("/terms")} target="_blank" style={{ textDecoration: "underline" }}>
                        {t.checkout.termsWord}
                      </Link>
                      {termsBetween}
                      <Link href={href("/privacy")} target="_blank" style={{ textDecoration: "underline" }}>
                        {t.checkout.privacyWord}
                      </Link>
                      {termsAfter}
                    </span>
                  </label>

                  {message && (
                    <div className="co-err" role="alert">
                      <i aria-hidden="true">!</i>
                      <span>{message}</span>
                    </div>
                  )}

                  <Button className="place" type="button" onClick={() => void place()} disabled={busy || (hasLines && !quoteFresh)}>
                    {busy ? t.checkout.placing : t.checkout.place}
                  </Button>
                  <p className="co-legal">{t.checkout.priceLegal}</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
