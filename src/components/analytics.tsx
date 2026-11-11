"use client";

import Script from "next/script";
import { useEffect } from "react";
import { fromProduct, itemFor, markNotFound, onPage, pageOf, trackEcommerce, trackEvent, viewItemList, type ListRef } from "@/lib/analytics";
import type { Product } from "@/lib/types";

const STORE: Record<string, string> = { ios: "app_store", android: "google_play" };
// The store links keep their campaign names (ct=website-home); the event uses the spec's placements.
const STORE_PLACEMENT: Record<string, string> = { home: "home_app_band", product: "product_buyback", app: "app_page", footer: "footer", header: "header" };
const MAP_LINK = /^https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/;

/** Which contact a link is: phone, WhatsApp, email or map; null for any other link. */
export function contactMethod(href: string): "phone" | "whatsapp" | "email" | "map" | null {
  if (href.startsWith("tel:")) return "phone";
  if (href.startsWith("mailto:")) return "email";
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) return "whatsapp";
  if (MAP_LINK.test(href)) return "map";
  return null;
}

/**
 * Tag Manager, loaded once after the page is interactive, and the clicks every page shares: a
 * store badge (data-store, data-placement) and a hotline, WhatsApp, email or map link.
 */
export function Analytics({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a");
      if (!link) return;
      const store = link.getAttribute("data-store");
      if (store) {
        const placement = link.getAttribute("data-placement") ?? "";
        trackEvent("app_store_click", { store: STORE[store] ?? store, placement: STORE_PLACEMENT[placement] ?? placement });
        return;
      }
      const method = contactMethod(link.getAttribute("href") ?? "");
      if (!method) return;
      const placement = link.closest("footer") ? "footer" : link.closest("header") ? "header" : pageOf(window.location.pathname).type;
      trackEvent("contact_click", { method, placement });
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

/** view_item on the product page, once per page view, with the price it rendered with (R8, R15). */
export function ViewItem({ product }: { product: Product }) {
  useEffect(() => {
    onPage(`view_item:${product.id}`, () => {
      const item = itemFor(fromProduct(product));
      trackEcommerce("view_item", { currency: "EGP", value: item.price, items: [item] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per product page
  }, [product.id]);
  return null;
}

/** view_item_list once per list per page view, with the products it rendered first. */
export function useListView(list: ListRef | undefined, products: Product[]): void {
  // The pieces' ids too: a product page opened from another keeps this component mounted.
  const ids = products.map((p) => p.id).join();
  useEffect(() => {
    if (!list) return;
    onPage(`list:${list.id}`, () => viewItemList(list, products));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page view (onPage), as it first rendered
  }, [list?.id, ids]);
}

/** Rendered by the 404 page: its page view says not_found. */
export function NotFoundMark() {
  useEffect(markNotFound, []);
  return null;
}
