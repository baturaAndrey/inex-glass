import {
  ConstructionPage,
  generateConstructionMetadata,
} from "@/components/templates/construction-template";
import type { Metadata } from "next";

/** `/steklyannye-konstrukcii/`: construction document `steklyannye-konstrukcii` (template of task 26). */
const SLUG = "steklyannye-konstrukcii";

export function generateMetadata(): Promise<Metadata> {
  return generateConstructionMetadata({ slug: SLUG });
}

export default function Page() {
  return <ConstructionPage slug={SLUG} />;
}
