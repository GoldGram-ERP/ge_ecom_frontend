import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ArticleCards, articleTitle, guidePath } from "@/components/home-sections";
import { EntryFaq, EntryHeadCode, entryH1, EntryIntro, JsonLd } from "@/components/seo-blocks";
import { fmt, hasLocale, localePath } from "@/i18n";
import { breadcrumbList, itemListJsonLd, pageNumber } from "@/lib/seo";
import { getSeoEntry, priceVars } from "@/lib/seo-data";
import { requestQuery, seoMetadata } from "@/lib/seo-page";
import { getArticles } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

/** Guides per page of the listing (IDX-07: ?page=2 and on are real, self-canonical pages). */
const PER_PAGE = 12;

export async function generateMetadata({ params }: PageProps<"/[locale]/guides">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return seoMetadata({ locale, path: "/guides", type: "guides", entryType: "static", key: "guides", vars: { ...priceVars(null, locale), name: t.nav.guides } });
}

export default async function GuidesPage({ params }: PageProps<"/[locale]/guides">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, articles, entry, query] = await Promise.all([getTexts(locale), getArticles(), getSeoEntry("static", "guides"), requestQuery()]);
  const page = pageNumber(query);
  const pages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  if (page > pages) notFound();
  const shown = articles.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page buy-page">
      <JsonLd
        data={[
          breadcrumbList([
            { name: t.pdp.home, path: "/", locale },
            { name: entry?.breadcrumbLabel?.[locale] || t.nav.guides, path: "/guides", locale },
          ]),
          shown.length ? itemListJsonLd(locale, shown.map((a) => ({ name: articleTitle(a, locale), path: guidePath(a) }))) : null,
        ]}
      />
      <EntryHeadCode entry={entry} />
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <h1>{entryH1(entry, locale, t.articles.title)}</h1>
            <EntryIntro entry={entry} locale={locale} />
            {shown.length ? <ArticleCards articles={shown} locale={locale} t={t} /> : <p className="buy-empty">{t.articles.empty}</p>}
            {pages > 1 ? (
              <nav className="filters" aria-label={t.nav.guides}>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <Link key={n} className={`fp${n === page ? " on" : ""}`} aria-current={n === page ? "page" : undefined} href={localePath(locale, n === 1 ? "/guides" : `/guides?page=${n}`)}>
                    {fmt(t.seoNames.guidesPage, { n })}
                  </Link>
                ))}
              </nav>
            ) : null}
            <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
          </section>
        </div>
      </div>
    </div>
  );
}
