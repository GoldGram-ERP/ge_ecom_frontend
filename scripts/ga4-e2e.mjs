// GA4 data layer end-to-end check (Upraise spec, QA cases T1-T12, T16, T17, T19, T20 as they
// apply in the browser). Drives a running storefront with Playwright and reads window.dataLayer.
//
//   BASE=http://localhost:3102 API=http://localhost:4010 ADMIN_EMAIL=... ADMIN_PASSWORD=... \
//   PW_CORE=<path to a playwright-core folder> CHROME=<chrome.exe> OUT=<screenshot folder> \
//   node scripts/ga4-e2e.mjs
//
// The storefront needs a backend with per-order ID photos on (requireKycDocPerOrder) and in-stock
// products. POST /api/orders is passed to the real backend; when its answer has no `tracking`
// block yet (a backend without the GA4 contract), the script adds one built from the request,
// and says so. It creates one customer and two orders: run it on a throwaway database.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const { BASE = "http://localhost:3102", API = "http://localhost:4010", PW_CORE, CHROME, OUT = "ga4-e2e-out" } = process.env;
const { chromium } = createRequire(import.meta.url)(PW_CORE ?? "playwright-core");
mkdirSync(OUT, { recursive: true });

const results = [];
let failures = 0;
function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
  console.log(results.at(-1));
}

