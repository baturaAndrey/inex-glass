import { GlazingMirrorsPage, glazingMirrorsMetadata } from "@/components/page/glazing-mirrors-page";
import type { Metadata } from "next";

/**
 * Child pages of the «Остекление» section (task 27). Allowed segments come from
 * `GLAZING_MIRRORS_ROUTES`; any other segment answers the server-rendered 404.
 */

type Params = Promise<{ slug: string }>;

const childPath = (slug: string) => `/osteklenie/${slug}/`;

/** No DB at build time: nothing is prerendered, pages render on first request (ISR). */
export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return glazingMirrorsMetadata(childPath(slug));
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return <GlazingMirrorsPage path={childPath(slug)} />;
}
