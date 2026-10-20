import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactRows } from "@/components/chrome";
import { SiteHeader } from "@/components/header-client";
import { HelpCentre } from "@/components/HelpCentre";
import { getHelp } from "@/content/help";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/help">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: t.meta.helpTitle, description: t.meta.helpDescription };
}

export default async function HelpPage({ params }: PageProps<"/[locale]/help">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);

  return (
    <div className="hc-page">
      <SiteHeader />

      <HelpCentre content={getHelp(locale)} />

      <div className="wrap">
        <div className="hc-help" id="reach">
          <h2>{t.help.still}</h2>
          <ContactRows t={t} branchLast />

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
