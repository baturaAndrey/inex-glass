import type { GeneratePreviewURL } from "payload";

/**
 * `pages.admin.preview` (task 11 implements the draft preview route). Returning `null` hides
 * Payload's preview button, so the stub changes nothing in the admin.
 */
export const buildPreviewUrl: GeneratePreviewURL = () => null;
