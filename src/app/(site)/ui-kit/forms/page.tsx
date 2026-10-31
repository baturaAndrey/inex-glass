import { notFound } from "next/navigation";
import { getEnv } from "@/lib/env";
import { FormsDemo } from "./forms-demo";
import type { Metadata } from "next";

/**
 * Internal catalog of the form primitives (Field, inputs, chips, radio cards, upload…)
 * for visual checks at 375 / 1366 / 1920. 404 when SITE_ENV=production, never indexed.
 * Rendered per request because one Docker image serves both staging and prod.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI kit — формы",
  robots: { index: false, follow: false },
};

export default function UiKitFormsPage() {
  if (getEnv().SITE_ENV === "production") notFound();

  return <FormsDemo />;
}
