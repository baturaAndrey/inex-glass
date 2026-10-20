import { HeadingFeature, LinkFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import { LINKABLE_COLLECTIONS } from "./fields/link";

/**
 * Default features kept for site content. Everything else is dropped on purpose:
 * - bold / italic / underline (and other inline formats) — typography comes from the design system;
 * - upload — images are placed through blocks, not inside rich text;
 * - heading — re-added below restricted to h2–h4 (h1 is always the page title);
 * - link — re-added below restricted to the same collections as `linkField()` (the default
 *   would allow internal links to every collection, including `users` and CRM data);
 * - tables — only `EXPERIMENTAL_TableFeature` exists in Payload 3.91, so it is not enabled.
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
  ],
});
