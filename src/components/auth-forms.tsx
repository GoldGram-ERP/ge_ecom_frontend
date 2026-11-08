"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, CLAIM_KEY, errorText } from "@/lib/client-api";
import { isEmail, isPassword, normalizePhone } from "@/lib/validation";
import { useI18n, useSession } from "./Providers";
import { Button } from "./controls";

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.4" />
    <path d="M4.8 20c.9-3.4 3.8-5.2 7.2-5.2s6.3 1.8 7.2 5.2" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="10.5" width="14" height="9" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="3" width="10" height="18" rx="2.2" />
    <path d="M11 17.6h2" />
  </svg>
);

function Alert({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <div className={`alert${ok ? " ok" : ""}`} role={ok ? "status" : "alert"}>
      <i aria-hidden="true">{ok ? "✓" : "!"}</i>
      <span>{text}</span>
    </div>
  );
}

function PasswordField(props: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <label className="field">
      <span>{props.label}</span>
      <div className="input">
        <LockIcon />
        <input
          type={shown ? "text" : "password"}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete}
          maxLength={128}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
        <Button className="peek" type="button" aria-label={shown ? t.auth.hideLabel : t.auth.showLabel} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
          {shown ? t.auth.hide : t.auth.show}
        </Button>
      </div>
      {props.hint && <small className="field-hint">{props.hint}</small>}
    </label>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <label className="field">
      <span>{t.auth.email}</span>
      <div className="input">
        <PersonIcon />
        <input type="email" dir="ltr" placeholder={t.auth.emailPh} autoComplete="email" maxLength={254} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  );
}

export function SignInForm({ toCheckout = false }: { toCheckout?: boolean }) {
  const { t, href } = useI18n();
  const { refresh } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(t.auth.errMissing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/auth/login", { body: { email: email.trim().toLowerCase(), password } });
      await refresh();
      router.push(href(toCheckout ? "/checkout" : "/account"));
      router.refresh();
    } catch (err) {
      const invalid = err instanceof ApiError && (err.code === "INVALID_CREDENTIALS" || err.code === "VALIDATION_FAILED");
      const suspended = err instanceof ApiError && err.code === "ACCOUNT_SUSPENDED";
      setError(suspended ? t.auth.errSuspended : invalid ? t.auth.errCredentials : errorText(err, t));
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit} noValidate>
      {error && <Alert text={error} />}
      <EmailField value={email} onChange={setEmail} />
      <PasswordField label={t.auth.password} placeholder={t.auth.passwordPh} value={password} onChange={setPassword} autoComplete="current-password" />

      <Button className="login-btn" type="submit" disabled={busy}>
        {busy ? t.auth.signingIn : t.auth.signIn}
      </Button>
      {!toCheckout && (
        <>
          <Button className="guest-btn" type="button" onClick={() => router.push(href("/account"))}>
            {t.auth.guest}
          </Button>
          <p className="guest-note">{t.auth.guestNote}</p>
        </>
      )}
      <Link className="forgot" href={href("/forgot-password")}>
        {t.auth.forgot}
      </Link>
      <div className="no-account">
        {t.auth.noAccount} <Link href={href(toCheckout ? "/sign-up?next=checkout" : "/sign-up")}>{t.auth.create}</Link>
      </div>
    </form>
  );
}

/** `email` and `mobile` arrive filled in when a guest's order offered this account. */
export function SignUpForm({
  toCheckout = false,
  initialFirstName = "",
  initialLastName = "",
  initialEmail = "",
  initialMobile = "",
}: {
  toCheckout?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail?: string;
  initialMobile?: string;
}) {
  const { locale, t, href } = useI18n();
  const { refresh } = useSession();
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [mobile, setMobile] = useState(initialMobile);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set when the server asks for an emailed code first; then the form becomes the code step.
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const phone = normalizePhone(mobile);
    if (!firstName.trim() || !lastName.trim()) return setError(t.auth.errName);
    if (!isEmail(email)) return setError(t.auth.errEmail);
    if (!phone) return setError(t.auth.errMobile);
    if (!isPassword(password)) return setError(t.auth.errPassword);

    setBusy(true);
    setError(null);
    try {
      // The guest order placed from this tab joins the account (the server checks the email matches).
      const claimToken = sessionStorage.getItem(CLAIM_KEY) ?? undefined;
      const res = await api<{ otpRequired?: boolean; email?: string }>("/auth/register", { body: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), mobile: phone, password, locale, claimToken } });
      sessionStorage.removeItem(CLAIM_KEY);
      if (res.otpRequired) {
        // Account made, not signed in yet: ask for the emailed code.
        setOtpEmail(res.email ?? email.trim().toLowerCase());
        setBusy(false);
        return;
      }
      await refresh();
      router.push(href(toCheckout ? "/checkout" : "/account"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") setError(t.auth.errEmailTaken);
      else if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
        const fields = (Array.isArray(err.details) ? err.details : []) as { field?: string }[];
        const first = fields[0]?.field;
        setError(first === "mobile" ? t.auth.errMobile : first === "password" ? t.auth.errPassword : t.auth.errEmail);
      } else setError(errorText(err, t));
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setError(t.auth.errOtp);
    setBusy(true);
    setError(null);
    try {
      await api("/auth/register/verify", { body: { email: otpEmail, code: code.trim() } });
      await refresh();
      router.push(href(toCheckout ? "/checkout" : "/account"));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.code === "OTP_INVALID" ? t.auth.errOtp : errorText(err, t));
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setResent(false);
    try {
      await api("/auth/register/resend", { body: { email: otpEmail, locale } });
      setResent(true);
    } catch (err) {
      setError(errorText(err, t));
    }
  }

  if (otpEmail) {
    return (
      <form className="login-card" onSubmit={verifyCode} noValidate>
        {error && <Alert text={error} />}
        {resent && <Alert ok text={t.auth.otpResent} />}
        <p className="guest-note">
          {t.auth.otpSent} <b dir="ltr">{otpEmail}</b>
        </p>
        <label className="field">
          <span>{t.auth.otpLabel}</span>
          <div className="input">
            <LockIcon />
            <input dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="------" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
        </label>
        <Button className="login-btn" type="submit" disabled={busy}>
          {busy ? t.auth.verifying : t.auth.verify}
        </Button>
        <Button className="guest-btn" type="button" onClick={resend}>
          {t.auth.resend}
        </Button>
      </form>
    );
  }

  return (
    <form className="login-card" onSubmit={submit} noValidate>
      {error && <Alert text={error} />}
      <label className="field">
        <span>{t.checkout.firstName}</span>
        <div className="input">
          <PersonIcon />
          <input type="text" autoComplete="given-name" maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
      </label>
      <label className="field">
        <span>{t.checkout.lastName}</span>
        <div className="input">
          <PersonIcon />
          <input type="text" autoComplete="family-name" maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </label>
      <EmailField value={email} onChange={setEmail} />
      <label className="field">
        <span>{t.auth.mobile}</span>
        <div className="input">
          <PhoneIcon />
          <input type="tel" dir="ltr" placeholder={t.auth.mobilePh} autoComplete="tel" maxLength={20} value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </div>
      </label>
      <PasswordField label={t.auth.password} placeholder={t.auth.newPasswordPh} value={password} onChange={setPassword} autoComplete="new-password" hint={t.auth.passwordRule} />

      <Button className="login-btn" type="submit" disabled={busy}>
        {busy ? t.auth.creating : t.auth.createAccount}
      </Button>
      <div className="no-account">
        {t.auth.haveAccount} <Link href={href(toCheckout ? "/sign-in?next=checkout" : "/sign-in")}>{t.auth.signIn}</Link>
      </div>
    </form>
  );
}

