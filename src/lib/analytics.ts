import { isWearable, type Product, type QuoteLine, type User } from "./types";

// GA4 through Tag Manager (Upraise's spec, 11 Nov 2026): the site pushes events into
// window.dataLayer and GTM sends them. One helper per kind of push, one item builder (R9).

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

type Params = Record<string, unknown>;

/**
 * Consent Mode v2 defaults (section 10), inline at the top of <body> so they run before Tag
 * Manager and before any push (R1). No banner yet: the ad keys stay denied until the owner decides.
 */
export const CONSENT_DEFAULTS =
  "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}" +
  "gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted',wait_for_update:500});";

/** The page-context keys every later event keeps until the next page view or logout. */
const PERSISTENT = new Set(["page_location", "page_path", "page_title", "page_type", "page_language", "login_status", "id_verification", "user_id"]);

const layer = (): unknown[] => (window.dataLayer ??= []);

/** UUID v4 (R14); getRandomValues also works on a plain-http host, where randomUUID is missing. */
export function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * A supporting event (section 7). Its own keys are reset right after, so GTM's data layer model
 * does not carry, say, a filter_value into the next contact_click; the page context stays.
 */
export function trackEvent(event: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  layer().push({ event, event_id: uuid(), ...params });
  const reset: Params = { event_id: undefined };
  for (const key of Object.keys(params)) if (!PERSISTENT.has(key)) reset[key] = undefined;
  layer().push(reset);
}

/** An ecommerce event (section 6): cleared first (R2), with its event_id (R14). */
export function trackEcommerce(event: string, ecommerce: Params, eventId: string = uuid()): void {
  if (typeof window === "undefined") return;
  layer().push({ ecommerce: null });
  layer().push({ event, event_id: eventId, ecommerce });
}

// ---------- the item object (section 5) ----------

export interface ListContext {
  item_list_id: string;
  item_list_name: string;
  index: number;
}

export interface GaItem {
  item_id: string;
  item_name: string;
  item_brand: string;
  item_category: "Gold" | "Silver";
  item_category2: "Bar" | "Coin" | "Wearable bar";
  item_category3: string;
  item_category4: string;
  item_list_id?: string;
  item_list_name?: string;
  index?: number;
  price: number;
  quantity: number;
  weight_grams: number;
  karat: string;
  fineness: string;
  gold_rate: number;
  making_charge: number;
  stock_status: "in_stock" | "out_of_stock";
}

/** What buildItem needs: a product, or a priced cart line with its brand. Money in piastres. */
export interface ItemSource {
  id: number;
  nameEn: string;
  brandEn: string;
  category: string;
  weightGrams: number;
  karat: number;
  metalPiastres: number;
  laborPiastres: number;
  pricePiastres: number;
  inStock: boolean;
}

/** Two decimals at most, as a number (R4). */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** "0.25 g", "10 g", "1 oz (31.1 g)", "1 kg". */
export function weightLabel(grams: number): string {
  const g = round2(grams);
  if (g === 31.1) return "1 oz (31.1 g)";
  if (g === 1000) return "1 kg";
  return `${g} g`;
}

const FINENESS: Record<number, string> = { 24: "999.9", 21: "875", 18: "750", 999: "999" };

/** The item object, the same in every event (R9) and as the backend's gaItem() builds it. */
export function buildItem(src: ItemSource, quantity = 1, context?: ListContext | null): GaItem {
  const silver = src.karat === 999;
  return {
    item_id: String(src.id),
    item_name: src.nameEn,
    item_brand: src.brandEn,
    item_category: silver ? "Silver" : "Gold",
    item_category2: isWearable(src.category) ? "Wearable bar" : src.category === "coin" ? "Coin" : "Bar",
    item_category3: weightLabel(src.weightGrams),
    item_category4: silver ? "999 silver" : `${src.karat}K`,
    ...(context ? { item_list_id: context.item_list_id, item_list_name: context.item_list_name, index: context.index } : {}),
    price: round2(src.pricePiastres / 100),
    quantity,
    weight_grams: round2(src.weightGrams),
    karat: String(src.karat),
    fineness: FINENESS[src.karat] ?? String(round2((src.karat / 24) * 1000)),
    // The per-gram rate behind the shown price: the metal value over the weight (what an order line keeps too).
    gold_rate: round2(src.metalPiastres / src.weightGrams / 100),
    making_charge: round2(src.laborPiastres / 100),
    stock_status: src.inStock ? "in_stock" : "out_of_stock",
  };
}

