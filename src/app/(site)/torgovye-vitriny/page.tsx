import {
  ConstructionPage,
  generateConstructionMetadata,
} from "@/components/templates/construction-template";
import type { Metadata } from "next";

/** `/torgovye-vitriny/`: construction document `torgovye-vitriny` (template of task 26). */
const SLUG = "torgovye-vitriny";

/** Fixed URL, no params; rendered on the first request (no DB at build time), then ISR. */
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return generateConstructionMetadata({ slug: SLUG });
}

export default function Page() {
  return <ConstructionPage slug={SLUG} />;
}
