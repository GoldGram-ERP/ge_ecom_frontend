import { notFound } from "next/navigation";
import { Checkout } from "@/components/Checkout";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { branchPickup } from "@/lib/server-api";

// Anyone can order (owner's decision, 2026-10-19): a signed-in customer starts with their
// email and mobile filled in, a guest is offered an account after the order is placed.
export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <div className="page checkout-page">
      <SiteHeader />
      {/* Read on the server, so the branch option never flickers in or out. */}
      <Checkout branchPickup={await branchPickup()} />
    </div>
  );
}