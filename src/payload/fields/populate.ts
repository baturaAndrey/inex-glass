/**
 * Population limits for relationship fields (`maxDepth`), so a request with a large `depth`
 * never drags in whole related documents with their own relations.
 *
 * Payload counts depth from the document being read: `maxDepth: 1` populates the related
 * document itself but none of its relations; `maxDepth: 2` also populates the related
 * document's own uploads/relations (e.g. its card image). Which fields of the related document
 * come back is narrowed separately by the target collection's `defaultPopulate`.
 */

/** Small lookup documents (product, city, object type, thickness group, parent page). */
export const LOOKUP_MAX_DEPTH = 1;

/** Documents rendered as a card or a link: the document plus its card image / author photo. */
export const CARD_MAX_DEPTH = 2;
