import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Footer } from "@/components/chrome";
import { PriceTicker } from "@/components/PriceTicker";
import { Providers } from "@/components/Providers";
import { dirOf, hasLocale, locales, localePath } from "@/i18n";
import { getPricesOrNull } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import { fontVariables } from "../fonts";
import "../styles/site.css";
import "../styles/ar.css";
import "../styles/help.css";
import "../styles/app.css";
import "../styles/controls.css";
import "../styles/ticker.css";

// Only /en and /ar exist. The layout below answers any other first segment with a 404.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  const request = await headers();
  const rest = request.get("x-gg-path") ?? "";
  const host = request.get("x-forwarded-host") ?? request.get("host") ?? "localhost";
  const scheme = request.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    metadataBase: new URL(`${scheme}://${host}`),
    title: t.meta.title,
    description: t.meta.description,
    // This page in each language. Arabic is at the root, English under /en (middleware sets x-gg-path).
    alternates: {
      canonical: localePath(locale, rest || "/"),
      languages: {
        en: localePath("en", rest || "/"),
        ar: localePath("ar", rest || "/"),
        "x-default": localePath("en", rest || "/"),
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);

  return (
    // data-scroll-behavior: the stylesheet sets smooth scrolling for in-page anchors, and
    // Next.js 16 only makes page changes jump straight to the top when asked to.
    <html lang={locale} dir={dirOf(locale)} className={fontVariables} data-scroll-behavior="smooth">
      <body>
        <Providers locale={locale} dict={t}>
          {/* Seeded on the server so the strip is never empty; the price stream keeps it live. */}
          <PriceTicker initial={await getPricesOrNull()} />
          {children}
          <Footer t={t} locale={locale} />
        </Providers>
      </body>
    </html>
  );
}
