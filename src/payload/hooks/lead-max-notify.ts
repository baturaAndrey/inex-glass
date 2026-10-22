import type { CollectionAfterChangeHook } from "payload";

/** `leads.afterChange`: queues `max-notify` jobs (task 10). No-op until then. */
export const leadMaxNotify: CollectionAfterChangeHook = ({ doc }) => doc;
