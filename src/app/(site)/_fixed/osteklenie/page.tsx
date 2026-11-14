import { GlazingMirrorsPage, glazingMirrorsMetadata } from "@/components/page/glazing-mirrors-page";
import { glazingMirrorsHub } from "@/lib/cms/glazing-mirrors-routes";
import type { Metadata } from "next";

/** Hub of the «Остекление» section (task 27): the `constructions` document `osteklenie`. */

const PATH = glazingMirrorsHub("osteklenie").path;

export function generateMetadata(): Promise<Metadata> {
  return glazingMirrorsMetadata(PATH);
}

export default function Page() {
  return <GlazingMirrorsPage path={PATH} />;
}
