"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cart, qtyLimit, qtyOf, useCart } from "@/lib/cart";
import { useI18n } from "./Providers";
import { Button } from "./controls";

/** The product page's buying row: how many, then into the cart, or straight to checkout. */
export function ProductBuy({ productId, inStock, stock }: { productId: number; inStock: boolean; stock?: number | null }) {
  const { t, href } = useI18n();
  const router = useRouter();
  // What can still go into the cart: the stock less what the cart already holds.
  const room = qtyLimit(stock) - qtyOf(useCart(), productId);
  const [asked, setQty] = useState(1);
  const qty = Math.max(1, Math.min(asked, room));
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const put = () => {
    for (let n = 0; n < qty; n++) cart.add(productId, stock);
  };

  if (!inStock) {
    return (
      <Button className="pc-buy" type="button" disabled>
        {t.shop.outOfStock}
      </Button>
    );
  }
  if (room < 1 && !added) {
    return (
      <div className="pdp-buy">
        <Button className="pc-buy pdp-add" type="button" disabled>
          {t.shop.allInCart}
        </Button>
        <Button className="pdp-now" type="button" onClick={() => router.push(href("/checkout"))}>
          {t.pdp.buyNow}
        </Button>
      </div>
    );
  }
  return (
    <div className="pdp-buy">
      <div className="pdp-qty" role="group" aria-label={t.pdp.qty}>
        <Button type="button" aria-label={t.pdp.less} disabled={qty <= 1} onClick={() => setQty(Math.max(1, qty - 1))}>
          −
        </Button>
        <output aria-live="polite">{qty}</output>
        <Button type="button" aria-label={t.pdp.more} disabled={qty >= room} onClick={() => setQty(Math.min(room, qty + 1))}>
          +
        </Button>
      </div>
      <Button
        className={`pc-buy pdp-add${added ? " added" : ""}`}
        type="button"
        // Off while "Added" shows, so a double click does not add the quantity twice.
        disabled={added}
        onClick={() => {
          if (timer.current) return; // a second click before the button has turned off
          put();
          setAdded(true);
          timer.current = setTimeout(() => {
            timer.current = null;
            setAdded(false);
          }, 1200);
        }}
      >
        <span aria-live="polite">{added ? t.shop.added : t.shop.add}</span>
      </Button>
      <Button
        className="pdp-now"
        type="button"
        onClick={() => {
          put();
          router.push(href("/checkout"));
        }}
      >
        {t.pdp.buyNow}
      </Button>
    </div>
  );
}
