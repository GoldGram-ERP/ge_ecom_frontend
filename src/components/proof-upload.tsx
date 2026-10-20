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
