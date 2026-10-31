import {
  ProcessingHubPage,
  generateProcessingHubMetadata,
} from "@/components/templates/processing-template";
import type { Metadata } from "next";

/**
 * Hub «Обработка стекла» `/obrabotka-stekla/` (task 25): the `pages` document of the hub plus
 * the operations table from `processing-services`. ISR (via the `[[...slug]]` dispatcher); CMS edits expire it through
 * the revalidation hooks, the hourly revalidate keeps date-dependent placeholders fresh.
 */

export function generateMetadata(): Promise<Metadata> {
  return generateProcessingHubMetadata();
}

export default function ProcessingHubRoute() {
  return <ProcessingHubPage />;
}
