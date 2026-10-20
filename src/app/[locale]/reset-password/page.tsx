import { notFound } from "next/navigation";
import { ResetForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/AuthShell";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

// Opened from the emailed link: /{locale}/reset-password?token=... (also used to set the
// first password of an account created at checkout).
export default async function ResetPasswordPage({ params, searchParams }: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const { token } = await searchParams;
  return (
    <AuthShell locale={locale} t={t} title={t.auth.resetTitle} sub={t.auth.resetSub}>
      <ResetForm token={typeof token === "string" ? token : ""} />
    </AuthShell>
  );
}
