import { notFound } from "next/navigation";
import { SignUpForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/AuthShell";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

export default async function SignUpPage({ params, searchParams }: PageProps<"/[locale]/sign-up">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  // Set when checkout sent the visitor here: go back there afterwards.
  const query = await searchParams;
  const toCheckout = query.next === "checkout";
  // A guest's order sends its email and mobile, so the account is one password away.
  const text = (value: string | string[] | undefined) => (typeof value === "string" ? value.slice(0, 254) : "");
  return (
    <AuthShell locale={locale} t={t} title={t.auth.signUpTitle} sub={t.auth.signUpSub} steps={t.auth.next}>
      <SignUpForm toCheckout={toCheckout} initialFirstName={text(query.firstName).slice(0, 60)} initialLastName={text(query.lastName).slice(0, 60)} initialEmail={text(query.email)} initialMobile={text(query.mobile)} />
    </AuthShell>
  );
}
