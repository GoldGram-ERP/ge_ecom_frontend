import { notFound } from "next/navigation";
import { PlainPage } from "@/components/PlainPage";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

// The legal text has not been written yet; the page says so in the prototype's own "to confirm" style.
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  return (
    <PlainPage title={t.legal.privacyTitle}>
      <p>
        <span className="tbc">{t.legal.pending}</span>
      </p>
    </PlainPage>
  );
}
