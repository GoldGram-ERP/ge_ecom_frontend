// Shapes returned by the backend. The contract is docs/SPEC.md section 5.

export type Karat = 24 | 21 | 18;
/** A category slug as the dashboard sets it. "bar", "coin" and "wear" have their own drawing; any other is drawn as a bar. */
export type Category = string;
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
  descriptionEn: string;
  descriptionAr: string;
  /** Its photos, first one first: `/api/products/:id/images/:imageId`. */
  imageIds: number[];
  manufacturerId: number;
  manufacturerEn: string;
  manufacturerAr: string;
  /** Today's buy price per gram of its metal and karat. */
  gramPiastres: number;
  /** What GoldGram pays back on resale; null when no policy is offered. */
  /** Resale: what we pay back with and without the packaging, and the making charge returned (cashback). */
  buyback: { withPackagingPiastres: number; withoutPackagingPiastres: number; laborPiastres: number } | null;
}

export interface Zone {
  governorate: string;
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
  role: "customer" | "admin";
  createdAt: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export type Article = {
  id: number;
  titleEn: string;
  titleAr: string;
  type: "financial" | "educational" | "news" | "guide";
  bodyEn: string;
  bodyAr: string;
  publishedAt: string;
  imageIds: number[];
};

export type FaqEntry = { id: number; questionEn: string; questionAr: string; answerEn: string; answerAr: string };
