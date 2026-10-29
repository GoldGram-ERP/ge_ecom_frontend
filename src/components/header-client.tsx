"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client-api";
import { SHOP_LINKS } from "@/lib/shop-links";
import { CartDrawer } from "./cart-drawer";
import { Brand, Icon, ICONS } from "./chrome";
import { localePath } from "@/i18n";
import { useI18n, useSession } from "./Providers";
import { Button } from "./controls";
// The sell page and its header link (loaded with the header, so the link's phone rule holds everywhere).
import "../app/styles/sell.css";

type NavItem = { label: string; href?: string; onSelect?: () => void };

function NavMenuItem({ item }: { item: NavItem }) {
  return item.href ? (
    <DropdownMenu.Item asChild>
      <Link href={item.href}>{item.label}</Link>
    </DropdownMenu.Item>
  ) : (
    <DropdownMenu.Item onSelect={item.onSelect}>{item.label}</DropdownMenu.Item>
  );
}

/**
 * A header entry with a submenu. When `href` is set the label is a link (click goes there,
 * e.g. "Shop" opens the full shop) and the submenu opens on hover; without it the label is a
 * button that opens the submenu on click.
 */
function NavDropdown({ label, items, className, href }: { label: string; items: NavItem[]; className: string; href?: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openNow = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    timer.current = setTimeout(() => setOpen(false), 120);
  };
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <span className="nav-dd-wrap" onPointerEnter={href ? openNow : undefined} onPointerLeave={href ? closeSoon : undefined}>
        <DropdownMenu.Trigger asChild>
          {href ? (
            <Link className={`navlink ${className}`} href={href} onClick={() => setOpen(false)}>
              {label} <span aria-hidden="true">▾</span>
            </Link>
          ) : (
            <button type="button" className={`navlink ${className}`}>
              {label} <span aria-hidden="true">▾</span>
            </button>
          )}
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="nav-menu"
            align="start"
            sideOffset={8}
            onPointerEnter={href ? openNow : undefined}
            onPointerLeave={href ? closeSoon : undefined}
          >
            {items.map((item) => (
              <NavMenuItem key={item.label} item={item} />
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </span>
    </DropdownMenu.Root>
  );
}

/** The prototype's "Sign in" button. Once signed in it leads to the account instead. */
export function AccountLink() {
  const { t, href } = useI18n();
  const { user } = useSession();
  return user ? (
    <Link className="navlink" href={href("/account")}>
      {t.nav.account}
    </Link>
  ) : (
    <Link className="navlink" href={href("/sign-in")}>
      {t.nav.signIn}
    </Link>
  );
}

export function SignOutButton() {
  const { t, href } = useI18n();
  const { refresh } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // the cookie may already be gone; fall through and leave the account screen either way
    }
    await refresh();
    router.push(href("/"));
    router.refresh();
  }

  return (
    <Button className="navlink" type="button" onClick={signOut} disabled={busy}>
      {t.nav.signOut}
    </Button>
  );
}

/**
 * The one header every page uses (owner's instruction): the home page's bar, with the cart
 * and its count always present. `end` replaces the last button on the account screen.
 * On a phone the bar keeps the shop, the cart and the account; the rest is behind the menu.
 */
export function SiteHeader({ end }: { end?: React.ReactNode }) {
  const { locale, t, href } = useI18n();
  const [open, setOpen] = useState(false);
  // The same page in the other language. Each language is named in its own words, whatever the page's language.
  const other = locale === "en" ? "ar" : "en";
  const otherName = other === "ar" ? "العربية" : "English";
  // Arabic has no prefix; English lives under /en. Strip any /en, then re-prefix for the other language.
  const path = usePathname();
  const bare = path === "/en" || path.startsWith("/en/") ? path.slice(3) || "/" : path;
  const otherHref = localePath(other, bare);
  const router = useRouter();
  // The query (an account tab, a shop filter) goes along, so the switch lands on exactly this view.
  const switchLanguage = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!window.location.search || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.push(otherHref + window.location.search);
  };

  // Each kind has its own clean URL (the URL Map); the footer lists the same ones.
  // shortcut: "GoldGram app" has no page of its own yet; it leads to the home hero.
  const shopItems: NavItem[] = SHOP_LINKS.map((link) => ({ label: t.nav[link.label], href: href(link.path) }));
  const serviceItems: NavItem[] = [
    { label: t.nav.app, href: href("#top") },
    { label: t.sell.nav, href: href("/sell") },
    { label: t.zakat.nav, href: href("/zakat") },
    { label: t.nav.makingCharge, href: href("/making-charges") },
  ];
  const aboutItems: NavItem[] = [
    { label: t.nav.whoWeAre, onSelect: () => setOpen(true) },
    { label: t.nav.branches, href: href("#contact") },
    { label: t.nav.register, href: href("/sign-up") },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header>
      <div className="wrap bar">
        <Brand locale={locale} />
        <Link className="navlink nav-home" href={localePath(locale, ``)}>
          {t.nav.home}
        </Link>
        <Link className="navlink nav-prices" href={href("/prices")}>
          {t.prices.nav}
        </Link>
        <NavDropdown className="nav-shop" label={t.nav.shop} items={shopItems} href={href("/shop")} />
        <NavDropdown className="nav-dd" label={t.nav.service} items={serviceItems} />
        <NavDropdown className="nav-dd" label={t.nav.about} items={aboutItems} />
        <CartDrawer />
        {end ?? <AccountLink />}
        <Link className="navlink lang-switch" href={otherHref} lang={other} hrefLang={other} onClick={switchLanguage}>
          {otherName}
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="nav-more" aria-label={t.nav.menu}>
            <Icon d={ICONS.menu} size={22} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="nav-menu" align="end" sideOffset={8}>
              <DropdownMenu.Item asChild>
                <Link href={localePath(locale, ``)}>{t.nav.home}</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={href("/prices")}>{t.prices.nav}</Link>
              </DropdownMenu.Item>
              {[
                [t.nav.shop, shopItems],
                [t.nav.service, serviceItems],
                [t.nav.about, aboutItems],
              ].map(([label, items]) => (
                <DropdownMenu.Group key={label as string}>
                  <DropdownMenu.Label className="nav-grp">{label as string}</DropdownMenu.Label>
                  {(items as NavItem[]).map((item) => (
                    <NavMenuItem key={item.label} item={item} />
                  ))}
                </DropdownMenu.Group>
              ))}
              <DropdownMenu.Item asChild>
                <Link href={href("/compare")}>{t.footer.compare}</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={href("/help")}>{t.nav.help}</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link href={otherHref} lang={other} hrefLang={other} onClick={switchLanguage}>
                  {otherName}
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="scrim"
            className="about-scrim"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
        {open && (
          <motion.div
            key="panel"
            className="about-panel"
            id="aboutPanel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          >
            <div className="wrap ap-in">
              <Button className="ap-x" type="button" aria-label={t.nav.close} onClick={() => setOpen(false)}>
                <Icon d={ICONS.close} />
              </Button>
              <div className="ap-row">
                <span>{t.about.mission}</span>
                <p>{t.about.missionText}</p>
              </div>
              <div className="ap-row">
                <span>{t.about.vision}</span>
                <p>{t.about.visionText}</p>
              </div>
              <div className="ap-row">
                <span>{t.about.promise}</span>
                <p>{t.about.promiseText}</p>
              </div>
              <div className="ap-block">
                <div className="ap-vlabel">{t.about.values}</div>
                <div className="ap-values">
                  {t.about.list.map((v) => (
                    <div className="ap-value" key={v.t}>
                      <b>{v.t}</b>
                      <span>{v.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
