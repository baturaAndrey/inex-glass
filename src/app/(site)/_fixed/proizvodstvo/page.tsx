import { fixedPageMetadata } from "@/components/company/fixed-page";
import { PRODUCTION_PATH, ProductionPage } from "@/components/engineering/production-page";
import type { Metadata } from "next";

/** `/proizvodstvo/`: the `pages` document on the Paper template `2560_proizvodstvo`. */
export function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(PRODUCTION_PATH);
}

export default function Page() {
  return <ProductionPage />;
}
