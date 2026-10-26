import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { articleBody, articleTitle, paragraphs } from "@/components/home-sections";
import { hasLocale } from "@/i18n";
import { cairoDate } from "@/lib/format";
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
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <article className="art-body" style={{ paddingTop: "var(--s8)" }}>
            <Link href={`/${locale}/articles`}>{t.articles.back}</Link>
            <h1>{articleTitle(article, locale)}</h1>
            <time dateTime={article.publishedAt}>{cairoDate(article.publishedAt, locale)}</time>
            {article.imageIds.map((imageId) => (
              <Image unoptimized className="art-img" key={imageId} src={`/api/articles/${article.id}/images/${imageId}`} alt="" width={680} height={382} loading="lazy" />
            ))}
            {/* Plain text only: React escapes it; never rendered as HTML. */}
            {paragraphs(articleBody(article, locale)).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
