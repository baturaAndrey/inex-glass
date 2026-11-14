import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Letters of the per-run token; digits are left out on purpose (see `boardSearchMarker`). */
const MARKER_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/**
 * Per-run marker for fixture leads, put into `company` and used as the board's `?search=`.
 *
 * The token is the current time in base 26, letters only: a search string with three or more
 * digits also matches the phone (`phoneSearchDigits` in `src/payload/admin/leads/kanban/query.ts`).
 * A base-36 token like `e2e-kanban-mwgouv83` searches phones for «283», so leftover leads of
 * other specs whose phones contain those digits show up on the board.
 */
export function boardSearchMarker(prefix: string): string {
  let rest = Date.now();
  let token = "";
  while (rest > 0) {
    token = MARKER_ALPHABET[rest % MARKER_ALPHABET.length] + token;
    rest = Math.floor(rest / MARKER_ALPHABET.length);
  }
  return `${prefix}-${token}`;
}

/**
 * After Space on a kanban card handle: waits until @dnd-kit's keyboard drag takes arrow keys.
 * Two conditions, each of which used to lose the next arrow press on CI:
 * - the columns are measured: the announcement names the card's own column (`homeAnnouncement`,
 *   e.g. `Взята заявка «…», колонка «Новая»`); the bare «Взята заявка …» of the pick-up comes
 *   earlier, while the arrows have no target yet;
 * - the sensor's `keydown` listener is attached: `KeyboardSensor` adds it in a `setTimeout(0)`
 *   queued during the Space event, and Chrome may deliver the next input event before that
 *   timer. A `setTimeout(0)` queued now runs after it (timers of equal delay fire in order).
 *
 * Payload has a DndContext of its own: the announcement is looked for in any live region.
 */
export async function keyboardDragReady(page: Page, homeAnnouncement: string): Promise<void> {
  await expect(page.locator('[id^="DndLiveRegion"]', { hasText: homeAnnouncement })).toHaveCount(1);
  await page.evaluate(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
}
