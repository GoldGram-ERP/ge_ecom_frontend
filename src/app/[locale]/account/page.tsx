import Link from "next/link";
import { localePath } from "@/i18n";
import { notFound } from "next/navigation";
import { Icon, ICONS, MiniArt } from "@/components/chrome";
import { AccountLink, SignOutButton, SiteHeader } from "@/components/header-client";
import type { Dict, Locale } from "@/i18n";
import { fmt, hasLocale } from "@/i18n";
import { getTexts } from "@/lib/site-texts";
import { cairoDate, cairoHour, changeLine, changeParts, durationText, karatLabel, pounds, poundsParts, productShortName } from "@/lib/format";
import { getMyOrders, getPrices, getProducts, getUser, showOutOfStockHome } from "@/lib/server-api";
import type { Category, MyOrder } from "@/lib/types";
import { ProofUpload } from "@/components/proof-upload";

const TABS = ["home", "balance", "profile"] as const;

const sum = (orders: MyOrder[]) => orders.reduce((total, order) => total + order.totalPiastres, 0);

function OrderList({ orders, locale, t }: { orders: MyOrder[]; locale: Locale; t: Dict }) {
  return (
    <ul className="orders">
      {orders.map((order) => (
        <li key={order.id}>
          <b dir="ltr">{order.reference}</b>
          <span>{cairoDate(order.createdAt, locale)}</span>
          <em>
            {pounds(order.totalPiastres)} <small className="egp">{t.product.egp}</small>
          </em>
          <i className={`st st-${order.status}`}>{t.account.status[order.status]}</i>
          {/* While the payment is unchecked: a screenshot until the order is paid for; after a new,
              higher price only the difference is asked for, and nothing once the payment covers it. */}
          {order.status === "initiated" || order.status === "pending" ? (
            !order.hasProof ? (
              <ProofUpload orderId={order.id} />
            ) : order.remainingPiastres > 0 ? (
              <div className="proof-due">
                <p>
                  {fmt(t.account.remaining, { amount: `${pounds(order.remainingPiastres)} ${t.product.egp}` })}{" "}
                  <small>{fmt(t.account.paidSoFar, { amount: `${pounds(order.paidPiastres ?? 0)} ${t.product.egp}` })}</small>
                </p>
                <ProofUpload orderId={order.id} label={t.checkout.proofTopUp} />
              </div>
            ) : (
              <span className="proof-note ok">{(order.paidPiastres ?? 0) > order.totalPiastres ? t.account.covered : t.checkout.proofSent}</span>
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// The prototype's "app" screen: what a customer lands on after signing in, or in guest mode
// after "Continue as a guest". Market and Price Chart lead somewhere on the site; Gift, Save
// and the lower tabs belong to the mobile app and are drawn as the prototype drew them.
export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  const wanted = (await searchParams).tab;
  const tab = TABS.find((key) => key === wanted) ?? "home";
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);

  const [user, prices, products, withSoldOut, orders] = await Promise.all([getUser(), getPrices(), getProducts(), showOutOfStockHome(), getMyOrders()]);

  const k24 = prices.karats.find((k) => k.karat === 24) ?? prices.karats[0];
  const change = changeLine(k24.changePct, locale, t.account.today);
  const { market } = prices;
  const hour = cairoHour(new Date());
  const greeting = hour < 12 ? t.account.morning : hour < 18 ? t.account.afternoon : t.account.evening;
  // Bars, then the wearable piece, then the coin: the order the prototype shows them in.
  // Categories the drawings do not know come after them.
  const popularOrder: Category[] = ["bar", "wear", "coin"];
  const place = (category: Category) => (popularOrder.indexOf(category) + popularOrder.length + 1) % (popularOrder.length + 1);
  const featured = products
    .filter((p) => p.featured && (withSoldOut || p.inStock !== false))
    .sort((x, y) => place(x.category) - place(y.category));
  // The forms to shop by: every category that has pieces, named as the dashboard sets it.
  const forms = products.filter((p, i) => products.findIndex((q) => q.category === p.category) === i);
  const shop = localePath(locale, `/shop`);
  const account = localePath(locale, `/account`);
  const labels = { home: t.account.tabHome, balance: t.account.tabBalance, profile: t.account.tabProfile };

  // Balance: money, read from the orders. There is no wallet, so nothing here is a stored amount.
  const due = orders.filter((order) => order.status === "initiated" || order.status === "pending");
  const paid = orders.filter((order) => ["processing", "shipping", "ready", "completed"].includes(order.status));
  const refunds = orders.filter((order) => order.status === "refund" || order.refunded);

  return (
    <div className={`page app-page${user ? "" : " is-guest"}`}>
      <SiteHeader
        end={
          <>
            <span className="guest-flag">{t.account.guest}</span>
            {user ? <SignOutButton /> : <AccountLink />}
          </>
        }
      />

      <div className="app-shell">
        {/* a row under the header on wide screens, pinned to the bottom of a phone */}
        <nav className="app-tabs" aria-label={t.account.tabsLabel}>
          {TABS.map((key) => (
            <Link key={key} href={key === "home" ? account : `${account}?tab=${key}`} aria-current={tab === key ? "page" : undefined}>
              <span className={tab === key ? "on" : undefined}>{labels[key]}</span>
            </Link>
          ))}
        </nav>

        {tab !== "home" ? (
          <div className="app-tab">
            <h1>{labels[tab]}</h1>
            {!user ? (
              <div className="guest-bar">
                <p>{t.account.guestBar}</p>
                <Link href={localePath(locale, `/sign-in`)}>{t.nav.signIn}</Link>
              </div>
            ) : tab === "balance" ? (
              <>
                <div className="tiles three">
                  <div>
                    <b>
                      {pounds(due.reduce((total, order) => total + order.remainingPiastres, 0))} <small className="egp">{t.product.egp}</small>
                    </b>
                    <span>{t.account.toPay}</span>
                  </div>
                  <div>
                    <b>
                      {pounds(sum(paid))} <small className="egp">{t.product.egp}</small>
                    </b>
                    <span>{t.account.paid}</span>
                  </div>
                  <div>
                    <b>
                      {pounds(sum(refunds))} <small className="egp">{t.product.egp}</small>
                    </b>
                    <span>{t.account.refunds}</span>
                  </div>
                </div>
                {due.length > 0 ? (
                  <div className="app-sheet">
                    <h3 className="app-h">{t.account.toPay}</h3>
                    <p className="tab-note">{t.account.toPayNote}</p>
                    <OrderList orders={due} locale={locale} t={t} />
                  </div>
                ) : null}
                <div className="app-sheet">
                  <h3 className="app-h">{t.account.allOrders}</h3>
                  {orders.length === 0 ? (
                    <div className="orders-none">
                      <p>{t.account.noOrders}</p>
                      <Link className="gold-btn" href={shop}>
                        {t.cart.browse}
                      </Link>
                    </div>
                  ) : (
                    <OrderList orders={orders} locale={locale} t={t} />
                  )}
                </div>
              </>
            ) : (
              <div className="app-sheet">
                <dl className="facts">
                  <div>
                    <dt>{t.auth.email}</dt>
                    <dd dir="ltr">{user.email}</dd>
                  </div>
                  <div>
                    <dt>{t.auth.mobile}</dt>
                    <dd dir="ltr">{user.mobile || "—"}</dd>
                  </div>
                  <div>
                    <dt>{t.account.since}</dt>
                    <dd>{cairoDate(user.createdAt, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.account.orderCount}</dt>
                    <dd>{orders.length}</dd>
                  </div>
                </dl>
                <div className="profile-acts">
                  <Link href={localePath(locale, `/account/password`)}>{t.account.changePassword}</Link>
                  <Link href={localePath(locale, `/help`)}>{t.help.kicker}</Link>
                  <SignOutButton />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="app-crown">
          <div className="ac-top">
            <span className="ac-avatar">{user ? user.email.slice(0, 2).toUpperCase() : "GG"}</span>
            <span className="ac-hi">{greeting}</span>
            <span className="ac-icon" aria-hidden="true">
              <Icon d={ICONS.clock} size={16} />
            </span>
            <span className="ac-icon" aria-hidden="true">
              <Icon d={ICONS.home} size={16} />
            </span>
          </div>
          <div className="ac-label">{t.account.live}</div>
          <div className="ac-price">{poundsParts(k24.buyPiastres).full}</div>
          <div className="ac-chg" style={change.down ? { color: "#E79A8E" } : undefined}>
            {change.text}
          </div>
        </div>

        <div className="app-body">
          <div className="session">
            <div className="session-row">
              <span className={`dot${market.open ? "" : " shut"}`} />
              <b>{market.open ? t.account.open : t.account.closed}</b>
              <em>
                {fmt(market.open ? t.account.left : t.account.opensIn, { t: durationText(market.minutesUntilChange, t) })}
              </em>
            </div>
            <div className="session-line">
              <i style={{ width: `${market.progressPct}%` }} />
              <u style={{ insetInlineStart: `${market.progressPct}%` }} />
            </div>
          </div>

          <div className="app-cols">
            <div className="app-col">
              <div className="quick">
                <Link className="q" href={shop}>
                  <i>
                    <Icon d={ICONS.market} />
                  </i>
                  <span>{t.account.market}</span>
                </Link>
                <span className="q">
                  <i>
                    <Icon d={ICONS.gift} />
                  </i>
                  <span>{t.account.gift}</span>
                </span>
                <span className="q">
                  <i>
                    <Icon d={ICONS.save} />
                  </i>
                  <span>{t.account.save}</span>
                </span>
                <Link className="q" href={localePath(locale, `/prices`)}>
                  <i>
                    <Icon d={ICONS.chart} />
                  </i>
                  <span>{t.account.chart}</span>
                </Link>
              </div>

              <div className="app-sheet">
                <h3 className="app-h">
                  {t.account.popular}{" "}
                  <Link href={shop}>
                    <span>{t.account.seeAll}</span>
                  </Link>
                </h3>
                <div className="pop">
                  {featured.map((p) => {
                    // Bars show today's move of their karat, the other pieces their karat, as in the prototype.
                    const move = changeParts(prices.karats.find((k) => k.karat === p.karat)?.changePct ?? 0);
                    return (
                      <Link className="pc" href={`${shop}/${p.id}`} key={p.id}>
                        <MiniArt category={p.category} />
                        <b>{productShortName(p, t)}</b>
                        <i>
                          {pounds(p.pricePiastres)} <small className="egp">{t.product.egp}</small>
                        </i>
                        {p.category === "bar" ? (
                          <em style={move.down ? { color: "#C0452B" } : undefined}>
                            {move.down ? "↓" : "↑"} {move.value}
                          </em>
                        ) : (
                          <em className="muted">{karatLabel(p.karat, t)}</em>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="app-col">
              <div className="app-sheet">
                <h3 className="app-h">{t.account.forms}</h3>
                <div className="forms3">
                  {forms.map((p) => (
                    <Link className="f3" href={`${shop}?c=${p.category}`} key={p.category}>
                      <MiniArt category={p.category} />
                      <span>{locale === "ar" ? p.categoryNameAr : p.categoryNameEn}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {user ? (
                <div className="app-sheet">
                  <h3 className="app-h">{t.account.orders}</h3>
                  {orders.length === 0 ? (
                    <div className="orders-none">
                      <p>{t.account.noOrders}</p>
                      <Link className="gold-btn" href={shop}>
                        {t.cart.browse}
                      </Link>
                    </div>
                  ) : (
                    <OrderList orders={orders.slice(0, 5)} locale={locale} t={t} />
                  )}
                </div>
              ) : (
                <div className="guest-bar">
                  <p>{t.account.guestBar}</p>
                  <Link href={localePath(locale, `/sign-in`)}>{t.nav.signIn}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
