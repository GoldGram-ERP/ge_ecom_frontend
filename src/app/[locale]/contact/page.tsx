import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactRows } from "@/components/chrome";
import { ContentPage, contentMetadata } from "@/components/content-page";
import { hasLocale } from "@/i18n";
import { jewelryStoreJsonLd } from "@/lib/seo";
import { getBusiness } from "@/lib/seo-data";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return contentMetadata(locale, "contact", "/contact", (await getTexts(locale)).seoNames.contact);
}

// The contact page (PG-15): every way to reach us from the business details, and the store (SCH-04).
export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, business] = await Promise.all([getTexts(locale), getBusiness()]);
  return (
    <ContentPage locale={locale} pageKey="contact" path="/contact" title={t.pages.contactTitle} fallback={t.pages.contactText} jsonLd={[jewelryStoreJsonLd(business, locale)]}>
      <section className="pr-sec">
        <h2>{t.contact.title}</h2>
        <ContactRows t={t} locale={locale} />
      </section>
    </ContentPage>
  );
}
