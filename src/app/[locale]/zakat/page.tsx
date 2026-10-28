import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ZakatCalculator } from "@/components/ZakatCalculator";
import { fmt, hasLocale } from "@/i18n";
import { getPricesOrNull } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import { ZAKAT_PERCENT } from "@/lib/zakat";
import "../../styles/zakat.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/zakat">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.zakat.title} · GoldGram`, description: fmt(t.zakat.sub, { rate: ZAKAT_PERCENT }) };
}

export default async function ZakatPage({ params }: PageProps<"/[locale]/zakat">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, prices] = await Promise.all([getTexts(locale), getPricesOrNull()]);

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off pr-band">
        <div className="wrap">
          <nav className="pr-crumb" aria-label={t.zakat.crumb}>
            <Link href={localePath(locale, ``)}>{t.prices.crumbHome}</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{t.zakat.crumb}</span>
          </nav>

          <section className="pr-head">
            <h1>{t.zakat.title}</h1>
            <p className="pr-summary">{fmt(t.zakat.sub, { rate: ZAKAT_PERCENT })}</p>
          </section>

          <ZakatCalculator initial={prices} />

          <div className="pr-sec pr-read">
            <section>
              <h2>{t.zakat.hawlTitle}</h2>
              <p>{t.zakat.hawlText}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
