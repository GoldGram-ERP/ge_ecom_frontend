"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** One GA4 event into the Tag Manager data layer (ANL-02). Harmless when GTM is not set. */
export function track(event: string, params: Record<string, unknown> = {}) {
  (window.dataLayer ??= []).push({ event, ...params });
}

/**
 * Tag Manager, loaded once after the page is interactive (DSH-13, PRF-03), and the click events
 * every page shares: a store badge (data-store, data-placement), a phone link, a WhatsApp link.
 */
export function Analytics({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a");
      if (!link) return;
      const store = link.getAttribute("data-store");
      const placement = link.getAttribute("data-placement") ?? "";
      const href = link.getAttribute("href") ?? "";
      if (store) track("app_store_click", { store, placement });
      else if (href.startsWith("tel:")) track("phone_click", { placement });
      else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) track("whatsapp_click", { placement });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  if (!/^GTM-[A-Z0-9]{4,12}$/.test(gtmId)) return null;
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
    </Script>
  );
}

/** A page-view event (view_item, view_item_list, price_page_view), sent once when the page opens. */
export function TrackView({ event, params }: { event: string; params?: Record<string, unknown> }) {
  useEffect(() => {
    track(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page
  }, [event]);
  return null;
}
