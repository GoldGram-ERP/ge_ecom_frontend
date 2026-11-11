import Link from "next/link";
import { localePath } from "@/i18n";
import type { Dict, Locale } from "@/i18n";
import { SiteHeader } from "./header-client";

/** The prototype's sign-in screen, reused as is by the screens it links to (sign up, forgot and reset password). */
export function AuthShell(props: {
  locale: Locale;
  t: Dict;
  title: string;
  sub: string;
  children: React.ReactNode;
  /** The "What happens next" steps (sign up shows all three; sign in leaves out creating the account). */
  steps?: string[];
}) {
  const { locale, t } = props;
  return (
    <div className="page shop-page">
      <SiteHeader />

      <div className="login-wrap">
        <div className="wrap login-in">
          <h1 className="login-title">{props.title}</h1>
          <p className="login-sub">{props.sub}</p>

          {props.children}

          {props.steps && (
            <div className="next-up">
              <h3>{t.auth.nextTitle}</h3>
              {props.steps.map((step, i) => (
                <div className="nx" key={step}>
                  <span>{i + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          )}

          <div className="login-legal">
            <Link href={localePath(locale, `/terms`)}>{t.auth.terms}</Link> · <Link href={localePath(locale, `/privacy`)}>{t.auth.privacy}</Link> ·{" "}
            <Link href={localePath(locale, `/faq`)}>{t.auth.help}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
