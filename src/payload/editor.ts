import {
  EXPERIMENTAL_TableFeature,
  HeadingFeature,
  LinkFeature,
  lexicalEditor,
} from "@payloadcms/richtext-lexical";
import { LINKABLE_COLLECTIONS } from "./fields/link";

/**
 * Default features kept for site content. Everything else is dropped on purpose:
 * - bold / italic / underline (and other inline formats) — typography comes from the design system;
 * - upload — images are placed through blocks, not inside rich text;
 * - heading — re-added below restricted to h2–h4 (h1 is always the page title);
 * - link — re-added below restricted to the same collections as `linkField()` (the default
 *   would allow internal links to every collection, including `users` and CRM data).
 *
 * Tables are added with `EXPERIMENTAL_TableFeature` (the only table feature of Payload 3.91):
 * the articles of teksty/10, 14 and 17 contain comparison tables inside the text. Rich text is
 * stored as JSON, so the feature adds no database columns; it does register a client feature,
 * so the admin import map must be regenerated (`pnpm generate:importmap`).
 *
 * Placeholders like `{N}` or `{цена_8мм}` are plain text for the editor.
 */
const KEPT_DEFAULT_FEATURES = new Set([
  "paragraph",
  "unorderedList",
  "orderedList",
  "blockquote",
  "horizontalRule",
  "toolbarInline",
]);

export const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((feature) => KEPT_DEFAULT_FEATURES.has(feature.key)),
    HeadingFeature({ enabledHeadingSizes: ["h2", "h3", "h4"] }),
    LinkFeature({ enabledCollections: [...LINKABLE_COLLECTIONS] }),
    EXPERIMENTAL_TableFeature(),
  ],
});