export const fromProduct = (p: Product): ItemSource => ({
  id: p.id,
  nameEn: p.nameEn,
  brandEn: p.manufacturerEn,
  category: p.category,
  weightGrams: p.weightGrams,
  karat: p.karat,
  metalPiastres: p.metalPiastres,
  laborPiastres: p.laborPiastres,
  pricePiastres: p.pricePiastres,
  inStock: p.inStock !== false,
});

export const fromLine = (line: QuoteLine, brandEn: string, inStock: boolean): ItemSource => ({
  id: line.productId,
  nameEn: line.nameEn,
  brandEn,
  category: line.category,
  weightGrams: line.weightGrams,
  karat: line.karat,
  metalPiastres: line.unitMetalPiastres,
  laborPiastres: line.unitLaborPiastres,
  pricePiastres: line.unitPricePiastres,
  inStock,
});

/** Σ price × quantity (R12). */
export const itemsValue = (items: GaItem[]): number => round2(items.reduce((sum, i) => sum + i.price * i.quantity, 0));
/** Σ weight_grams × quantity. */
export const totalGrams = (items: GaItem[]): number => round2(items.reduce((sum, i) => sum + i.weight_grams * i.quantity, 0));
/** Cart and checkout events: the items subtotal less any order-level discount, no shipping or fee (R12). */
export const checkoutValue = (items: GaItem[], discountPiastres = 0): number => round2(itemsValue(items) - discountPiastres / 100);

// ---------- lists (section 5, "Item list naming") ----------

export interface ListRef {
  id: string;
  name: string;
}

const snake = (slug: string): string => slug.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const LISTS = {
  homePicks: { id: "home_picks", name: "Home: Picks to start" },
  shopAll: { id: "shop_all", name: "Shop: All" },
  pdpSameWeight: { id: "pdp_same_weight", name: "PDP: Same weight, other brands" },
  pdpOtherWeights: { id: "pdp_other_weights", name: "PDP: Other weights" },
  pricesBars: { id: "prices_bar_table", name: "Prices: Bars by weight" },
  makingCharges: { id: "making_charges_table", name: "Making charges table" },
} as const satisfies Record<string, ListRef>;

const CATEGORY_NAMES: Record<string, string> = {
  "gold-bars": "Gold bars",
  "gold-ingots": "Small gold bars",
  "gold-coins": "Gold coins",
  "gold-bar-pendants": "Bars to wear",
  pendants: "Bars to wear",
  silver: "Silver",
};

/** A category page's list, from its route slug: /gold-coins → category_gold_coins. */
export const categoryList = (slug: string): ListRef => ({
  id: `category_${snake(slug === "pendants" ? "gold-bar-pendants" : slug)}`.slice(0, 64),
  name: `Category: ${CATEGORY_NAMES[slug] ?? slug.replace(/-/g, " ")}`,
});

/** A weight page's list: /gold-bars/10-gram → weight_gold_bars_10_gram. */
export const weightList = (slug: string, grams: number): ListRef => ({
  id: `weight_gold_bars_${snake(slug)}`.slice(0, 64),
  name: `Weight: Gold bars ${weightLabel(grams)}`,
});

/** A brand page's list (not in the spec's table; built from the route slug the same way). */
export const brandList = (slug: string, brandEn: string): ListRef => ({ id: `brand_${snake(slug)}`.slice(0, 64), name: `Brand: ${brandEn || slug}` });

const LIST_KEY = "gg_ga_lists";

function readLists(): Record<string, ListContext> {
  try {
    return JSON.parse(sessionStorage.getItem(LIST_KEY) ?? "{}") as Record<string, ListContext>;
  } catch {
    return {};
  }
}

/** Keeps where an item was picked from, for every later event of it (section 5). */
export function rememberList(itemId: number, context: ListContext): void {
  try {
    sessionStorage.setItem(LIST_KEY, JSON.stringify({ ...readLists(), [String(itemId)]: context }));
  } catch {
    // storage blocked: the later events go without the list
  }
}

export const listOf = (itemId: number): ListContext | null => (typeof window === "undefined" ? null : (readLists()[String(itemId)] ?? null));

export const contextOf = (list: ListRef, index: number): ListContext => ({ item_list_id: list.id, item_list_name: list.name, index });

/** The item with its remembered list, when the caller gives none. */
export const itemFor = (src: ItemSource, quantity = 1, context?: ListContext | null): GaItem =>
  buildItem(src, quantity, context === undefined ? listOf(src.id) : context);

export function selectItem(product: Product, list: ListRef, index: number): void {
  const context = contextOf(list, index);
  rememberList(product.id, context);
  trackEcommerce("select_item", { item_list_id: list.id, item_list_name: list.name, currency: "EGP", items: [buildItem(fromProduct(product), 1, context)] });
}

