import type { Metadata } from "next";
import { localePath } from "@/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { articleBody, articleTitle } from "@/components/home-sections";
import { hasLocale } from "@/i18n";
import { cairoDate } from "@/lib/format";
import { SITE_URL, absoluteUrl, jsonLd } from "@/lib/seo";
import { getArticle } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/articles/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const article = hasLocale(locale) ? await getArticle(id) : null;
  return article ? { title: `${articleTitle(article, locale as "en" | "ar")} · GoldGram` } : {};
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/articles/[id]">) {
  const { locale, id } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, article] = await Promise.all([getTexts(locale), getArticle(id)]);
  if (!article) notFound();

  return (
    <div className="page buy-page">
      {/* Article data (SCH-07); text goes through jsonLd, which escapes "<". */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: articleTitle(article, locale),
              datePublished: article.publishedAt,
              dateModified: article.publishedAt,
              inLanguage: locale === "ar" ? "ar-EG" : "en",
              mainEntityOfPage: absoluteUrl(locale, `/articles/${article.id}`),
              ...(article.imageIds[0] ? { image: [`${SITE_URL}/api/articles/${article.id}/images/${article.imageIds[0]}`] } : {}),
              author: { "@type": "Organization", name: "GoldGram", url: SITE_URL },
              publisher: { "@type": "Organization", name: "GoldGram", url: SITE_URL },
            },
          ]),
        }}
      />
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <article className="art-body" style={{ paddingTop: "var(--s8)" }}>
            <Link href={localePath(locale, `/articles`)}>{t.articles.back}</Link>
            <h1>{articleTitle(article, locale)}</h1>
            <time dateTime={article.publishedAt}>{cairoDate(article.publishedAt, locale)}</time>
            {/* Images live inline inside the body; no separate gallery, so nothing shows twice. */}
            {/* Body is sanitized on the server (fixed tag/style allowlist); safe to render. */}
            <div className="art-html" dangerouslySetInnerHTML={{ __html: articleBody(article, locale) }} />
          </article>
        </div>
      </div>
    </div>
  );
}
