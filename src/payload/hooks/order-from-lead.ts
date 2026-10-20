import type { CollectionAfterChangeHook } from "payload";

/**
 * `leads.afterChange`: creates an order when a lead moves to a status with `isContract`
 * (ТЗ §6.2). No-op placeholder — task 33 implements it by changing only this file; the hook is
 * already wired into `leads.hooks.afterChange`.
 */
export const orderFromLead: CollectionAfterChangeHook = ({ doc }) => doc;
