import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Marketing } from "@/components/marketing/marketing";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

export const metadata: Metadata = {
  title: "Sales Taptics: sales training for every close",
  description: "Learn a proven sales technique in about a minute, practice it out loud against an AI customer, and get scored on every line. For teams and individuals, in English and Spanish.",
};

/** The public home page (decision 0028). Signed-in people go straight to the app. */
export default async function Home() {
  if (await currentUser()) redirect("/today");
  return <Marketing lang={await language()} />;
}
