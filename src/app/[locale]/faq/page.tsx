import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactRows } from "@/components/chrome";
import { SiteHeader } from "@/components/header-client";
import { HelpCentre } from "@/components/HelpCentre";
import { EntryHeadCode, entryH1, JsonLd } from "@/components/seo-blocks";
import { getHelp } from "@/content/help";
import { hasLocale } from "@/i18n";
import { breadcrumbList, faqPageJsonLd } from "@/lib/seo";
import { getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return seoMetadata({ locale, path: "/faq", type: "faq", entryType: "static", key: "faq", vars: { ...priceVars(null, locale), name: t.help.kicker } });
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, entry] = await Promise.all([getTexts(locale), getSeoEntry("static", "faq")]);
  const content = getHelp(locale);
  // Every question and its answer, as shown (SCH-06); "to confirm" parts stay out of the answers.
  const items = content.items.map((item) => ({ q: item.q, a: item.a.filter((part): part is string => typeof part === "string").join(" ").trim() }));

  return (
    <div className="hc-page">
      <JsonLd
        data={[
          faqPageJsonLd(items),
          breadcrumbList([
            { name: t.pdp.home, path: "/", locale },
            { name: entry?.breadcrumbLabel?.[locale] || t.help.kicker, path: "/faq", locale },
          ]),
        ]}
      />
      <EntryHeadCode entry={entry} />
      <SiteHeader />

      <HelpCentre content={content} h1={entryH1(entry, locale, t.help.title)} />

      <div className="wrap">
        <div className="hc-help" id="reach">
          <h2>{t.help.still}</h2>
          <ContactRows t={t} locale={locale} branchLast />

          <div className="hc-note">
            <h3>{t.help.noteTitle}</h3>
            <p>{t.help.noteText}</p>
          </div>
        </div>

        <footer>
          <p>{t.footer.short}</p>
        </footer>
      </div>
    </div>
  );
}
