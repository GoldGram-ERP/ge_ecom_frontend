import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { branchPickup, requireKycDocPerOrder } from "@/lib/server-api";

// Anyone can order (owner's decision, 2026-10-19): a signed-in customer starts with their
// email and mobile filled in, a guest is offered an account after the order is placed.
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  // One parallel read of the settings the checkout needs on the server, so nothing flickers.
  const [branch, kycRequired] = await Promise.all([branchPickup(), requireKycDocPerOrder()]);
  return (
    <div className="page checkout-page">
      <SiteHeader />
      <Checkout branchPickup={branch} requireKycDoc={kycRequired} />
    </div>
  );
}