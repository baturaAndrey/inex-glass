"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { replacePlaceholders, type PlaceholderContext } from "@/lib/domain/placeholders";

/**
 * `PlaceholderContext` as it crosses the server → client boundary: every date is an ISO string.
 * (React can serialize `Date`, but plain strings keep the contract explicit and JSON-safe.)
 */
export interface SerializedPlaceholderContext extends Omit<
  PlaceholderContext,
  "now" | "prices" | "promo"
> {
  now: string;
  prices: Omit<PlaceholderContext["prices"], "priceDate"> & { priceDate: string };
  promo:
    | (Omit<NonNullable<PlaceholderContext["promo"]>, "startDate" | "endDate"> & {
        startDate: string | null;
        endDate: string | null;
      })
    | null;
}

/** Restores `now` as a `Date`; price/promo dates are valid `DateInput` strings as they are. */
function revive(value: PlaceholderContext | SerializedPlaceholderContext): PlaceholderContext {
  const now = value.now instanceof Date ? value.now : new Date(value.now);
  return { ...value, now } as PlaceholderContext;
}

const PlaceholdersContext = createContext<PlaceholderContext | null>(null);

export interface PlaceholdersProviderProps {
  /**
   * Built on the server by `getPlaceholderContext()`; pass it raw (RSC serializes `Date`) or
   * through `serializePlaceholderContext()` from `./rich-text`.
   */
  value: PlaceholderContext | SerializedPlaceholderContext;
  children: ReactNode;
}

/**
 * Makes the placeholder context available to client components (calculators, tabs) that
 * receive CMS strings with `{цена_10мм}`, `{N}`, … and render them after hydration.
 */
export function PlaceholdersProvider({ value, children }: PlaceholdersProviderProps) {
  const ctx = useMemo(() => revive(value), [value]);
  return <PlaceholdersContext.Provider value={ctx}>{children}</PlaceholdersContext.Provider>;
}

/** The nearest placeholder context, or `null` outside a `PlaceholdersProvider`. */
export function usePlaceholders(): PlaceholderContext | null {
  return useContext(PlaceholdersContext);
}

/** `text` with placeholders substituted; unchanged outside a provider. */
export function usePlaceholderText(text: string | null | undefined): string {
  const ctx = usePlaceholders();
  const source = text ?? "";
  return useMemo(() => (ctx ? replacePlaceholders(source, ctx) : source), [ctx, source]);
}
