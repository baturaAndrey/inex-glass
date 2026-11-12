import { fixedPageMetadata } from "@/components/company/fixed-page";
import { DESIGN_PATH, DesignPage } from "@/components/engineering/design-page";
import type { Metadata } from "next";

/** `/proektirovanie/`: the `pages` document on the Paper template `2560_proektirovanie`. */
export function generateMetadata(): Promise<Metadata> {
  return fixedPageMetadata(DESIGN_PATH);
}

export default function Page() {
  return <DesignPage />;
}
