import { HeadingFeature, lexicalEditor } from "@payloadcms/richtext-lexical";

/**
 * Default features kept for site content. Everything else is dropped on purpose:
 * - bold / italic / underline (and other inline formats) — typography comes from the design system;
 * - upload — images are placed through blocks, not inside rich text;
 * - heading — re-added below restricted to h2–h4 (h1 is always the page title);
 * - tables — only `EXPERIMENTAL_TableFeature` exists in Payload 3.91, so it is not enabled.
 *
 * Placeholders like `{N}` or `{цена_8мм}` are plain text for the editor.
 */
const KEPT_DEFAULT_FEATURES = new Set([
  "paragraph",
  "link",
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
  ],
});
