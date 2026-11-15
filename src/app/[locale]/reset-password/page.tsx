import type { Metadata } from "next";
import { routeParams } from "@/lib/seo";
import { requestMetadata } from "@/lib/seo-page";
import { notFound } from "next/navigation";
import { ResetForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/AuthShell";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

// Rendered per request (it reads the visitor's request), never cached.
export const dynamic = "force-dynamic";

// Opened from the emailed link: /{locale}/reset-password?token=... (also used to set the
// first password of an account created at checkout).
export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) return {};
  return { ...(await requestMetadata(locale)), title: `${(await getTexts(locale)).auth.resetTitle} · GoldGram` };
}

export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[locale]/reset-password">) {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const { token } = await searchParams;
  return (
    <AuthShell locale={locale} t={t} title={t.auth.resetTitle} sub={t.auth.resetSub}>
      <ResetForm token={typeof token === "string" ? token : ""} />
    </AuthShell>
  );
}
