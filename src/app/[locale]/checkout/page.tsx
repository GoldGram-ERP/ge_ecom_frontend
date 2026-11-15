import type { Metadata } from "next";
import { routeParams } from "@/lib/seo";
import { requestMetadata } from "@/lib/seo-page";
import { notFound } from "next/navigation";
import { getTexts as textsForTitle } from "@/lib/site-texts";
import { Checkout } from "@/components/Checkout";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { branchPickup, promoAvailable, requireKycDocPerOrder } from "@/lib/server-api";

// Rendered per request (it reads the visitor's request), never cached.
export const dynamic = "force-dynamic";

// A guest can check out without an account: they fill in the form (email included), and once the
// order is placed they are offered an account with that email. A signed-in customer starts with
// their name, email and mobile filled in from the account (done in <Checkout>).
export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) return {};
  return { ...(await requestMetadata(locale)), title: { absolute: `${(await textsForTitle(locale)).seoNames.checkout} | GoldGram` } };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await routeParams(params);
  if (!hasLocale(locale)) notFound();

  // One parallel read of the settings the checkout needs on the server, so nothing flickers.
  const [branch, kycRequired, promo] = await Promise.all([branchPickup(), requireKycDocPerOrder(), promoAvailable()]);
  return (
    <div className="page checkout-page">
      <SiteHeader />
      <Checkout branchPickup={branch} requireKycDoc={kycRequired} promoAvailable={promo} />
    </div>
  );
}
