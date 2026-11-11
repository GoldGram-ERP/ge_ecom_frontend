// Shapes returned by the backend. The contract is docs/SPEC.md section 5.

export type Karat = 24 | 21 | 18;
/** A category slug as the dashboard sets it. "bar", "coin" and the wearable ones have their own drawing; any other is drawn as a bar. */
export type Category = string;

/**
 * The slugs the wearable category goes by: "wear" from the start, "pendants" since the dashboard
 * renamed it to match its page. Either one is the wearable category, everywhere on the site.
 */
export const WEARABLE: readonly Category[] = ["wear", "pendants"];
export const isWearable = (category: Category): boolean => WEARABLE.includes(category);
export type Fulfilment = "storage" | "branch" | "delivery";
export type PaymentMethod = "instapay" | "bank";
export type OrderStatus = "initiated" | "pending" | "processing" | "shipping" | "ready" | "completed" | "cancelled" | "refund";

export interface Market {
  open: boolean;
  opensAt: string;
  closesAt: string;
  timezone: string;
  minutesUntilChange: number;
  progressPct: number;
  enforced: boolean;
}

export type Trading = "open" | "paused" | "closed";

/** The international ounce in US dollars (`GET /prices/spot`, and the `spot` event of `/prices/stream`). */
export interface Spot {
  priceUsd: number;
  changeUsd: number | null;
  changePct: number | null;
  at: string;
}

export interface Prices {
  /** The 21K master every other karat is derived from. */
  master: { buyPiastres: number; spreadPiastres: number; sellPiastres: number };
  silver: { buyPiastres: number; spreadPiastres: number; sellPiastres: number };
  trading: Trading;
  karats: { karat: Karat; buyPiastres: number; sellPiastres: number; changePct: number }[];
  units: {
    unit: "ounce" | "pound";
    weightGrams: number;
    karat: Karat;
    buyPiastres: number;
    sellPiastres: number;
  }[];
  updatedAt: string;
  market: Market;
}

/** `GET /api/prices/history`: per-gram prices of the 21K master or of silver, oldest first. */
export interface PriceHistory {
  metal: "gold" | "silver";
  points: { at: string; buyPiastres: number; sellPiastres: number }[];
}

export interface Product {
  id: number;
  /** The piece's URL handle, e.g. `btc-gold-bar-10g-24k`. */
  slug: string;
  category: Category;
  categoryNameEn: string;
  categoryNameAr: string;
  nameEn: string;
  nameAr: string;
  weightGrams: number;
  karat: Karat;
  featured: boolean;
  metalPiastres: number;
  laborPiastres: number;
  pricePiastres: number;
  inStock: boolean;
  /** How many can be ordered; null or absent when the shop does not count stock (no limit). */
  stock?: number | null;
  descriptionEn: string;
  descriptionAr: string;
  /** Its photos, first one first: `/api/products/:id/images/:imageId`. */
  imageIds: number[];
  /** Alt text per photo (MED-01), set in the dashboard; absent on an older backend. */
  imageAlts?: { id: number; ar: string; en: string; decorative: boolean }[];
  manufacturerId: number;
  manufacturerEn: string;
  manufacturerAr: string;
  /** The brand's URL handle, e.g. `btc`. */
  manufacturerSlug: string;
  /** Today's buy price per gram of its metal and karat. */
  gramPiastres: number;
  /**
   * Cashback per gram on resale (the dashboard's Cashback policies), with and without the
   * packaging; null when none is offered. GoldGram pays today's sell price per gram × weight
   * plus this × weight.
   */
  cashback: { withPackagingPiastres: number; withoutPackagingPiastres: number } | null;
}

export interface Zone {
  governorate: string;
  /** The zone's name as staff wrote it on the geography page. */
  nameEn?: string;
  nameAr?: string;
  costPiastres: number;
}

export interface PaymentMethodInfo {
  code: PaymentMethod;
  nameEn: string;
  nameAr: string;
  fixedFeePiastres: number;
  percentFee: number;
  /** Where to send the money, as set in the dashboard; empty when not set. */
  payTo: string;
}

export interface QuoteLine {
  productId: number;
  nameEn: string;
  nameAr: string;
  category: Category;
  weightGrams: number;
  karat: Karat;
  qty: number;
  unitMetalPiastres: number;
  unitLaborPiastres: number;
  unitPricePiastres: number;
  lineTotalPiastres: number;
  /** The product's first photo, null when it has none. */
  imageId: number | null;
  /** How many can be ordered; null or absent when the shop does not count stock (no limit). */
  stock?: number | null;
}

export interface Quote {
  lines: QuoteLine[];
  unavailable: number[];
  outOfStock: number[];
  subtotalPiastres: number;
  laborPiastres: number;
  shippingPiastres: number;
  feePiastres: number;
  discountPiastres: number;
  discountName: string | null;
  /** The promo code that gave the discount; null for an automatic rule or none. */
  discountCode: string | null;
  /** Why the entered code did or did not apply; null when no code was entered. */
  codeStatus: "applied" | "invalid" | "inactive" | "below_min" | "wrong_area" | null;
  /** total − subtotal: shipping + payment fee − discount. The storefront's single "Handling" line. */
  handlingPiastres: number;
  totalPiastres: number;
  deliveryAvailable: boolean;
  trading: Trading;
}

export interface PlacedOrder {
  id: number;
  reference: string;
  status: OrderStatus;
  totalPiastres: number;
  createdAt: string;
  /** Only for a guest's order: proves it is theirs (transfer picture, claiming it with a new account). */
  guestToken?: string;
  /** The GA4 place_order values from the order record (only in the create answer). */
  tracking?: import("./analytics").OrderTracking;
}

/** A row of `GET /orders/mine` (the parts the account screen shows). */
export interface MyOrder {
  id: number;
  reference: string;
  status: OrderStatus;
  /** The customer has sent a picture of their transfer. */
  hasProof: boolean;
  /** What their transfers cover so far; null before the first screenshot. */
  paidPiastres: number | null;
  /** Still to transfer: the whole total before any screenshot, then only what a new price added. */
  remainingPiastres: number;
  refunded: boolean;
  fulfilment: Fulfilment;
  totalPiastres: number;
  createdAt: string;
  items: { nameEn: string; nameAr: string; category: Category; weightGrams: number; karat: Karat; qty: number }[];
}

export interface User {
  id: number;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  role: "customer" | "admin";
  createdAt: string;
  /** Identity check state ("Documents required", "Pending approval", "Approved"); absent on an older backend. */
  kycStatus?: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export type Article = {
  id: number;
  /** Its URL handle (/guides/{slug}); absent on an older backend, where the id stands in. */
  slug?: string;
  titleEn: string;
  titleAr: string;
  type: "financial" | "educational" | "news" | "guide";
  bodyEn: string;
  bodyAr: string;
  publishedAt: string;
  imageIds: number[];
};

export type FaqEntry = { id: number; questionEn: string; questionAr: string; answerEn: string; answerAr: string };