export function viewItemList(list: ListRef, products: Product[]): void {
  if (!products.length) return;
  const items = products.slice(0, 200).map((p, index) => buildItem(fromProduct(p), 1, contextOf(list, index)));
  trackEcommerce("view_item_list", { item_list_id: list.id, item_list_name: list.name, currency: "EGP", items });
}

/** add_to_cart, remove_from_cart and view_cart: value and grams of the items in this action. */
export function cartEvent(event: "add_to_cart" | "remove_from_cart" | "view_cart", items: GaItem[]): void {
  if (!items.length) return;
  trackEcommerce(event, { currency: "EGP", value: itemsValue(items), total_grams: totalGrams(items), items });
}

// ---------- the catalogue, for the brand and stock of a priced cart line ----------

let catalogue: Promise<Map<number, Product>> | null = null;

/** The public product list, fetched once per page load and only when a cart event needs it. */
export function brands(): Promise<Map<number, Product>> {
  catalogue ??= fetch("/api/products", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<Product[]>) : []))
    .then((list) => new Map(list.map((p) => [p.id, p])))
    .catch(() => {
      catalogue = null;
      return new Map<number, Product>();
    });
  return catalogue;
}

/** Items of priced cart lines, each with `qty` of its own (the line's by default). */
export async function lineItems(lines: QuoteLine[], outOfStock: number[] = [], qty?: (line: QuoteLine) => number): Promise<GaItem[]> {
  const byId = await brands();
  return lines.map((line) => {
    const product = byId.get(line.productId);
    const inStock = !outOfStock.includes(line.productId) && product?.inStock !== false;
    return itemFor(fromLine(line, product?.manufacturerEn ?? "", inStock), qty ? qty(line) : line.qty);
  });
}

// ---------- GA identifiers for the order (section 13-A) ----------

const cookie = (all: string, name: RegExp): string | undefined => all.match(name)?.[1];

/** `_ga` = GA1.1.<a>.<b> → "<a>.<b>". */
export function gaClientId(cookies: string): string | undefined {
  const value = cookie(cookies, /(?:^|;\s*)_ga=([^;]+)/);
  const id = value?.split(".").slice(-2).join(".");
  return id && /^\d{1,20}\.\d{1,20}$/.test(id) ? id : undefined;
}

/** `_ga_<suffix>` = GS1.1.<sid>.… or GS2.1.s<sid>$o1$… → "<sid>". */
export function gaSessionId(cookies: string): string | undefined {
  const value = cookie(cookies, /(?:^|;\s*)_ga_[A-Za-z0-9]+=([^;]+)/);
  return value?.match(/^GS\d\.\d\.s?(\d{1,20})(?:[.$]|$)/)?.[1];
}

export interface OrderAnalytics {
  gaClientId?: string;
  gaSessionId?: string;
  lines?: { productId: number; itemListId?: string; itemListName?: string; index?: number }[];
}

/** The order request's optional `analytics` field; undefined when there is nothing to send. */
export function orderAnalytics(productIds: number[], cookies: string, lists: (id: number) => ListContext | null = listOf): OrderAnalytics | undefined {
  const lines = productIds.slice(0, 50).flatMap((productId) => {
    const c = lists(productId);
    if (!c || !/^[a-z0-9_]{1,64}$/.test(c.item_list_id) || !Number.isInteger(c.index) || c.index < 0 || c.index > 999) return [];
    return [{ productId, itemListId: c.item_list_id, itemListName: c.item_list_name.slice(0, 100), index: c.index }];
  });
  const out: OrderAnalytics = {
    ...(gaClientId(cookies) ? { gaClientId: gaClientId(cookies) } : {}),
    ...(gaSessionId(cookies) ? { gaSessionId: gaSessionId(cookies) } : {}),
    ...(lines.length ? { lines } : {}),
  };
  return Object.keys(out).length ? out : undefined;
}

// ---------- place_order (section 6, order rules) ----------

/** The create-order answer's `tracking` block: the confirmed order record, never the cart (R15). */
export interface OrderTracking {
  transaction_id: string;
  currency: "EGP";
  value: number;
  shipping: number;
  service_fee: number;
  tax: number;
  coupon: string;
  shipping_tier: string;
  payment_type: string;
  customer_type: string;
  total_grams: number;
  items: GaItem[];
}

const sentOrders = new Set<string>();

/** Pushes place_order once per order: localStorage first, this page's memory if storage is blocked. */
export function placeOrderOnce(tracking: OrderTracking, storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage): boolean {
  const id = tracking.transaction_id;
  const key = `place_order_tracked_${id}`;
  if (sentOrders.has(id)) return false;
  try {
    if (storage?.getItem(key)) return false;
    storage?.setItem(key, "1");
  } catch {
    // blocked storage: the in-memory guard still holds for this page
  }
  sentOrders.add(id);
  trackEcommerce("place_order", { ...tracking }, `place_order_${id}`);
  return true;
}

