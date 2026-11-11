import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage, contentMetadata } from "@/components/content-page";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

// /policies/shipping and /policies/buyback (PG-16); any other policy is a 404.
const POLICIES = { shipping: "policies-shipping", buyback: "policies-buyback" } as const;
type Policy = keyof typeof POLICIES;
const isPolicy = (value: string): value is Policy => value in POLICIES;

export async function generateMetadata({ params }: PageProps<"/[locale]/policies/[policy]">): Promise<Metadata> {
  const { locale, policy } = await params;
  if (!hasLocale(locale) || !isPolicy(policy)) return {};
  const t = await getTexts(locale);
  return contentMetadata(locale, POLICIES[policy], `/policies/${policy}`, t.seoNames[policy]);
}

export default async function PolicyPage({ params }: PageProps<"/[locale]/policies/[policy]">) {
  const { locale, policy } = await params;
  if (!hasLocale(locale) || !isPolicy(policy)) notFound();
  const t = await getTexts(locale);
  return (
    <ContentPage
      locale={locale}
      pageKey={POLICIES[policy]}
      path={`/policies/${policy}`}
      title={policy === "shipping" ? t.pages.shippingTitle : t.pages.buybackTitle}
      fallback={policy === "shipping" ? t.pages.shippingText : t.pages.buybackText}
    />
  );
}
