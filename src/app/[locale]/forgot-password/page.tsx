import { notFound } from "next/navigation";
import { ForgotForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/AuthShell";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  return (
    <AuthShell locale={locale} t={t} title={t.auth.forgotTitle} sub={t.auth.forgotSub}>
      <ForgotForm />
    </AuthShell>
  );
}
