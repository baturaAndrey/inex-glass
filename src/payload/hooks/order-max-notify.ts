import type { CollectionAfterChangeHook } from "payload";

/** `orders.afterChange`: queues `max-notify` jobs for order events (task 10). No-op until then. */
export const orderMaxNotify: CollectionAfterChangeHook = ({ doc }) => doc;
