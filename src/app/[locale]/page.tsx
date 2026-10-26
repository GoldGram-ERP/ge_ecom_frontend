import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactRows, StoreButtons } from "@/components/chrome";
import { SiteHeader } from "@/components/header-client";
import { FaqList, WhyPanels } from "@/components/home-client";
import { BrandsStrip, HowToBuy, SellCta } from "@/components/home-extra";
import { Phones } from "@/components/phones";
import { hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { ArticleCards, StarterCarousel, starterProducts } from "@/components/home-sections";
import { getArticles, getFaq, getPricesOrNull, getProducts, getSpotOrNull } from "@/lib/server-api";
import { site } from "@/lib/site";
import { Reveal } from "@/components/controls";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  // The home page still renders if the backend is down; the price phone says so.
  const [prices, spot, faq, articles, products] = await Promise.all([
    getPricesOrNull(),
    getSpotOrNull(),
    getFaq(),
    getArticles(),
    getProducts().catch(() => []),
  ]);
  const faqItems = faq.map((f) => ({ q: locale === "ar" ? f.questionAr : f.questionEn, a: locale === "ar" ? f.answerAr : f.answerEn }));
  const starter = starterProducts(products);

  return (
    <div className="page">
      <SiteHeader />
      <a id="top" />

      <div className="band-navy">
        <svg className="arch-line" viewBox="0 0 1200 560" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 300 560 L 300 250 A 300 300 0 0 1 900 250 L 900 560" fill="none" stroke="rgba(231,210,160,0.15)" strokeWidth="1" />
          <path d="M 150 560 L 150 190 A 450 450 0 0 1 1050 190 L 1050 560" fill="none" stroke="rgba(231,210,160,0.08)" strokeWidth="1" />
        </svg>
        <div className="wrap">
          <section className="hero">
            <div>
              <h1>
                {t.hero.titleA}
                <em>{t.hero.titleEm}</em>
                {t.hero.titleB}
              </h1>
              <p>{t.hero.sub}</p>
              <StoreButtons t={t} />
            </div>
            <Phones prices={prices} spot={spot} board={t.board} karat={t.product.karat} locale={locale} />
          </section>
        </div>
      </div>

      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="about">
              <h2 className="ask">{t.who.title}</h2>
              <p style={{ margin: "var(--s3) 0 0 0", color: "var(--muted)", maxWidth: "62ch" }}>{t.who.text}</p>
            </Reveal>

          <Reveal as="section" id="included" style={{ paddingTop: 0 }}>
              <h2 className="ask">{t.why.title}</h2>
              <WhyPanels />
            </Reveal>
        </div>
      </div>

      {products.length > 0 && (
        <div className="band-white">
          <div className="wrap">
            <Reveal as="section" id="brands">
              <h2 className="ask">{t.brands.title}</h2>
              <BrandsStrip products={products} locale={locale} t={t} />
            </Reveal>
          </div>
        </div>
      )}

      <div className="band-off">
        <div className="wrap">
          <Reveal as="section" id="how">
            <h2 className="ask">{t.howToBuy.title}</h2>
            <HowToBuy t={t} />
          </Reveal>
        </div>
      </div>

      {starter.length > 0 && (
        <div className="band-white">
          <div className="wrap">
            <Reveal as="section" id="starter">
              <div className="starter-head">
                <h2 className="ask">{t.starter.title}</h2>
                <Link className="starter-all" href={`/${locale}/shop`}>{t.starter.all}</Link>
              </div>
              <StarterCarousel products={starter} locale={locale} t={t} />
            </Reveal>
          </div>
        </div>
      )}

      {articles.length > 0 && (
        <div className="band-off">
          <div className="wrap">
            <Reveal as="section" id="articles">
              <h2 className="ask">{t.articles.title}</h2>
              <ArticleCards articles={articles.slice(0, 3)} locale={locale} t={t} />
            </Reveal>
          </div>
        </div>
      )}

      <div className="band-navy">
        <div className="wrap">
          <Reveal as="section" id="sell-cta">
            <SellCta t={t} locale={locale} />
          </Reveal>
        </div>
      </div>

      <div className="band-white">
        <div className="wrap">
          <Reveal as="section" id="faq">
              <h2 className="ask">{t.faq.title}</h2>
              {faqItems.length ? <FaqList items={faqItems} /> : <FaqList />}
            </Reveal>

          <Reveal as="section" id="contact" style={{ paddingTop: 0 }}>
              <h2 className="ask">{t.contact.title}</h2>
              <ContactRows t={t} />
            </Reveal>
        </div>
      </div>

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
                    <b>{site.commercialRegister}</b>
                  </div>
                  <div className="cred">
                    <span>{t.record.tax}</span>
                    <b>{site.taxRegistration}</b>
                  </div>
                  <div className="cred">
                    <span>{t.record.hallmark}</span>
                    <b>{site.hallmarking}</b>
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

    </div>
  );
}
