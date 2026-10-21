import {
  ProcessingServicePage,
  generateProcessingMetadata,
} from "@/components/templates/processing-template";
import type { Metadata } from "next";

/**
 * Processing service pages `/obrabotka-stekla/<slug>/` (task 25): `kromka`,
 * `otverstiya-i-vyrezy`, `facet`, `matirovanie`, `plenki`, `pechat`. A slug without a published
 * document answers the server-rendered 404 (or a CMS redirect).
 */

type Params = Promise<{ slug: string }>;

/** No DB at build time: nothing is prerendered, pages render on first request (ISR). */
export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return generateProcessingMetadata(slug);
}

export default async function ProcessingServiceRoute({ params }: { params: Params }) {
  const { slug } = await params;
  return <ProcessingServicePage slug={slug} />;
}
