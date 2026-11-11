import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { EntryFaq, EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { ZakatCalculator } from "@/components/ZakatCalculator";
import { fmt, hasLocale } from "@/i18n";
import { breadcrumbList } from "@/lib/seo";
import { getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getPricesOrNull } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import { ZAKAT_PERCENT } from "@/lib/zakat";
import "../../styles/zakat.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/zakat-calculator">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const [t, prices] = await Promise.all([getTexts(locale), getPricesOrNull()]);
  const vars = priceVars(prices, locale);
  return seoMetadata({
    locale,
    path: "/zakat-calculator",
    type: "static",
    entryType: "static",
    key: "zakat-calculator",
    vars: { ...vars, name: fmt(t.seoNames.zakat, { year: vars.year }) },
  });
}

export default async function ZakatPage({ params }: PageProps<"/[locale]/zakat-calculator">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, prices, entry] = await Promise.all([getTexts(locale), getPricesOrNull(), getSeoEntry("static", "zakat-calculator")]);

  return (
    <div className="page buy-page">
      <JsonLd
        data={breadcrumbList([
          { name: t.prices.crumbHome, path: "/", locale },
          { name: entry?.breadcrumbLabel?.[locale] || t.zakat.crumb, path: "/zakat-calculator", locale },
        ])}
      />
      <EntryHeadCode entry={entry} />
      <SiteHeader />
      <div className="band-off pr-band">
        <div className="wrap">
          <nav className="pr-crumb" aria-label={t.zakat.crumb}>
            <Link href={localePath(locale, ``)}>{t.prices.crumbHome}</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{entry?.breadcrumbLabel?.[locale] || t.zakat.crumb}</span>
          </nav>

          <section className="pr-head">
            <h1>{entryH1(entry, locale, t.zakat.title)}</h1>
            <p className="pr-summary">{fmt(t.zakat.sub, { rate: ZAKAT_PERCENT })}</p>
            <EntryIntro entry={entry} locale={locale} />
          </section>

          <ZakatCalculator initial={prices} />

          <div className="pr-sec pr-read">
            <section>
              <h2>{t.zakat.hawlTitle}</h2>
              <p>{t.zakat.hawlText}</p>
            </section>
          </div>
          <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
        </div>
      </div>
    </div>
  );
}
