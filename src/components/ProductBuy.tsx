"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cart, MAX_QTY } from "@/lib/cart";
import { useI18n } from "./Providers";
import { Button } from "./controls";

/** The product page's buying row: how many, then into the cart, or straight to checkout. */
export function ProductBuy({ productId, inStock }: { productId: number; inStock: boolean }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const put = () => {
    for (let n = 0; n < qty; n++) cart.add(productId);
  };

  if (!inStock) {
    return (
      <Button className="pc-buy" type="button" disabled>
        {t.shop.outOfStock}
      </Button>
    );
  }
  return (
    <div className="pdp-buy">
      <div className="pdp-qty" role="group" aria-label={t.pdp.qty}>
        <Button type="button" aria-label={t.pdp.less} disabled={qty <= 1} onClick={() => setQty((n) => Math.max(1, n - 1))}>
          −
        </Button>
        <output aria-live="polite">{qty}</output>
        <Button type="button" aria-label={t.pdp.more} disabled={qty >= MAX_QTY} onClick={() => setQty((n) => Math.min(MAX_QTY, n + 1))}>
          +
        </Button>
      </div>
      <Button
        className={`pc-buy pdp-add${added ? " added" : ""}`}
        type="button"
        onClick={() => {
          put();
          setAdded(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setAdded(false), 1200);
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
