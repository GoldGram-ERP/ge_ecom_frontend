import Link from "next/link";
import { localePath } from "@/i18n";
import { notFound } from "next/navigation";
import { ContactRows, StoreButtons } from "@/components/chrome";
import { SiteHeader } from "@/components/header-client";
import { FaqList, WhyPanels } from "@/components/home-client";
import { BrandsStrip, HowToBuy } from "@/components/home-extra";
import { HomePrices } from "@/components/home-prices";
import { AppBand, BrandCompare, GoldForms, HomeWeights, Proofs } from "@/components/home-seo";
import { Phones } from "@/components/phones";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { ArticleCards } from "@/components/home-sections";
import { StarterCarousel } from "@/components/starter-carousel";
import { getArticles, getFaq, getPricesOrNull, getProducts, getSpotOrNull } from "@/lib/server-api";
import { Reveal } from "@/components/controls";
import { EntryHeadCode, entryH1, JsonLd } from "@/components/seo-blocks";
import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { faqPageJsonLd, jewelryStoreJsonLd, routeParams } from "@/lib/seo";
import { brandComparison, goldForms, type HomeSection, homeSections, popularProducts } from "@/lib/home-rules";
import { getBusiness, getSeoEntry, getSeoSite, getWeightList, isBar, priceVars } from "@/lib/seo-data";
import { seoMetadata } from "@/lib/seo-page";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale, query } = await routeParams(params);
  if (!hasLocale(locale)) return {};
  const [prices, seo] = await Promise.all([getPricesOrNull(), getSeoSite()]);
  const meta = await seoMetadata({ locale, query, path: "/", type: "home", entryType: "static", key: "home", vars: priceVars(prices, locale) });
  // Search Console, Bing and Meta verification on the home page only (DSH-13).
  const v = seo?.verification;
  const other = { ...(v?.bing ? { "msvalidate.01": v.bing } : {}), ...(v?.meta ? { "facebook-domain-verification": v.meta } : {}) };
  return { ...meta, verification: { ...(v?.google ? { google: v.google } : {}), ...(Object.keys(other).length ? { other } : {}) } };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) notFound();
  const [t, entry, business] = await Promise.all([getTexts(locale), getSeoEntry("static", "home"), getBusiness()]);
  // The home page still renders if the backend is down; the price phone says so.
  const [prices, spot, faq, articles, products] = await Promise.all([
    getPricesOrNull(),
    getSpotOrNull(),
    getFaq(),
    getArticles(),
    getProducts().catch(() => []),
  ]);
  const faqItems = faq.map((f) => ({ q: locale === "ar" ? f.questionAr : f.questionEn, a: locale === "ar" ? f.answerAr : f.answerEn }));
  const h1 = entryH1(entry, locale, "");
  const bars = products.filter(isBar);
  const weights = await getWeightList(products);
  const popular = popularProducts(products);
  const compare = brandComparison(bars, weights, locale);
  // PG-01: which sections today's data fills, in their fixed order.
  const show = homeSections({
    prices: prices !== null,
    weights: weights.length,
    products: products.length,
    popular: popular.length,
    compared: compare?.rows.length ?? 0,
    articles: articles.length,
  });
  // A section that follows another in the same band sits closer to it.
  const after = (previous: HomeSection) => (show.includes(previous) ? { paddingTop: 0 } : undefined);

  const sections: Record<HomeSection, ReactNode> = {
    hero: (
      <div className="band-navy">
        <svg className="arch-line" viewBox="0 0 1200 560" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 300 560 L 300 250 A 300 300 0 0 1 900 250 L 900 560" fill="none" stroke="rgba(231,210,160,0.15)" strokeWidth="1" />
          <path d="M 150 560 L 150 190 A 450 450 0 0 1 1050 190 L 1050 560" fill="none" stroke="rgba(231,210,160,0.08)" strokeWidth="1" />
        </svg>
        <div className="wrap">
          <section className="hero">
            <div>
              {h1 ? (
                <h1>{h1}</h1>
              ) : (
                <h1>
                  {t.hero.titleA}
                  <em>{t.hero.titleEm}</em>
                  {t.hero.titleB}
                </h1>
              )}
              <p>{t.hero.sub}</p>
              <div className="hero-cta">
                <Link className="btn btn-gold" href={localePath(locale, "/gold-bars")}>
                  {t.home.shopBars}
                </Link>
                <Link className="btn btn-ghost" href={localePath(locale, "/gold-price-today")}>
                  {t.home.todayPrice}
                </Link>
              </div>
              <StoreButtons t={t} placement="home-hero" />
            </div>
            <Phones prices={prices} spot={spot} board={t.board} karat={t.product.karat} locale={locale} />
          </section>
        </div>
      </div>
    ),

    prices: prices ? (
      <div className="home-prices-band">
        <div className="wrap">
          <HomePrices initial={prices} />
        </div>
      </div>
    ) : null,

    weights: (
      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="weights">
            <h2 className="ask">{t.home.weightsTitle}</h2>
            <HomeWeights weights={weights} bars={bars} locale={locale} t={t} />
          </Reveal>
        </div>
      </div>
    ),

    forms: (
      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="forms" style={after("weights")}>
            <h2 className="ask">{goldForms(products).length === 3 ? t.home.formsTitle : t.home.formsTitleTwo}</h2>
            <GoldForms products={products} locale={locale} t={t} />
          </Reveal>
        </div>
      </div>
    ),

    popular: (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="starter">
            <div className="starter-head">
              <h2 className="ask">{t.home.popularTitle}</h2>
              <Link className="starter-all" href={localePath(locale, `/shop`)}>
                {t.starter.all}
              </Link>
            </div>
            <StarterCarousel products={popular} locale={locale} t={t} label={t.home.popularTitle} />
          </Reveal>
        </div>
      </div>
    ),

    why: (
      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="included">
            <h2 className="ask">{t.why.title}</h2>
            <WhyPanels />
          </Reveal>
        </div>
      </div>
    ),

    brands: (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="brands">
            <h2 className="ask">{t.brands.title}</h2>
            <BrandsStrip products={products} locale={locale} t={t} />
          </Reveal>
        </div>
      </div>
    ),

    compare: compare ? (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="compare" style={after("brands")}>
            <h2 className="ask">{t.home.compareTitle}</h2>
            <BrandCompare table={compare} locale={locale} t={t} />
          </Reveal>
        </div>
      </div>
    ) : null,

    how: (
      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="how">
            <h2 className="ask">{t.howToBuy.title}</h2>
            <HowToBuy t={t} />
          </Reveal>
        </div>
      </div>
    ),

    proofs: (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="proofs">
            <h2 className="ask">{t.home.proofsTitle}</h2>
            <Proofs t={t} />
          </Reveal>
        </div>
      </div>
    ),

    app: (
      <div className="band-navy">
        <div className="wrap">
          <Reveal as="section" id="app">
            <AppBand locale={locale} t={t} />
          </Reveal>
        </div>
      </div>
    ),

    faq: (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="faq">
            <h2 className="ask">{t.faq.title}</h2>
            {faqItems.length ? <FaqList items={faqItems} /> : <FaqList />}
          </Reveal>
        </div>
      </div>
    ),

    about: (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="about" style={after("faq")}>
            <h2 className="ask">{t.who.title}</h2>
            <p style={{ margin: "var(--s3) 0 0 0", color: "var(--muted)", maxWidth: "62ch" }}>{t.who.text}</p>
            <p style={{ marginTop: "var(--s2)" }}>
              <Link className="starter-all" href={localePath(locale, "/about")}>
                {t.home.aboutMore}
              </Link>
            </p>
          </Reveal>
        </div>
      </div>
    ),

    contact: (
      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="contact" style={after("about")}>
            <h2 className="ask">{t.contact.title}</h2>
            <ContactRows t={t} locale={locale} />
          </Reveal>
        </div>
      </div>
    ),

    articles: (
      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="articles">
            <h2 className="ask">{t.articles.title}</h2>
            <ArticleCards articles={articles.slice(0, 3)} locale={locale} t={t} />
          </Reveal>
        </div>
      </div>
    ),

    promise: (
      <div className="band band-gold">
        <svg viewBox="0 0 1200 460" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 330 460 L 330 240 A 270 270 0 0 1 870 240 L 870 460" fill="none" stroke="rgba(14,27,50,0.16)" strokeWidth="1" />
          <path d="M 200 460 L 200 190 A 400 400 0 0 1 1000 190 L 1000 460" fill="none" stroke="rgba(14,27,50,0.09)" strokeWidth="1" />
        </svg>
        <div className="wrap in">
          <div className="kicker" style={{ color: "rgba(14,27,50,.6)" }}>
            {t.promise.kicker}
          </div>
          <blockquote>
            {t.promise.a}
            <em>{t.promise.em}</em>
            {t.promise.b}
          </blockquote>
          <div className="sig">{t.promise.sig}</div>
        </div>
      </div>
    ),

    record: (
      <div className="band-navy">
        <div className="wrap">
          <Reveal as="section" id="record">
            <div className="kicker">{t.record.kicker}</div>
            <h2 className="lead" style={{ marginTop: "var(--s2)" }}>
              {t.record.title}
            </h2>
            <div className="record-frame" style={{ marginTop: "var(--s6)" }}>
              <div className="record">
                <div className="cred">
                  <span>{t.record.cr}</span>
                  <b>{business.commercialRegister}</b>
                </div>
                <div className="cred">
                  <span>{t.record.tax}</span>
                  <b>{business.taxRegistration}</b>
                </div>
                <div className="cred">
                  <span>{t.record.hallmark}</span>
                  <b>{business.hallmarking}</b>
                </div>
                <div className="cred">
                  <span>{t.record.legal}</span>
                  <b>{t.record.legalValue}</b>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    ),
  };

  return (
    <div className="page">
      <JsonLd data={[jewelryStoreJsonLd(business, locale), faqPageJsonLd(faqItems.length ? faqItems : [...t.faq.items])]} />
      <EntryHeadCode entry={entry} />
      <SiteHeader />
      <a id="top" />
      {show.map((section) => (
        <Fragment key={section}>{sections[section]}</Fragment>
      ))}
    </div>
  );
}
