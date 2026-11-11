import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteHeader } from "@/components/header-client";
import { articleBody, articleTitle, guidePath } from "@/components/home-sections";
import { EntryFaq, EntryHeadCode, entryH1, JsonLd } from "@/components/seo-blocks";
import { hasLocale } from "@/i18n";
import { cairoDate } from "@/lib/format";
import { SITE_URL, absoluteUrl, breadcrumbList } from "@/lib/seo";
import { getArticleBySlug, getBusiness, getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getArticle, getArticles } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import type { Article } from "@/lib/types";

/**
 * A guide by its slug (PG-12). On a backend without slugs yet, the listing links by id, so a
 * number still finds its guide; once the guide has a slug, only the slug answers.
 */
const findGuide = cache(async (slug: string): Promise<Article | null> => {
  const bySlug = await getArticleBySlug(slug);
  if (bySlug) return bySlug;
  if (!/^\d+$/.test(slug)) return (await getArticles()).find((a) => a.slug === slug) ?? null;
  const byId = await getArticle(slug);
  return byId && !byId.slug ? byId : null;
});

const excerpt = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function generateMetadata({ params }: PageProps<"/[locale]/guides/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const article = await findGuide(slug);
  if (!article) return {};
  const image = article.imageIds[0] ? `${SITE_URL}/api/articles/${article.id}/images/${article.imageIds[0]}` : undefined;
  return seoMetadata({
    locale,
    path: guidePath(article),
    type: "guide",
    entryType: "guide",
    key: article.slug || String(article.id),
    vars: { ...priceVars(null, locale), name: articleTitle(article, locale), title: articleTitle(article, locale), excerpt: excerpt(articleBody(article, locale)) },
    image,
    ogType: "article",
  });
}

export default async function GuidePage({ params }: PageProps<"/[locale]/guides/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const article = await findGuide(slug);
  if (!article) notFound();
  const key = article.slug || String(article.id);
  const [t, entry, business] = await Promise.all([getTexts(locale), getSeoEntry("guide", key), getBusiness()]);
  const title = articleTitle(article, locale);
  const brand = { "@type": "Organization", name: business.siteName[locale], url: SITE_URL };

  return (
    <div className="page buy-page">
      {/* Article data (SCH-07) and its trail; text goes through jsonLd, which escapes "<". */}
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            datePublished: article.publishedAt,
            dateModified: entry?.updatedAt && entry.updatedAt > article.publishedAt ? entry.updatedAt : article.publishedAt,
            inLanguage: locale === "ar" ? "ar-EG" : "en",
            mainEntityOfPage: absoluteUrl(locale, guidePath(article)),
            ...(article.imageIds[0] ? { image: [`${SITE_URL}/api/articles/${article.id}/images/${article.imageIds[0]}`] } : {}),
            author: brand,
            publisher: { ...brand, logo: { "@type": "ImageObject", url: business.logoPngUrl || `${SITE_URL}/logo.png` } },
          },
          breadcrumbList([
            { name: t.pdp.home, path: "/", locale },
            { name: t.nav.guides, path: "/guides", locale },
            { name: entry?.breadcrumbLabel?.[locale] || title, path: guidePath(article), locale },
          ]),
        ]}
      />
      <EntryHeadCode entry={entry} />
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <article className="art-body" style={{ paddingTop: "var(--s8)" }}>
            <Link href={localePath(locale, `/guides`)}>{t.articles.back}</Link>
            <h1>{entryH1(entry, locale, title)}</h1>
            <time dateTime={article.publishedAt}>{cairoDate(article.publishedAt, locale)}</time>
            {/* Images live inline inside the body; no separate gallery, so nothing shows twice. */}
            {/* Body is sanitized on the server (fixed tag/style allowlist); safe to render. */}
            <div className="art-html" dangerouslySetInnerHTML={{ __html: articleBody(article, locale) }} />
          </article>
          <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
        </div>
      </div>
    </div>
  );
}