export function ForgotForm() {
  const { locale, t, href } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) return setError(t.auth.errEmail);
    setBusy(true);
    setError(null);
    try {
      await api("/auth/forgot", { body: { email: email.trim().toLowerCase(), locale } });
      setSent(true);
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit} noValidate>
      {error && <Alert text={error} />}
      {sent ? (
        <Alert ok text={t.auth.forgotSent} />
      ) : (
        <>
          <EmailField value={email} onChange={setEmail} />
          <Button className="login-btn" type="submit" disabled={busy}>
            {busy ? t.auth.sending : t.auth.sendLink}
          </Button>
        </>
      )}
      <Link className="forgot" href={href("/sign-in")}>
        {t.auth.backToSignIn}
      </Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t, href } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"form" | "done" | "invalid">(token ? "form" : "invalid");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPassword(password)) return setError(t.auth.errPassword);
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset", { body: { token, password } });
      setState("done");
    } catch (err) {
      if (err instanceof ApiError && err.code === "TOKEN_INVALID") setState("invalid");
      else if (err instanceof ApiError && err.code === "VALIDATION_FAILED") setError(t.auth.errPassword);
      else setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (state === "done") {
    return (
      <div className="login-card">
        <Alert ok text={t.auth.resetDone} />
        <Link className="login-btn" href={href("/sign-in")} style={{ display: "block", textAlign: "center" }}>
          {t.auth.signIn}
        </Link>
      </div>
    );
  }
  if (state === "invalid") {
    return (
      <div className="login-card">
        <Alert text={t.auth.resetInvalid} />
        <Link className="forgot" href={href("/forgot-password")} style={{ marginTop: 0 }}>
          {t.auth.requestNew}
        </Link>
      </div>
    );
  }
  return (
    <form className="login-card" onSubmit={submit} noValidate>
      {error && <Alert text={error} />}
      <PasswordField label={t.auth.newPassword} placeholder={t.auth.newPasswordPh} value={password} onChange={setPassword} autoComplete="new-password" hint={t.auth.passwordRule} />
      <Button className="login-btn" type="submit" disabled={busy}>
        {busy ? t.auth.saving : t.auth.savePassword}
      </Button>
    </form>
  );
}

/** The account's "Change password": the current password, then the new one. This browser stays signed in. */
export function ChangePasswordForm() {
  const { t, href } = useI18n();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return setError(t.auth.errCurrentMissing);
    if (!isPassword(password)) return setError(t.auth.errPassword);
    setBusy(true);
    setError(null);
    try {
      await api("/auth/password", { body: { currentPassword: current, password } });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PASSWORD_WRONG") setError(t.auth.errCurrentWrong);
      else if (err instanceof ApiError && err.code === "VALIDATION_FAILED") setError(t.auth.errPassword);
      else setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="login-card">
        <Alert ok text={t.auth.changeDone} />
        <Link className="login-btn" href={href("/account?tab=profile")} style={{ display: "block", textAlign: "center" }}>
          {t.auth.backToProfile}
        </Link>
      </div>
    );
  }
  return (
    <form className="login-card" onSubmit={submit} noValidate>
      {error && <Alert text={error} />}
      <PasswordField label={t.auth.currentPassword} placeholder={t.auth.passwordPh} value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordField label={t.auth.newPassword} placeholder={t.auth.newPasswordPh} value={password} onChange={setPassword} autoComplete="new-password" hint={t.auth.passwordRule} />
      <Button className="login-btn" type="submit" disabled={busy}>
        {busy ? t.auth.saving : t.auth.savePassword}
      </Button>
      <Link className="forgot" href={href("/forgot-password")}>
        {t.auth.forgot}
      </Link>
    </form>
  );
}
