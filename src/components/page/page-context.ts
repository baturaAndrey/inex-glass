import type { BlockPageContext } from "@/components/blocks/types";
import type { PlaceholderContext } from "@/lib/domain";
import { resolveH1 } from "@/lib/seo/metadata";
import type { Page } from "@/payload-types";

/**
 * Document data handed to `RenderBlocks` (`page` prop) by a route rendering a `pages` document:
 * - `path` — quiz `src` / form source;
 * - `title` — the resolved H1 (`seo.h1` → title), rendered by a hero without `titleOverride`;
 * - `faq` — the document's «Частые вопросы» for FAQ blocks in `doc` mode (+ FAQPage JSON-LD);
 * - `quizPrefill` — pre-fill of every quiz button on the page.
 * `pages` have no own systems list; `systems` stays unset (systems blocks use `inline` there).
 */
export function pageBlockContext(
  page: Pick<Page, "path" | "title" | "seo" | "faq" | "quizPrefill">,
  fallbackPath: string,
  placeholders: PlaceholderContext
): BlockPageContext {
  return {
    path: page.path || fallbackPath,
    title: resolveH1(page.seo, page.title, placeholders),
    faq: page.faq,
    quizPrefill: page.quizPrefill,
  };
}
