import {
  ConstructionPage,
  generateConstructionMetadata,
} from "@/components/templates/construction-template";
import { findGlazingMirrorsRoute } from "@/lib/cms/glazing-mirrors-routes";
import { redirectIfExists } from "@/lib/cms/queries";
import { NOT_FOUND_METADATA, NotFoundResponse } from "./not-found-response";
import type { Metadata } from "next";

/**
 * Shared server part of the 9 typed routes of «Остекление» and «Зеркала» (task 27):
 * `/osteklenie/`, `/osteklenie/[slug]/`, `/zerkala/`, `/zerkala/[slug]/`.
 *
 * A route only resolves the URL against `GLAZING_MIRRORS_ROUTES`; the page is the
 * `ConstructionPage` template (task 26), which loads the document BY PATH — so a document moved
 * under another parent can never be served at these URLs — and answers the server-rendered 404
 * itself when the document is missing or unpublished. A path outside the table gets the same
 * 404 (`redirectIfExists` + `<NotFoundResponse />`, never a bare `notFound()`, which would ship
 * an empty SSR body — see `./not-found-response`).
 */

/** `generateMetadata` of a route path; unknown path or missing document → 404 metadata. */
export async function glazingMirrorsMetadata(path: string): Promise<Metadata> {
  const route = findGlazingMirrorsRoute(path);
  return route ? generateConstructionMetadata({ path: route.path }) : NOT_FOUND_METADATA;
}

/** Page body of a route path: the construction template, or the 404 response. */
export async function GlazingMirrorsPage({ path }: { path: string }) {
  const route = findGlazingMirrorsRoute(path);
  if (!route) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }
  return <ConstructionPage path={route.path} />;
}
