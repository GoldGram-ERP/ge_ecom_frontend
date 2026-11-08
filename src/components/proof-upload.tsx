"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useRef, useState } from "react";
import { Button } from "./controls";
import { useI18n } from "./Providers";

/** The same limits the server enforces, so a wrong file is refused before it is sent. */
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Sends the customer's transfer screenshot for one of their orders. The staff see every picture
 * beside the order (a top-up after a new price is kept beside the first payment). `label` names
 * the button when the screenshot is for a remaining amount.
 */
export function ProofUpload({
  orderId,
  sent = false,
  label,
  guestToken,
}: {
  orderId: number;
  sent?: boolean;
  label?: string;
  /** A guest's order is opened by its token instead of a session. */
  guestToken?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent">(sent ? "sent" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function send(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // so that picking the same file again still counts as a change
    event.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      setError(t.checkout.proofErrType);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t.checkout.proofErrSize);
      return;
    }
    const before = state;
    setState("sending");
    setError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`/api/orders/${orderId}/proof`, {
        method: "POST",
        body,
        headers: guestToken ? { "X-Order-Token": guestToken } : undefined,
      });
      if (!response.ok) throw new Error(String(response.status));
      setState("sent");
      // the account's amounts (paid, remaining, to pay) are worked out on the server
      router.refresh();
    } catch {
      setState(before);
      setError(t.checkout.proofErrSend);
    }
  }

  return (
    <div className="proof">
      {/* The browser's own file control stays hidden; the button opens its picker. */}
      <input ref={picker} type="file" accept={TYPES.join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={send} />
      <Button type="button" className="proof-btn" disabled={state === "sending"} onClick={() => picker.current?.click()}>
        {state === "sending" ? t.checkout.proofSending : state === "sent" ? t.checkout.proofReplace : (label ?? t.checkout.proofSend)}
      </Button>
      <span className={`proof-note${error ? " bad" : state === "sent" ? " ok" : ""}`} aria-live="polite">
        {error ?? (state === "sent" ? t.checkout.proofSent : t.checkout.proofHint)}
      </span>
    </div>
  );
}

/**
 * The step right after an order is placed: the customer writes the reference number of their
 * transfer and picks the screenshot, then one button sends both. `onSent` runs once the server
 * has them, so the page can hide this form and move on.
 */
export function PaymentConfirm({
  orderId,
  guestToken,
  onSent,
}: {
  orderId: number;
  /** A guest's order is opened by its token instead of a session. */
  guestToken?: string;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const picker = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    if (!TYPES.includes(chosen.type)) return setError(t.checkout.proofErrType);
    if (chosen.size > MAX_BYTES) return setError(t.checkout.proofErrSize);
    setError(null);
    setFile(chosen);
  }

  async function submit() {
    const text = reference.trim();
    if (text.length < 2) return setError(t.checkout.confirmErrRef);
    if (!file) return setError(t.checkout.confirmErrFile);
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("reference", text);
    body.append("file", file);
    try {
      const response = await fetch(`/api/orders/${orderId}/proof`, {
        method: "POST",
        body,
        headers: guestToken ? { "X-Order-Token": guestToken } : undefined,
      });
      if (!response.ok) throw new Error(String(response.status));
      onSent();
    } catch {
      setError(t.checkout.proofErrSend);
      setBusy(false);
    }
  }

  return (
    <div className="pay-confirm">
      <h3>{t.checkout.confirmTitle}</h3>
      <p>{t.checkout.confirmHint}</p>
      <label className="f wide">
        <span>
          {t.checkout.paymentReference}
          <em>*</em>
        </span>
        <input id="co-paymentReference" dir="ltr" type="text" autoComplete="off" maxLength={60} placeholder={t.checkout.paymentReferencePh} value={reference} onChange={(event) => setReference(event.target.value)} />
      </label>
      <div className="proof">
        {/* The browser's own file control stays hidden; the button opens its picker. */}
        <input ref={picker} type="file" accept={TYPES.join(",")} hidden tabIndex={-1} aria-hidden="true" onChange={pick} />
        <Button type="button" className="proof-btn" disabled={busy} onClick={() => picker.current?.click()}>
          {file ? t.checkout.proofReplace : t.checkout.proofSend}
        </Button>
        <span className="proof-note" dir="auto">{file ? file.name : t.checkout.proofHint}</span>
      </div>
      {error && <p className="proof-note bad" role="alert">{error}</p>}
      <Button type="button" className="gold-btn" disabled={busy} onClick={() => void submit()}>
        {busy ? t.checkout.confirmSending : t.checkout.confirmSend}
      </Button>
    </div>
  );
}
