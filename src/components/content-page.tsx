import type { Metadata } from "next";
import { SiteHeader } from "@/components/header-client";
import { EntryFaq, EntryHeadCode, entryH1, JsonLd } from "@/components/seo-blocks";
import type { Locale } from "@/i18n";
import { breadcrumbList } from "@/lib/seo";
import { getPage, getSeoEntry, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";
import { getTexts } from "@/lib/site-texts";

// The editable pages (PG-14/15/16): about, contact, app, policies. The body comes from
// GET /pages/:key (sanitized by the backend) and renders through the article body; until the
// backend has it, a short built-in text stands in. The article page's shape, nothing new.

export type ContentKey = "about" | "contact" | "app" | "policies-shipping" | "policies-buyback";

export async function contentMetadata(locale: Locale, key: ContentKey, path: string, name: string): Promise<Metadata> {
  return seoMetadata({ locale, path, type: "static", entryType: "static", key, vars: { ...priceVars(null, locale), name } });
}

export async function ContentPage({
  locale,
  pageKey,
  path,
  title,
  fallback,
  jsonLd,
  children,
}: {
  locale: Locale;
  pageKey: ContentKey;
  path: string;
  title: string;
  fallback: string;
  jsonLd?: unknown[];
  children?: React.ReactNode;
}) {
  const [t, page, entry] = await Promise.all([getTexts(locale), getPage(pageKey), getSeoEntry("static", pageKey)]);
  const body = page?.bodyHtml?.[locale]?.trim();
  const heading = entryH1(entry, locale, page?.title?.[locale]?.trim() || title);
  return (
    <div className="page buy-page">
      <JsonLd
        data={[
          breadcrumbList([
            { name: t.pdp.home, path: "/", locale },
            { name: entry?.breadcrumbLabel?.[locale] || heading, path, locale },
          ]),
          ...(jsonLd ?? []),
        ]}
      />
      <EntryHeadCode entry={entry} />
      <SiteHeader />
      <div className="band-off">
        <div className="wrap">
          <article className="art-body" style={{ paddingTop: "var(--s8)" }}>
            <h1>{heading}</h1>
            {body ? (
              <div className="art-html" dangerouslySetInnerHTML={{ __html: body }} />
            ) : (
              <div className="art-html">
                <p>{fallback}</p>
              </div>
            )}
          </article>
          {children}
          <EntryFaq entry={entry} locale={locale} title={t.pages.faqTitle} />
        </div>
      </div>
    </div>
  );
}
