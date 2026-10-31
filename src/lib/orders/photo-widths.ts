/**
 * Widths of order photos served by `/zakaz/<token>/docs/<id>/?w=…` (task 33). Client-safe
 * (no Node imports): used by the photo gallery and by the route's allow-list in `./files`.
 */

/** `?w=` values the route resizes to; any other value serves the original. */
export const THUMBNAIL_WIDTHS: readonly number[] = [320, 480, 960, 1920];
/** Gallery thumbnails. */
export const THUMBNAIL_WIDTH = 480;
/** Full-screen viewer. */
export const LIGHTBOX_WIDTH = 1920;