// ---------- page views (R6, R7, section 7) ----------

const PAGE_TYPES: [RegExp, string][] = [
  [/^\/$/, "home"],
  [/^\/gold-price-today$/, "gold_prices"],
  [/^\/silver-price-today$/, "silver_prices"],
  [/^\/shop$/, "shop"],
  [/^\/shop\/[^/]+$/, "product"],
  [/^\/(gold-bars|gold-coins|gold-bar-pendants|silver)$/, "category"],
  [/^\/gold-bars\/[^/]+$/, "weight"],
  [/^\/brands$/, "shop"],
  [/^\/brands\/[^/]+$/, "category"],
  [/^\/checkout$/, "checkout"],
  [/^\/account(\/.*)?$/, "account"],
  [/^\/(sign-in|forgot-password|reset-password)$/, "login"],
  [/^\/sign-up$/, "sign_up"],
  [/^\/making-charges$/, "making_charges"],
  [/^\/compare$/, "compare"],
  [/^\/zakat-calculator$/, "zakat"],
  [/^\/app$/, "app"],
  [/^\/guides$/, "guides"],
  [/^\/guides\/[^/]+$/, "guide"],
  [/^\/faq$/, "help"],
  [/^\/about$/, "about"],
  [/^\/contact$/, "contact"],
  [/^\/(privacy|terms|policies\/[^/]+)$/, "legal"],
];

/** Language and page type of a path: Arabic at the root, English under /en. */
export function pageOf(pathname: string): { language: "ar" | "en"; type: string } {
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const bare = (en ? pathname.slice(3) : pathname).replace(/\/+$/, "") || "/";
  return { language: en ? "en" : "ar", type: PAGE_TYPES.find(([re]) => re.test(bare))?.[1] ?? "not_found" };
}

/** Query keys that may carry personal data or a secret, dropped from page_location and page_path (R11). */
const PRIVATE_QUERY = ["email", "firstName", "lastName", "mobile", "phone", "name", "token", "code"];

export function cleanUrl(href: string): URL {
  const url = new URL(href);
  for (const key of PRIVATE_QUERY) url.searchParams.delete(key);
  return url;
}

const KYC: Record<string, string> = {
  "Documents required": "not_started",
  "Pending approval": "pending",
  Approved: "verified",
  Rejected: "rejected",
};

let viewedPath: string | null = null;
let notFoundPath: string | null = null;
let waiting: (() => void)[] = [];
let firedThisPage = new Set<string>();

/** The 404 page marks its path, since a missing product has a product-like address. */
export function markNotFound(): void {
  notFoundPath = window.location.pathname;
}

/** The address changed without a new page (a shop filter's clean URL): no page view for it. */
export function samePage(): void {
  viewedPath = window.location.pathname;
}

/** Whether this path still needs its virtual_page_view. */
export const needsPageView = (): boolean => viewedPath !== window.location.pathname;

/** virtual_page_view, then everything the page queued behind it (R7). */
export function pageView(user: User | null, pageType?: string): void {
  const url = cleanUrl(window.location.href);
  const page = pageOf(url.pathname);
  const kyc = user?.kycStatus ? KYC[user.kycStatus] : undefined;
  layer().push({
    event: "virtual_page_view",
    page_location: url.href,
    page_path: url.pathname + url.search,
    page_title: document.title,
    page_type: pageType ?? (notFoundPath === url.pathname ? "not_found" : page.type),
    page_language: page.language,
    login_status: user ? "logged_in" : "guest",
    ...(user && kyc ? { id_verification: kyc } : {}),
    ...(user ? { user_id: String(user.id) } : {}),
  });
  viewedPath = url.pathname;
  firedThisPage = new Set();
  const run = waiting;
  waiting = [];
  run.forEach((fn) => fn());
}

/** On logout: the ID must not stick to the next visitor on a shared device (section 7). */
export function clearUser(): void {
  layer().push({ user_id: undefined, login_status: "guest", id_verification: undefined });
}

/**
 * A page's own event, after its virtual_page_view (R7), and once per page view under `key` (R8:
 * Strict Mode's double effects and re-renders do not fire it twice).
 */
export function onPage(key: string, fn: () => void): void {
  const once = () => {
    if (firedThisPage.has(key)) return;
    firedThisPage.add(key);
    fn();
  };
  if (viewedPath === window.location.pathname) once();
  else waiting.push(once);
}
