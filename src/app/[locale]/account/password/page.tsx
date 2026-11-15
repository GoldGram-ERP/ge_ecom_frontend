import type { Metadata } from "next";
import { routeParams } from "@/lib/seo";
import { requestMetadata } from "@/lib/seo-page";
import { localePath } from "@/i18n";
import { notFound, redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/AuthShell";
import { hasLocale } from "@/i18n";
import { getUser } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

// Rendered per request (it reads the visitor's request), never cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/password">): Promise<Metadata> {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) return {};
  return { ...(await requestMetadata(locale)), title: `${(await getTexts(locale)).auth.changeTitle} · GoldGram` };
}

// Opened from the account's Profile tab. Signed-out visitors sign in first.
export default async function ChangePasswordPage({ params }: PageProps<"/[locale]/account/password">) {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) notFound();
  if (!(await getUser())) redirect(localePath(locale, `/sign-in`));
  const t = await getTexts(locale);
  return (
    <AuthShell locale={locale} t={t} title={t.auth.changeTitle} sub={t.auth.changeSub}>
      <ChangePasswordForm />
    </AuthShell>
  );
}
