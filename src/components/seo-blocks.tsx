import { FaqList } from "@/components/home-client";
import type { Locale } from "@/i18n";
import { customJsonLd, faqPageJsonLd, jsonLd, type SeoEntry } from "@/lib/seo";

/** Structured data as a script tag; jsonLd escapes "<", so dashboard text cannot close it. */
export function JsonLd({ data }: { data: unknown }) {
  const list = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (!list.length) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(list.length === 1 ? list[0] : list) }} />;
}

/** The entry's custom head code (DSH-01): JSON-LD only, validated on save and parsed again here. */
export function EntryHeadCode({ entry }: { entry: SeoEntry | null }) {
  const code = customJsonLd(entry?.headCode);
  return code ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: code }} /> : null;
}

/** The entry's intro text above a listing (DSH-01, CNT-04); sanitized by the backend on save. */
export function EntryIntro({ entry, locale }: { entry: SeoEntry | null; locale: Locale }) {
  const html = entry?.introHtml?.[locale]?.trim();
  return html ? <div className="art-html seo-intro" dangerouslySetInnerHTML={{ __html: html }} /> : null;
}

/** The entry's FAQ in the page's own question list, with its FAQPage data (SCH-06). Nothing when empty. */
export function EntryFaq({ entry, locale, title, className = "pr-sec" }: { entry: SeoEntry | null; locale: Locale; title: string; className?: string }) {
  const items = (entry?.faq ?? []).map((f) => ({ q: f.q?.[locale] ?? "", a: f.a?.[locale] ?? "" })).filter((f) => f.q.trim() && f.a.trim());
  if (!items.length) return null;
  return (
    <section className={className}>
      <h2>{title}</h2>
      <FaqList items={items} id="seo-faq" />
      <JsonLd data={faqPageJsonLd(items)} />
    </section>
  );
}

/** The heading a page shows: the entry's H1 when set (DSH-01), else the page's own. */
export const entryH1 = (entry: SeoEntry | null, locale: Locale, fallback: string) => entry?.h1?.[locale]?.trim() || fallback;
