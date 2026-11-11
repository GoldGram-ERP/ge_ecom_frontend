import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage, contentMetadata } from "@/components/content-page";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return contentMetadata(locale, "about", "/about", (await getTexts(locale)).seoNames.about);
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  return <ContentPage locale={locale} pageKey="about" path="/about" title={t.pages.aboutTitle} fallback={t.pages.aboutText} />;
}
