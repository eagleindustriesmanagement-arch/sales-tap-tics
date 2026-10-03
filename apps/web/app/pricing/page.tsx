import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/pricing";
import { language } from "@/lib/server";

export const metadata: Metadata = {
  title: "Pricing · Sales Taptics",
  description: "Per-seat plans for one salesperson, a team or a full store. Prices are placeholders while pricing is finalized.",
};

/** The public pricing page. Open to everyone, signed in or not; it owns the screen like the home page. */
export default async function PricingPage() {
  return <Pricing lang={await language()} />;
}
