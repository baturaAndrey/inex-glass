/**
 * Slots of a document layout (`constructions.layout`): the template of task-26 renders most
 * blocks in the regular flow, but some belong inside a template section. The slot is chosen by
 * the prefix of the block's `anchorId` (an existing section field — no schema change):
 *
 * - `slot-profile-…` → `profile`: inside the «Профильные системы» column (before the plates);
 * - `slot-systems-…` → `systems`: inside the systems section, under the cards / table;
 * - `slot-objects-…` → `objects`: inside the «Объекты» column (before the object cards);
 * - `slot-b-…`       → `after`: after the inex.su strip, before the FAQ;
 * - anything else (including a missing `anchorId`) → `main`: the default flow.
 *
 * Pure: no React / Payload imports, the order of blocks inside a slot is preserved.
 */

export const LAYOUT_SLOT_PREFIXES = {
  profile: "slot-profile-",
  systems: "slot-systems-",
  objects: "slot-objects-",
  after: "slot-b-",
} as const;

export type LayoutSlot = keyof typeof LAYOUT_SLOT_PREFIXES | "main";

export interface LayoutSlots<T> {
  main: T[];
  profile: T[];
  systems: T[];
  objects: T[];
  after: T[];
}

const SLOT_ENTRIES = Object.entries(LAYOUT_SLOT_PREFIXES) as Array<
  [Exclude<LayoutSlot, "main">, string]
>;

/** Slot of one block by its `anchorId` (case-insensitive prefix match, surrounding spaces ignored). */
export function layoutSlotOf(block: { anchorId?: string | null | undefined }): LayoutSlot {
  const anchor = typeof block.anchorId === "string" ? block.anchorId.trim().toLowerCase() : "";
  if (anchor === "") return "main";
  const match = SLOT_ENTRIES.find(([, prefix]) => anchor.startsWith(prefix));
  return match ? match[0] : "main";
}

/** Distributes layout blocks over the template slots, keeping the document order in each. */
export function splitLayoutBySlot<T extends object>(
  layout: readonly T[] | null | undefined
): LayoutSlots<T> {
  const slots: LayoutSlots<T> = { main: [], profile: [], systems: [], objects: [], after: [] };
  for (const block of layout ?? []) {
    const anchorId = "anchorId" in block ? (block as { anchorId?: unknown }).anchorId : undefined;
    slots[layoutSlotOf({ anchorId: typeof anchorId === "string" ? anchorId : null })].push(block);
  }
  return slots;
}
