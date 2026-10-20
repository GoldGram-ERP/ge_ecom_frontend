"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "@/components/animate-ui/primitives/radix/sheet";
import { fmt } from "@/i18n";
import { cart, countItems, MAX_QTY, useCart } from "@/lib/cart";
import { api } from "@/lib/client-api";
import { pounds, productName, productPurity, shortWeight } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { Icon, ICONS, MiniArt } from "./chrome";
import { Button } from "./controls";
import { useI18n } from "./Providers";

/**
 * The header's cart: a button with the number of pieces, which opens the cart as a panel
 * sliding in from the side. The lines and the subtotal are the server's (the cart itself
 * only holds product ids and quantities), so what is shown is what checkout will charge
 * before handling.
 */
export function CartDrawer() {
  const { t, href, locale } = useI18n();
  const lines = useCart();
  const count = countItems(lines);
  const [open, setOpen] = useState(false);
  const [priced, setPriced] = useState<{ key: string; quote: Quote } | null>(null);
  const [failed, setFailed] = useState(false);

  // The count answers when a piece is added, not on the first paint.
  const seen = useRef(count);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (count > seen.current) setBump((n) => n + 1);
    seen.current = count;
  }, [count]);

  const key = JSON.stringify(lines);
  useEffect(() => {
    if (!open || lines.length === 0) return;
    const controller = new AbortController();
    api<Quote>("/orders/quote", { body: { items: lines, fulfilment: "branch" }, signal: controller.signal })
      .then((quote) => {
        setFailed(false);
        setPriced({ key, quote });
        // A piece that is no longer on sale leaves the cart (EC-02).
        if (quote.unavailable.length) cart.drop(quote.unavailable);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
    // `key` stands for `lines`: the same cart is not priced twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const quote = priced?.quote ?? null;
  const fresh = priced?.key === key;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="navlink cart-chip" type="button" aria-label={fmt(t.cart.open, { count })}>
          {t.nav.cart}{" "}
          <i key={bump} className={bump ? "bump" : undefined}>
            {count}
          </i>
        </Button>
      </SheetTrigger>
      <SheetPortal>
        <SheetOverlay className="cart-shade" />
        <SheetContent side={locale === "ar" ? "left" : "right"} className="cart-sheet" dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="cart-head">
            <SheetTitle className="cart-title">{t.cart.title}</SheetTitle>
            <SheetDescription className="cart-count">{fmt(count === 1 ? t.cart.piece : t.cart.pieces, { count })}</SheetDescription>
            <SheetClose className="cart-x" aria-label={t.cart.close}>
              <Icon d={ICONS.close} />
            </SheetClose>
          </div>

          {lines.length === 0 ? (
            <div className="cart-empty">
              <p>{t.cart.empty}</p>
              <Link className="gold-btn" href={href("/shop")} onClick={() => setOpen(false)}>
                {t.cart.browse}
              </Link>
            </div>
          ) : (
            <>
              <div className="cart-lines" aria-live="polite" aria-busy={!fresh && !failed}>
                {failed ? <p className="notice">{t.cart.failed}</p> : null}
                {quote === null && !failed ? <p className="cart-wait">{t.checkout.updating}</p> : null}
                {quote?.lines.map((line) => {
                  const name = productName(line, locale);
                  const soldOut = quote.outOfStock.includes(line.productId);
                  return (
                    <div className="cart-line" key={line.productId}>
                      <MiniArt category={line.category} photo={line.imageId ? `/api/products/${line.productId}/images/${line.imageId}` : undefined} className="cart-art" />
                      <div className="cart-what">
                        <b>
                          {name} {shortWeight(line.weightGrams, t)}
                        </b>
                        <span>{productPurity(line, t)}</span>
                        {soldOut ? <em>{t.cart.stock}</em> : null}
                      </div>
                      <div className="cart-price">
                        {pounds(line.lineTotalPiastres)} <small className="egp">{t.product.egp}</small>
                      </div>
                      <div className="cart-qty" role="group" aria-label={fmt(t.cart.qtyOf, { name })}>
                        <Button type="button" aria-label={fmt(t.checkout.removeLabel, { name })} onClick={() => cart.removeOne(line.productId)}>
                          <Icon d={ICONS.minus} size={16} />
                        </Button>
                        <output>{line.qty}</output>
                        <Button type="button" aria-label={fmt(t.cart.addOne, { name })} disabled={line.qty >= MAX_QTY} onClick={() => cart.add(line.productId)}>
                          <Icon d={ICONS.plus} size={16} />
                        </Button>
                      </div>
                      <Button type="button" className="drop cart-drop" aria-label={fmt(t.cart.removeAll, { name })} onClick={() => cart.drop([line.productId])}>
                        {t.checkout.remove}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="cart-foot">
                <div className="cart-sum">
                  <span>{t.checkout.subtotal}</span>
                  <b>
                    {quote ? pounds(quote.subtotalPiastres) : "—"} <small className="egp">{t.product.egp}</small>
                  </b>
                </div>
                <p className="cart-note">{t.cart.note}</p>
                <Link className="gold-btn cart-go" href={href("/checkout")} onClick={() => setOpen(false)}>
                  {t.cart.checkout}
                </Link>
                <SheetClose asChild>
                  <Button type="button" className="cart-back">
                    {t.nav.keepShopping}
                  </Button>
                </SheetClose>
              </div>
            </>
          )}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
