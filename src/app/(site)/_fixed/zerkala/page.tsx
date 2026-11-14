import { GlazingMirrorsPage, glazingMirrorsMetadata } from "@/components/page/glazing-mirrors-page";
import { glazingMirrorsHub } from "@/lib/cms/glazing-mirrors-routes";
import type { Metadata } from "next";

/** Hub of the «Зеркала» section (task 27): the `constructions` document `zerkala`. */

const PATH = glazingMirrorsHub("zerkala").path;

export function generateMetadata(): Promise<Metadata> {
  return glazingMirrorsMetadata(PATH);
}

export default function Page() {
  return <GlazingMirrorsPage path={PATH} />;
}
