import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ArticleCards } from "@/components/home-sections";
import { hasLocale } from "@/i18n";
import { getArticles } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";

export async function generateMetadata({ params }: PageProps<"/[locale]/articles">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { title: `${(await getTexts(locale)).articles.title} · GoldGram` };
}

export default async function ArticlesPage({ params }: PageProps<"/[locale]/articles">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const [t, articles] = await Promise.all([getTexts(locale), getArticles()]);

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <h1>{t.articles.title}</h1>
            {articles.length ? <ArticleCards articles={articles} locale={locale} t={t} /> : <p className="buy-empty">{t.articles.empty}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