// ---------- backend helpers ----------
const products = await (await fetch(`${API}/api/products`)).json();
const bar10 = products.find((p) => p.category === "bar" && p.weightGrams === 10 && p.inStock);
let adminCookie = "";
async function admin(path, method, body) {
  if (!adminCookie) {
    const r = await fetch(`${API}/api/admin/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
    adminCookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  }
  const r = await fetch(`${API}/api${path}`, { method, headers: { "Content-Type": "application/json", Cookie: adminCookie }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function publishGold(deltaPiastres) {
  const board = await (await fetch(`${API}/api/prices`)).json();
  await admin("/admin/prices", "PUT", { buyPiastres: board.master.buyPiastres + deltaPiastres, spreadPiastres: board.master.spreadPiastres, confirmLargeMove: true });
}

// ---------- data layer helpers ----------
const UNDEF = "__undefined__";
async function layer(page) {
  return page.evaluate((u) => JSON.parse(JSON.stringify(window.dataLayer ?? [], (k, v) => (v === undefined ? u : v))), UNDEF);
}
const named = (dl, event) => dl.filter((p) => p && p.event === event);
async function waitFor(page, event, count = 1, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const found = named(await layer(page), event);
    if (found.length >= count) return found;
    await page.waitForTimeout(150);
  }
  return named(await layer(page), event);
}
/** GTM's model at the moment of an event: every push merged in order, undefined clearing a key. */
function modelAt(dl, index) {
  const model = {};
  for (const push of dl.slice(0, index + 1)) {
    if (push && typeof push === "object" && !("0" in push)) {
      for (const [k, v] of Object.entries(push)) {
        if (v === UNDEF) delete model[k];
        else model[k] = v;
      }
    }
  }
  return model;
}

const MONEY = ["value", "price", "quantity", "index", "weight_grams", "gold_rate", "making_charge", "total_grams", "shipping", "tax", "service_fee", "discount"];
const twoDecimals = (n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
/** T20: ecommerce:null before each ecommerce push, EGP, numbers, and no personal data. */
function auditPushes(label, dl, secrets) {
  const problems = [];
  dl.forEach((push, i) => {
    if (!push || typeof push !== "object" || "0" in push) return;
    if (push.ecommerce && push.ecommerce !== UNDEF) {
      const prev = dl[i - 1];
      if (!prev || prev.ecommerce !== null) problems.push(`${push.event}: no ecommerce:null before it`);
      if (push.ecommerce.currency !== "EGP") problems.push(`${push.event}: currency ${push.ecommerce.currency}`);
      if (!push.event_id) problems.push(`${push.event}: no event_id`);
      const nums = [push.ecommerce, ...(push.ecommerce.items ?? [])];
      for (const obj of nums) for (const key of MONEY) if (key in obj && !twoDecimals(obj[key])) problems.push(`${push.event}.${key}=${JSON.stringify(obj[key])}`);
      for (const item of push.ecommerce.items ?? []) {
        for (const key of ["item_id", "item_name", "item_brand", "item_category", "item_category2", "item_category3", "item_category4", "price", "quantity", "weight_grams", "karat", "fineness", "gold_rate", "making_charge", "stock_status"]) {
          if (!(key in item)) problems.push(`${push.event}: item without ${key}`);
        }
      }
    }
  });
  const text = JSON.stringify(dl).toLowerCase();
  for (const s of secrets) if (s && text.includes(String(s).toLowerCase())) problems.push(`personal data in the data layer: ${s}`);
  check(`T20 ${label}: every push well-formed, no personal data`, problems.length === 0, problems.slice(0, 5).join("; "));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
async function newContext(withGa = false) {
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  if (withGa) {
    const url = BASE;
    await context.addCookies([
      { name: "_ga", value: "GA1.1.1234567890.1794132000", url },
      { name: "_ga_TEST123", value: "GS2.1.s1794391200$o3$g1$t1794391300$j60$l0$h0", url },
    ]);
  }
  // Store, phone and map links leave the site: keep the test on the page (the event still fires).
  await context.addInitScript(() => {
    window.addEventListener(
      "click",
      (e) => {
        const a = e.target?.closest?.("a");
        const href = a?.getAttribute("href") ?? "";
        if (a && (/^(tel:|mailto:)/.test(href) || (/^https?:/.test(href) && !href.startsWith(location.origin)))) e.preventDefault();
      },
      true,
    );
  });
  return context;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

try {
  // ===== Flow 1: Arabic guest browsing (T1, T2, T3, T19, language switch) =====
  {
    const context = await newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/`);
    const [home] = await waitFor(page, "virtual_page_view");
    check("T1 home page view", home?.page_type === "home" && home.page_language === "ar" && home.login_status === "guest" && !("user_id" in home) && !("id_verification" in home), JSON.stringify(home));
    const picks = (await waitFor(page, "view_item_list")).find((e) => e.ecommerce.item_list_id === "home_picks");
    let dl = await layer(page);
    check("R7 view_item_list after the page view", picks && dl.indexOf(dl.find((e) => e.event === "virtual_page_view")) < dl.findIndex((e) => e.event === "view_item_list"));
    check("home picks list", picks?.ecommerce.item_list_name === "Home: Picks to start" && picks.ecommerce.items.every((it, i) => it.index === i && it.item_list_id === "home_picks"));
    const consent = dl.find((p) => p && p[0] === "consent");
    check("Consent Mode defaults before any push", dl.indexOf(consent) === 0 && consent[1] === "default" && consent[2].analytics_storage === "granted" && consent[2].ad_storage === "denied" && consent[2].ad_user_data === "denied" && consent[2].ad_personalization === "denied");
    await shot(page, "01-home-ar");

    // T3: a home pick → its product page.
    const firstPick = page.locator(".pcard .pc-link").first();
    const pickHref = await firstPick.getAttribute("href");
    await firstPick.click();
    await page.waitForURL(`**${pickHref}`);
    const [pv2] = (await waitFor(page, "virtual_page_view", 2)).slice(1);
    const [viewItem] = await waitFor(page, "view_item");
    dl = await layer(page);
    const select = named(dl, "select_item")[0];
    check("T3 select_item from home picks", select?.ecommerce.item_list_id === "home_picks" && select.ecommerce.items[0].index === 0);
    check("T3 view_item keeps the list", viewItem?.ecommerce.items[0].item_list_id === "home_picks" && viewItem.ecommerce.items[0].index === 0 && viewItem.ecommerce.value === viewItem.ecommerce.items[0].price);
    check("T1 product page view with its own title", pv2?.page_type === "product" && pv2.page_title === (await page.title()), `${pv2?.page_title} vs ${await page.title()}`);
    check("R7 product: page view before view_item", dl.indexOf(pv2) < dl.indexOf(dl.find((e) => e.event === "view_item")));

    // T1: the gold price page, then the price tools.
    await page.locator("header .nav-prices").click();
    await page.waitForURL("**/gold-price-today");
    const pv3 = (await waitFor(page, "virtual_page_view", 3))[2];
    check("T1 price page view", pv3?.page_type === "gold_prices" && pv3.page_title === (await page.title()));
    const barsList = (await waitFor(page, "view_item_list", 2)).find((e) => e.ecommerce.item_list_id === "prices_bar_table");
    check("prices bar list", Boolean(barsList));
    await page.locator(".pr-calc #pr-weight").fill("5");
    const [calc] = await waitFor(page, "price_calculator_use", 1, 4000);
    check("price_calculator_use after 1 s", calc?.weight_grams === 5 && calc.karat === "24" && calc.page_type === "gold_prices", JSON.stringify(calc));
    await page.locator("button.fp[aria-pressed=false]").first().click();
    const [range] = await waitFor(page, "price_chart_range");
    check("price_chart_range", ["24h", "7d", "30d", "3m", "6m", "1y"].includes(range?.range), JSON.stringify(range));

    // T2: /shop, switch the tabs.
    await page.locator("header .nav-shop").first().click();
    await page.waitForURL("**/shop");
    const pv4 = (await waitFor(page, "virtual_page_view", 4))[3];
    check("T1 shop page view", pv4?.page_type === "shop");
    await waitFor(page, "view_item_list", 3);
    const tabs = page.locator(".filters .fp");
    const n = await tabs.count();
    for (let i = 1; i < n; i++) await tabs.nth(i).click();
    await page.waitForTimeout(500);
    dl = await layer(page);
    const shopLists = named(dl, "view_item_list").filter((e) => e.ecommerce.item_list_id === "shop_all");
    const filters = named(dl, "filter_apply");
    check("T2 view_item_list once for shop_all", shopLists.length === 1);
    check("T2 filter_apply per tab", filters.length === n - 1 && filters.every((f) => f.filter_type === "category" && f.item_list_id === "shop_all"), `${filters.length} for ${n - 1} tabs`);
    const afterShop = dl.slice(dl.indexOf(named(dl, "virtual_page_view")[3]));
    check("T2 no new list ids, no extra page views", named(afterShop, "view_item_list").length === 1 && named(dl, "virtual_page_view").length === 4);

    // T19: store badges and the hotline in the footer.
    const ios = page.locator("footer a[data-store=ios]");
    if (await ios.count()) {
      await ios.click();
      await page.locator("footer a[data-store=android]").click();
    }
    await page.locator('footer a[href^="tel:"]').first().click();
    dl = await layer(page);
    const stores = named(dl, "app_store_click");
    check("T19 app_store_click with store and placement", stores.length === 2 && stores[0].store === "app_store" && stores[1].store === "google_play" && stores.every((s) => s.placement === "footer"), JSON.stringify(stores));
    const call = named(dl, "contact_click")[0];
    check("T19 contact_click phone", call?.method === "phone" && call.placement === "footer");
    const model = modelAt(dl, dl.indexOf(call));
    check("supporting keys reset: no filter_value at contact_click", !("filter_value" in model) && !("filter_type" in model) && !("store" in model) && model.page_type === "shop", JSON.stringify(model));

    // Language switch → the English page.
    await page.locator("header .lang-switch").click();
    await page.waitForURL("**/en/shop");
    const [sw] = await waitFor(page, "language_switch");
    const pv5 = (await waitFor(page, "virtual_page_view", 5))[4];
    check("language_switch ar → en", sw?.from_language === "ar" && sw.to_language === "en");
    check("T17 English page view", pv5?.page_language === "en" && pv5.page_type === "shop");
    dl = await layer(page);
    const paths = named(dl, "virtual_page_view").map((v) => v.page_path);
    check("T1 one page view per page", new Set(paths).size === paths.length, paths.join(" → "));

    // 404
    await page.goto(`${BASE}/shop/no-such-piece`);
    const [nf] = await waitFor(page, "virtual_page_view");
    check("not_found page type", nf?.page_type === "not_found", nf?.page_type);
    auditPushes("browsing", await layer(page), []);
    await context.close();
  }

  // ===== Flow 2: zakat =====
  {
    const context = await newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/zakat-calculator`);
    await waitFor(page, "virtual_page_view");
    await page.locator("#zk-gold-24").fill("100");
    await page.locator("#zk-cash").fill("5000");
    const [z1] = await waitFor(page, "zakat_calculate", 1, 4000);
    check("zakat_calculate gold with savings", z1?.metals === "gold" && z1.has_savings === "yes", JSON.stringify(z1));
    await page.locator("#zk-silver").fill("700");
    const z2 = (await waitFor(page, "zakat_calculate", 2, 4000))[1];
    check("zakat_calculate gold_silver", z2?.metals === "gold_silver");
    await context.close();
  }

  // ===== Flow 3: product page and cart drawer (T4, T5, T6, T7) =====
  {
    const context = await newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/shop/${bar10.slug}`);
    const [vi] = await waitFor(page, "view_item");
    const item = vi?.ecommerce.items[0];
    check("view_item of the 10 g bar", item?.item_id === String(bar10.id) && item.price === bar10.pricePiastres / 100 && item.item_category3 === "10 g" && item.item_category4 === "24K" && item.fineness === "999.9" && item.stock_status === "in_stock" && !("item_list_id" in item), JSON.stringify(item));
    await page.locator(".pdp-qty button").last().click();
    await page.locator(".pdp-add").click();
    const [add] = await waitFor(page, "add_to_cart");
    check("T5 add 2 units", add?.ecommerce.items[0].quantity === 2 && add.ecommerce.value === Math.round(bar10.pricePiastres * 2) / 100 && add.ecommerce.total_grams === 20, JSON.stringify(add?.ecommerce));

    // T4: a new board while on the page.
    await publishGold(5000);
    const fresh = (await (await fetch(`${API}/api/products`)).json()).find((p) => p.id === bar10.id);
    await page.waitForFunction((text) => document.body.innerText.includes(text), new Intl.NumberFormat("ar-EG").format(Math.round(fresh.pricePiastres / 100)), { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.locator(".pdp-add").click();
    const add2 = (await waitFor(page, "add_to_cart", 2))[1];
    let dl = await layer(page);
    check("T4 view_item not re-fired by a new rate", named(dl, "view_item").length === 1);
    check("T4 next add_to_cart at the new price", add2?.ecommerce.items[0].price === fresh.pricePiastres / 100, `${add2?.ecommerce.items[0].price} vs ${fresh.pricePiastres / 100}`);

    // T7: the drawer.
    await page.locator(".cart-chip").click();
    const [vc] = await waitFor(page, "view_cart");
    // 2 + 2 (the quantity picker still says 2 for the second add)
    check("view_cart on open", add2?.ecommerce.items[0].quantity === 2 && vc?.ecommerce.items[0].quantity === 4 && vc.ecommerce.total_grams === 40 && vc.ecommerce.value === Math.round(fresh.pricePiastres * 4) / 100 && vc.ecommerce.items[0].item_brand === bar10.manufacturerEn, JSON.stringify(vc?.ecommerce));
    await page.locator(".cart-line .cart-qty button").first().click();
    const [rm1] = await waitFor(page, "remove_from_cart");
    check("T7 remove one", rm1?.ecommerce.items[0].quantity === 1 && rm1.ecommerce.total_grams === 10);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.locator(".cart-chip").click();
    await waitFor(page, "view_cart", 2);
    await page.waitForTimeout(800);
    await page.locator(".cart-line .cart-drop").first().click();
    const rm2 = (await waitFor(page, "remove_from_cart", 2))[1];
    dl = await layer(page);
    check("T7 view_cart once per open", named(dl, "view_cart").length === 2);
    check("T7 remove the line (its 3 remaining units)", rm2?.ecommerce.items[0].quantity === 3 && rm2.ecommerce.total_grams === 30, JSON.stringify(rm2?.ecommerce.items[0]));
    await shot(page, "02-cart-drawer-ar");
    await page.keyboard.press("Escape");

    // T6: out of stock.
    const sold = products.find((p) => p.category === "coin" && p.weightGrams === 8);
    await admin(`/admin/catalog/products/${sold.id}`, "PATCH", { stock: 0 }).catch(async () => {
      throw new Error("could not set stock 0 through the admin API");
    });
    await page.goto(`${BASE}/shop/${sold.slug}`);
    const [vo] = await waitFor(page, "view_item");
    check("T6 out-of-stock view_item", vo?.ecommerce.items[0].stock_status === "out_of_stock" && vo.ecommerce.items[0].item_category2 === "Coin" && vo.ecommerce.items[0].fineness === "875");
    check("T6 no add possible", (await page.locator(".pdp-add").count()) === 0 && (await page.locator(".pc-buy[disabled]").count()) > 0);
    await admin(`/admin/catalog/products/${sold.id}`, "PATCH", { stock: 25 });
    auditPushes("product and cart", await layer(page), []);
    await context.close();
  }

  // ===== Flow 4: sign up, Arabic checkout, branch pickup + InstaPay (T8, T10, T11, T12, T16) =====
  const stamp = Date.now();
  const customer = { first: "Test", last: `Buyer${stamp % 100000}`, email: `ga4.e2e.${stamp}@example.com`, mobile: `010${String(stamp).slice(-8)}`, password: "E2e-Password-2026", street: "12 Test Street Nasr City" };
  const secrets = [customer.email, customer.mobile, customer.last, customer.street];
  const orders = [];
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  async function mockOrders(context, fulfilment) {
    await context.route("**/api/orders", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const sent = route.request().postDataJSON();
      let response = await route.fetch();
      // A backend without the GA4 contract refuses the unknown `analytics` field: send it without.
      if (response.status() === 400 && sent.analytics) {
        const { analytics: _drop, ...rest } = sent;
        void _drop;
        response = await route.fetch({ postData: JSON.stringify(rest) });
      }
      const order = await response.json();
      if (response.ok() && !order.tracking) {
        const zones = await (await fetch(`${API}/api/zones`)).json();
        const shipping = sent.fulfilment === "delivery" ? zones.find((z) => z.governorate === sent.customer.governorate).costPiastres / 100 : 0;
        order.tracking = { transaction_id: order.reference, currency: "EGP", value: order.totalPiastres / 100, shipping, service_fee: 0, tax: 0, coupon: "", shipping_tier: sent.fulfilment === "delivery" ? "Insured delivery" : "Branch pickup", payment_type: sent.paymentMethod === "bank" ? "Bank transfer" : "InstaPay", customer_type: orders.length ? "returning" : "new", total_grams: 0, items: [] };
        // Items as the backend's gaItem() would build them from the order lines.
        const catalogue = await (await fetch(`${API}/api/products`)).json();
        for (const line of sent.items) {
          const p = catalogue.find((x) => x.id === line.productId);
          const list = sent.analytics?.lines?.find((l) => l.productId === line.productId);
          order.tracking.items.push({
            item_id: String(p.id), item_name: p.nameEn, item_brand: p.manufacturerEn, item_category: p.karat === 999 ? "Silver" : "Gold",
            item_category2: ["wear", "pendants"].includes(p.category) ? "Wearable bar" : p.category === "coin" ? "Coin" : "Bar",
            item_category3: `${Math.round(p.weightGrams * 100) / 100} g`, item_category4: `${p.karat}K`,
            ...(list ? { item_list_id: list.itemListId, item_list_name: list.itemListName, index: list.index } : {}),
            price: p.pricePiastres / 100, quantity: line.qty, weight_grams: Math.round(p.weightGrams * 100) / 100, karat: String(p.karat),
            fineness: p.karat === 21 ? "875" : "999.9", gold_rate: Math.round(p.metalPiastres / p.weightGrams) / 100, making_charge: p.laborPiastres / 100, stock_status: "in_stock",
          });
          order.tracking.total_grams = Math.round((order.tracking.total_grams + p.weightGrams * line.qty) * 100) / 100;
        }
        order.__mocked = true;
      }
      orders.push({ sent, order, fulfilment });
      await route.fulfill({ response, json: order });
    });
  }
  {
    const context = await newContext(true);
    await mockOrders(context, "branch");
    const page = await context.newPage();
    await page.goto(`${BASE}/sign-up`);
    await waitFor(page, "virtual_page_view");
    await page.locator('input[autocomplete="given-name"]').fill(customer.first);
    await page.locator('input[autocomplete="family-name"]').fill(customer.last);
    await page.locator('input[type="email"]').fill(customer.email);
    await page.locator('input[type="tel"]').fill(customer.mobile);
    await page.locator('input[autocomplete="new-password"]').fill(customer.password);
    await page.locator("form.login-card .login-btn").click();
    const [su] = await waitFor(page, "sign_up");
    check("sign_up", su?.method === "email");
    await page.waitForURL("**/account**");
    const me = await page.evaluate(() => fetch("/api/auth/me").then((r) => r.json()));
    const pvAcc = (await waitFor(page, "virtual_page_view", 2))[1];
    check("logged-in page view with user_id", pvAcc?.login_status === "logged_in" && pvAcc.user_id === String(me.user.id) && pvAcc.page_type === "account", JSON.stringify(pvAcc));

    // A coin chosen from its category page, a bar added straight from the bars grid.
    await page.goto(`${BASE}/gold-coins`);
    const coinCard = page.locator(".grid-buy .pcard").filter({ has: page.locator(".pc-buy:not([disabled])") }).first();
    await coinCard.locator(".pc-link").click();
    await page.waitForURL("**/shop/**");
    await waitFor(page, "view_item");
    let dl = await layer(page);
    const coinSelect = named(dl, "select_item")[0];
    await page.locator(".pdp-add").click();
    await waitFor(page, "add_to_cart");
    dl = await layer(page);
    const coinAdd = named(dl, "add_to_cart")[0];
    check("list context carried select → add_to_cart", coinSelect?.ecommerce.item_list_id === "category_gold_coins" && coinAdd?.ecommerce.items[0].item_list_id === "category_gold_coins" && coinAdd.ecommerce.items[0].item_list_name === "Category: Gold coins");
    await page.goto(`${BASE}/gold-bars`);
    const [barsView] = await waitFor(page, "view_item_list");
    check("category list id from the route", barsView?.ecommerce.item_list_id === "category_gold_bars");
    await page.locator(".grid-buy .pcard .pc-buy:not([disabled])").first().click();
    const [gridAdd] = await waitFor(page, "add_to_cart");
    check("add_to_cart from a grid carries its list", gridAdd?.ecommerce.items[0].item_list_id === "category_gold_bars" && gridAdd.ecommerce.items[0].index === 0);

    // Checkout.
    await page.goto(`${BASE}/checkout`);
    const [bc] = await waitFor(page, "begin_checkout");
    check("begin_checkout with items, grams and coupon", bc?.ecommerce.items.length === 2 && bc.ecommerce.coupon === "" && bc.ecommerce.total_grams > 0 && bc.ecommerce.value === Math.round(bc.ecommerce.items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100, JSON.stringify(bc?.ecommerce));
    check("begin_checkout keeps list context", bc?.ecommerce.items.some((i) => i.item_list_id === "category_gold_coins") && bc.ecommerce.items.some((i) => i.item_list_id === "category_gold_bars"));
    const [ship] = await waitFor(page, "add_shipping_info");
    check("T8 add_shipping_info Branch pickup", ship?.ecommerce.shipping_tier === "Branch pickup");
    const [idStart] = await waitFor(page, "id_verification_start");
    check("id_verification_start on checkout", idStart?.placement === "checkout");
    await page.reload();
    await waitFor(page, "virtual_page_view");
    await page.waitForTimeout(2500);
    dl = await layer(page);
    check("R8 refresh: no second begin_checkout or add_shipping_info", named(dl, "begin_checkout").length === 0 && named(dl, "add_shipping_info").length === 0);

    // T10: a 3 MB photo, then valid ones.
    const files = page.locator('input[type="file"]');
    await files.nth(0).setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(3 * 1024 * 1024, 1) });
    const [up1] = await waitFor(page, "id_upload");
    check("T10 too large", up1?.side === "front" && up1.status === "error" && up1.error_reason === "too_large", JSON.stringify(up1));
    await files.nth(0).setInputFiles({ name: "front.png", mimeType: "image/png", buffer: png });
    await files.nth(1).setInputFiles({ name: "back.png", mimeType: "image/png", buffer: png });
    const ups = await waitFor(page, "id_upload", 3);
    check("T10 then success, both sides", ups[1]?.status === "success" && ups[2]?.status === "success" && new Set(ups.slice(1).map((u) => u.side)).size === 2 && !("error_reason" in ups[1]), JSON.stringify(ups));

    // T16: a new board while on checkout.
    await publishGold(4000);
    const [cpu] = await waitFor(page, "checkout_price_update", 1, 20000);
    check("T16 checkout_price_update", cpu && cpu.currency === "EGP" && cpu.direction === "up" && cpu.new_value > cpu.previous_value, JSON.stringify(cpu));

    // T11: InstaPay and terms, then place.
    await page.locator("label[for=pay-instapay]").click();
    await page.locator("aside .chk-box").click();
    const [pay] = await waitFor(page, "add_payment_info");
    check("T11 add_payment_info InstaPay", pay?.ecommerce.payment_type === "InstaPay");
    await page.waitForTimeout(800);
    await shot(page, "03-checkout-ar");
    await page.locator(".place").click();
    const [po] = await waitFor(page, "place_order", 1, 20000);
    dl = await layer(page);
    const placed = orders[0];
    check("T11 place_order once, from the order record", named(dl, "place_order").length === 1 && po?.event_id === `place_order_${placed.order.reference}` && JSON.stringify(po.ecommerce) === JSON.stringify(placed.order.tracking), placed?.order.__mocked ? "tracking mocked (backend without the contract)" : "tracking from the backend");
    check("T11 no purchase from the browser", named(dl, "purchase").length === 0);
    const conf = named(dl, "virtual_page_view").at(-1);
    check("confirmation page view before place_order", conf.page_type === "order_confirmation" && dl.indexOf(conf) < dl.indexOf(dl.find((e) => e.event === "place_order")));
    check("id_verification_submit", named(dl, "id_verification_submit")[0]?.placement === "checkout");
    check("T16 place_order value is the confirmed total", po?.ecommerce.value === placed.order.totalPiastres / 100);
    const a = placed.sent.analytics;
    check("order request carries GA ids and list context", a?.gaClientId === "1234567890.1794132000" && a.gaSessionId === "1794391200" && a.lines.length === 2 && a.lines.every((l) => /^[a-z0-9_]+$/.test(l.itemListId)), JSON.stringify(a));
    await shot(page, "04-confirmation-ar");
    auditPushes("Arabic checkout", dl, secrets);

    // T12: reload the confirmation 3 times, then open it again.
    const key = `place_order_tracked_${placed.order.reference}`;
    check("T12 dedupe key stored", (await page.evaluate((k) => localStorage.getItem(k), key)) === "1");
    let again = 0;
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await waitFor(page, "virtual_page_view");
      await page.waitForTimeout(1000);
      again += named(await layer(page), "place_order").length;
    }
    check("T12 no place_order after 3 reloads", again === 0);
    await context.close();
  }

  // ===== Flow 5: English, sign in, insured delivery + bank transfer (T9, T17), sign out =====
  {
    const context = await newContext(true);
    await mockOrders(context, "delivery");
    const page = await context.newPage();
    await page.goto(`${BASE}/en/sign-in`);
    await waitFor(page, "virtual_page_view");
    await page.locator('input[type="email"]').fill(customer.email);
    await page.locator('input[autocomplete="current-password"]').fill(customer.password);
    await page.locator("form.login-card .login-btn").click();
    const [login] = await waitFor(page, "login");
    check("login", login?.method === "email");
    await page.waitForURL("**/en/account**");
    await page.goto(`${BASE}/en/shop`);
    await waitFor(page, "view_item_list");
    await page.locator(".grid-buy .pcard .pc-buy:not([disabled])").first().click();
    const [add] = await waitFor(page, "add_to_cart");
    check("T17 English item name and shop_all list", /^[\x20-\x7e]+$/.test(add?.ecommerce.items[0].item_name) && add.ecommerce.items[0].item_list_id === "shop_all");
    await page.goto(`${BASE}/en/checkout`);
    const [pv] = await waitFor(page, "virtual_page_view");
    check("T17 page_language en on checkout", pv?.page_language === "en" && pv.page_type === "checkout");
    await waitFor(page, "begin_checkout");
    await page.locator("label[for=ship-delivery]").click();
    await page.locator("#co-street").fill(customer.street);
    const ships = await waitFor(page, "add_shipping_info", 2);
    check("T9 add_shipping_info Insured delivery on change", ships.at(-1)?.ecommerce.shipping_tier === "Insured delivery", ships.map((s) => s.ecommerce.shipping_tier).join(","));
    const files = page.locator('input[type="file"]');
    await files.nth(0).setInputFiles({ name: "front.png", mimeType: "image/png", buffer: png });
    await files.nth(1).setInputFiles({ name: "back.png", mimeType: "image/png", buffer: png });
    await waitFor(page, "id_upload", 2);
    await page.locator("label[for=pay-bank]").click();
    await page.locator("aside .chk-box").click();
    const [pay] = await waitFor(page, "add_payment_info");
    check("add_payment_info Bank transfer", pay?.ecommerce.payment_type === "Bank transfer");
    await page.waitForTimeout(800);
    await shot(page, "05-checkout-en");
    await page.locator(".place").click();
    const [po] = await waitFor(page, "place_order", 1, 20000);
    const placed = orders.at(-1);
    check("T9 place_order with delivery shipping", po?.ecommerce.shipping_tier === "Insured delivery" && po.ecommerce.shipping === placed.order.tracking.shipping && po.ecommerce.payment_type === "Bank transfer" && placed.sent.fulfilment === "delivery");
    auditPushes("English checkout", await layer(page), secrets);
    await shot(page, "06-confirmation-en");

    // Sign out: the id is cleared, the next page is a guest's.
    await page.goto(`${BASE}/en/account`);
    await waitFor(page, "virtual_page_view");
    await page.locator("header button.navlink").filter({ hasText: /sign out/i }).first().click();
    await page.waitForURL("**/en");
    const views = await waitFor(page, "virtual_page_view", 2);
    const dl = await layer(page);
    const clear = dl.findIndex((p) => p && p.login_status === "guest" && p.user_id === UNDEF && !p.event);
    const last = views.at(-1);
    check("logout clears user_id", clear > 0 && last.login_status === "guest" && !("user_id" in last) && !("user_id" in modelAt(dl, dl.indexOf(last))), JSON.stringify(last));
    await context.close();
  }
} catch (error) {
  check("script finished", false, error.stack ?? String(error));
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "results.txt"), results.join("\n") + "\n");
console.log(`\n${results.length - failures} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
