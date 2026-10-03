import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Marketing } from "@/components/marketing/marketing";
import { currentUser } from "@/lib/auth";
import { language } from "@/lib/server";

export const metadata: Metadata = {
  title: "Sales Taptics: role-play training for car sales floors",
  description: "Your salespeople practice the hard conversations against an AI customer, in English and Miami Spanish, and get scored on every line before they ever face a real up.",
};

/** The public home page (decision 0028). Signed-in people go straight to the app. */
export default async function Home() {
  if (await currentUser()) redirect("/today");
  return <Marketing lang={await language()} />;
}
