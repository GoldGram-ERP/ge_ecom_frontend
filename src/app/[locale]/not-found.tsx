"use client"; // reads the language from context: not-found receives no params

import Link from "next/link";
import { PlainPage } from "@/components/PlainPage";
import { useI18n } from "@/components/Providers";

// A real 404 (noindex), with the ways on that most visitors want (IDX-06).
export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <PlainPage title={t.errors.notFoundTitle}>
      <p>{t.errors.notFoundText}</p>
      <div className="plain-acts">
        <Link className="gold-btn" href={href("/shop")}>
          {t.cart.browse}
        </Link>
        <Link className="plain-link" href={href("/gold-price-today")}>
          {t.footer.goldPrice}
        </Link>
        <Link className="plain-link" href={href("/gold-bars")}>
          {t.nav.bars}
        </Link>
        <Link className="plain-link" href={href("/gold-coins")}>
          {t.nav.coins}
        </Link>
        <Link className="plain-link" href={href("/faq")}>
          {t.footer.help}
        </Link>
        <Link className="plain-link" href={href("/")}>
          {t.errors.goHome}
        </Link>
      </div>
    </PlainPage>
  );
}
