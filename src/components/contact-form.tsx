"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { api, ApiError, errorText } from "@/lib/client-api";
import { contactFormError } from "@/lib/home-rules";
import { Button } from "./controls";
import { useI18n } from "./Providers";

/** The branch map (PG-15): nothing is loaded from the map provider until the visitor asks for it. */
export function ContactMap({ src }: { src: string }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <div className="map-box">
      {shown ? (
        <iframe src={src} title={t.contactForm.mapTitle} loading="lazy" referrerPolicy="no-referrer" allowFullScreen />
      ) : (
        <button type="button" onClick={() => setShown(true)}>
          {t.contactForm.map}
        </button>
      )}
    </div>
  );
}

const EMPTY = { name: "", contact: "", message: "", website: "" };

/**
 * The contact form (PG-15): name, an email or mobile, and a message, posted as JSON to the API,
 * which emails the business. What was typed is never drawn back into the page, and the analytics
 * event carries none of it.
 */
export function ContactForm() {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const bad = contactFormError(form);
    if (bad) {
      setResult({ ok: false, text: { name: t.contactForm.badName, contact: t.contactForm.badContact, message: t.contactForm.badMessage }[bad] });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      await api("/contact", { body: form });
      trackEvent("contact_form_submit", { placement: "contact_page" });
      setForm(EMPTY);
      setResult({ ok: true, text: t.contactForm.sent });
    } catch (error) {
      const text =
        error instanceof ApiError && error.code === "VALIDATION_FAILED"
          ? t.contactForm.refused
          : error instanceof ApiError && error.code === "CONTACT_UNAVAILABLE"
            ? t.contactForm.unavailable
            : error instanceof ApiError && error.status === 429
              ? t.contactForm.rate
              : errorText(error, t);
      setResult({ ok: false, text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={send} noValidate>
      {result && (
        <div className={`alert${result.ok ? " ok" : ""}`} role={result.ok ? "status" : "alert"}>
          <i aria-hidden="true">{result.ok ? "✓" : "!"}</i>
          <span>{result.text}</span>
        </div>
      )}
      <div className="ff">
        <label className="f">
          <span>{t.contactForm.name}</span>
          <input name="name" autoComplete="name" maxLength={80} value={form.name} onChange={set("name")} required />
        </label>
        <label className="f">
          <span>{t.contactForm.contact}</span>
          <input name="contact" autoComplete="email" maxLength={254} dir="ltr" value={form.contact} onChange={set("contact")} required />
        </label>
        <label className="f wide">
          <span>{t.contactForm.message}</span>
          <textarea name="message" rows={5} maxLength={2000} value={form.message} onChange={set("message")} required />
        </label>
        {/* The honeypot: people never see or reach it, so a filled one is a robot. */}
        <div className="vh" aria-hidden="true">
          <input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
        </div>
      </div>
      <Button className="login-btn" type="submit" disabled={busy}>
        {busy ? t.contactForm.sending : t.contactForm.send}
      </Button>
    </form>
  );
}
