import { notFound, redirect } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { branchPickup, getUser, requireKycDocPerOrder } from "@/lib/server-api";

// Checkout requires an account (owner's decision, 2026-10-27): a guest is sent to sign in or
// register first, then back here, with their name, email and mobile filled in from the account.
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  // A guest cannot check out: send them to sign in / register, then back to checkout.
  const user = await getUser();
  if (!user) redirect(`/${locale}/sign-in?next=checkout`);

  // One parallel read of the settings the checkout needs on the server, so nothing flickers.
  const [branch, kycRequired] = await Promise.all([branchPickup(), requireKycDocPerOrder()]);
  return (
    <div className="page checkout-page">
      <SiteHeader />
      <Checkout branchPickup={branch} requireKycDoc={kycRequired} />
    </div>
  );
}