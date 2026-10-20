import { notFound } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/AuthShell";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  // Set when checkout sent the visitor here: go back there afterwards.
  const toCheckout = (await searchParams).next === "checkout";
  return (
    <AuthShell locale={locale} t={t} title={t.auth.signInTitle} sub={t.auth.signInSub} steps={t.auth.next.slice(1)}>
      <SignInForm toCheckout={toCheckout} />
    </AuthShell>
  );
}
