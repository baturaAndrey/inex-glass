import { docUrl } from "@/lib/seo/doc-url";

/** Internal link target as Lexical stores it: `{ relationTo, value }`, value populated or an id. */
export interface InternalDocRef {
  relationTo: string;
  value: unknown;
}

/**
 * Href of an internal Lexical link (`linkType: 'internal'`). A thin wrapper over `docUrl`, the
 * single «document → path» resolver. `null` when the target is not populated (rich text read
 * with too small a `depth`) or is not public — the caller then renders the text without a link.
 */
export function docToHref(doc: InternalDocRef | null | undefined): string | null {
  if (!doc || typeof doc.relationTo !== "string") return null;
  return docUrl(doc.relationTo, doc.value);
}
