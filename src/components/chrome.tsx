import Image from "next/image";
import { localePath } from "@/i18n";
import Link from "next/link";
import type { Dict, Locale } from "@/i18n";
import { site } from "@/lib/site";
import type { Category } from "@/lib/types";

const MINI_ART: Record<Category, React.ReactNode> = {
  bar: <div className="a-bar" style={{ width: 36, height: 24 }} />,
  coin: <div className="a-coin" style={{ width: 30, height: 30 }} />,
  wear: <div className="a-ring" style={{ width: 30, height: 30, borderWidth: 5 }} />,
};

/**
 * The small arch with the piece in it: account cards, cart lines and the checkout receipt.
 * The product's own photo when there is one; a category the drawings do not know is drawn as a bar.
 */
export function MiniArt({ category, photo, className }: { category: Category; photo?: string; className?: string }) {
  return (
    <div className={`pc-stage${photo ? " has-photo" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {photo ? <Image unoptimized className="pc-stage-photo" src={photo} alt="" width={88} height={88} /> : (MINI_ART[category] ?? MINI_ART.bar)}
    </div>
  );
}

/** One drawn icon set, one stroke weight. `d` is the path inside a 24 by 24 box. */
export function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
export const ICONS = {
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  minus: "M6 12h12",
  plus: "M12 6v12M6 12h12",
  market: "M8 20V5m0 0L4.5 8.5M8 5l3.5 3.5M16 4v15m0 0 3.5-3.5M16 19l-3.5-3.5",
  gift: "M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.2-3-5-3.4-5-1.2C7 7 9.6 7 12 7zm0 0c1.2-3 5-3.4 5-1.2C17 7 14.4 7 12 7z",
  save: "M12 3v18M16.5 7.5c-.6-1.5-2.3-2.3-4.5-2.3-2.6 0-4.3 1.2-4.3 3.1 0 4.5 9.1 2.2 9.1 6.9 0 2-1.9 3.3-4.8 3.3-2.5 0-4.3-1-4.9-2.8",
  chart: "M4 19h16M5 15l4.5-5 3.5 3 6-7",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5V12l3 2",
  home: "M4 11.5 12 4l8 7.5M6.5 10v9.5h11V10",
} as const;

export function Brand({ locale }: { locale: Locale }) {
  return (
    <Link className="brand" href={localePath(locale, ``)}>
      <Image src="/logo.png" alt="" width={121} height={72} priority />
      <span>GoldGram</span>
    </Link>
  );
}

/** The dark bar every page opens with: the brand, then whatever that page needs on the other side. */
export function Header({ locale, children }: { locale: Locale; children?: React.ReactNode }) {
  return (
    <header>
      <div className="wrap bar">
        <Brand locale={locale} />
        {children}
      </div>
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="shop back" href={href}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 5.5 8 12l6.5 6.5" />
      </svg>
      {children}
    </Link>
  );
}

/** The ways to reach GoldGram. The home page lists the branch first, the help centre last, as each prototype does. */
export function ContactRows({ t, branchLast = false }: { t: Dict; branchLast?: boolean }) {
  const branch = (
    <a className="rr" href={site.mapUrl} target="_blank" rel="noopener noreferrer">
      <span>{t.contact.branch}</span>
      <b>{t.contact.branchValue}</b>
      <u>{t.contact.maps}</u>
    </a>
  );
  return (
    <div className="reach">
      {!branchLast && branch}
      <a className="rr" href={`tel:${site.hotline}`}>
        <span>{t.contact.hotline}</span>
        <b>{site.hotline}</b>
        <u>{t.contact.call}</u>
      </a>
      <a className="rr" href={site.whatsappUrl}>
        <span>{t.contact.whatsapp}</span>
        <b>{t.contact.message}</b>
        <u>{t.contact.open}</u>
      </a>
      <a className="rr" href={`mailto:${site.email}`}>
        <span>{t.contact.email}</span>
        <b>{site.email}</b>
        <u>{t.contact.write}</u>
      </a>
      {branchLast && branch}
      <div className="rr rr-plain">
        <span>{t.contact.hours}</span>
        <b>{t.contact.hoursValue}</b>
      </div>
    </div>
  );
}

/** The App Store and Google Play buttons: the home hero and the footer. */
export function StoreButtons({ t }: { t: Dict }) {
  return (
    <div className="stores">
      <a className="store" href={site.iosUrl}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16.3 12.7c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2 2.5 2 1 0 1.4-.6 2.6-.6 1.2 0 1.5.6 2.6.6 1.1 0 1.8-1 2.4-1.9.8-1.1 1.1-2.2 1.1-2.2s-2.2-.8-2.2-3.2z" />
          <path d="M14.6 6.3c.5-.7.9-1.6.8-2.6-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.4-1.1z" />
        </svg>
        <span>
          <i>{t.hero.downloadOn}</i>
          <b>{t.hero.appStore}</b>
        </span>
      </a>
      <a className="store" href={site.androidUrl}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 3.2v17.6c0 .4.2.7.5.9l9.2-9.7L4.5 2.3c-.3.2-.5.5-.5.9z" />
          <path d="M17.2 8.6 6.1 2.3l8.4 8.9 2.7-2.6z" />
          <path d="M20.4 11.1 18 9.8l-2.9 2.8 2.9 2.7 2.4-1.3c.6-.3.9-.8.9-1.4s-.3-1.1-.9-1.5z" />
          <path d="M6.1 21.7l11.1-6.2-2.7-2.6-8.4 8.8z" />
        </svg>
        <span>
          <i>{t.hero.downloadOn}</i>
          <b>{t.hero.googlePlay}</b>
        </span>
      </a>
    </div>
  );
}

/**
 * The footer of every page (mounted once, in the layout): the brand and how to reach us, then
 * what to shop, the services offered today, the company, and the legal line.
 */
export function Footer({ t, locale }: { t: Dict; locale: Locale }) {
  const to = (path: string) => localePath(locale, `${path}`);
  const columns: { title: string; links: [string, string][] }[] = [
    {
      title: t.footer.shop,
      links: [
        [t.footer.smallGold, to("/shop?c=bar&m=gold&w=small")],
        [t.footer.goldCoins, to("/shop?c=coin")],
        [t.footer.largeGold, to("/shop?c=bar&m=gold&w=large")],
        [t.footer.largeSilver, to("/shop?c=bar&m=silver&w=large")],
      ],
    },
    {
      title: t.footer.services,
      links: [
        [t.footer.sell, to("/sell")],
        [t.nav.makingCharge, to("/making-charges")],
        [t.footer.compare, to("/compare")],
        [t.footer.zakat, to("/zakat")],
        [t.footer.goldPrice, to("/prices")],
        [t.footer.silverPrice, to("/prices/silver")],
      ],
    },
    {
      title: t.footer.company,
      links: [
        [t.footer.about, to("#about")],
        [t.footer.contact, to("#contact")],
        [t.footer.help, to("/help")],
        [t.footer.terms, to("/terms")],
        [t.footer.privacy, to("/privacy")],
      ],
    },
  ];
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="sf-grid">
          <div className="sf-brand">
            <Brand locale={locale} />
            <p>{t.footer.tagline}</p>
            <dl>
              <div>
                <dt>{t.footer.hotline}</dt>
                <dd>
                  <a href={`tel:${site.hotline}`} dir="ltr">
                    {site.hotline}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{t.footer.email}</dt>
                <dd>
                  <a href={`mailto:${site.email}`} dir="ltr">
                    {site.email}
                  </a>
                </dd>
              </div>
            </dl>
            <StoreButtons t={t} />
          </div>
          {columns.map((column) => (
            <nav className="sf-col" key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="sf-base">
          <div className="social">
            <a className="soc" href={site.instagramUrl} aria-label={t.footer.instagram}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" />
                <circle cx="12" cy="12" r="4.1" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a className="soc" href={site.facebookUrl} aria-label={t.footer.facebook}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.6 21v-7.4h2.5l.4-2.9h-2.9V8.9c0-.8.2-1.4 1.4-1.4h1.6V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8.9v2.9h2.5V21z" />
              </svg>
            </a>
            <a className="soc" href={site.tiktokUrl} aria-label={t.footer.tiktok}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.3 3.2v11.3a3 3 0 11-2.6-3v2.6a.9.9 0 100 .9V3.2z" />
                <path d="M14.3 3.2c.4 2 1.9 3.5 3.9 3.8v2.6a6.6 6.6 0 01-3.9-1.4" />
              </svg>
            </a>
            <a className="soc" href={site.whatsappUrl} aria-label={t.footer.whatsapp}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.3 11.7a8.2 8.2 0 01-12.2 7.1L3.9 20l1.3-4a8.2 8.2 0 1115.1-4.3z" />
                <path d="M9.2 8.7c.3-.1.6 0 .8.3l.8 1.2c.2.3.1.6-.1.8l-.5.5c.5 1 1.3 1.8 2.3 2.3l.5-.5c.2-.2.5-.3.8-.1l1.2.8c.3.2.4.5.3.8-.3.8-1.1 1.3-2 1.2a7.4 7.4 0 01-5.5-5.5c-.1-.9.4-1.7 1.2-2z" />
              </svg>
            </a>
          </div>
          <p>{t.footer.legal}</p>
        </div>
      </div>
    </footer>
  );
}
