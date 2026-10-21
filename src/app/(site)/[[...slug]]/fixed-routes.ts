import type { ReactNode } from "react";
import { type FixedPath, isFixedPath } from "./fixed-paths";
import * as Blog from "../_fixed/blog/page";
import * as ShowerPartitions from "../_fixed/dushevye-peregorodki/page";
import * as Fittings from "../_fixed/furnitura/page";
import * as HowToOrderPayment from "../_fixed/kak-zakazat/oplata/page";
import * as HowToOrder from "../_fixed/kak-zakazat/page";
import * as DrawingRequirements from "../_fixed/kak-zakazat/trebovaniya-k-chertezham/page";
import * as Contacts from "../_fixed/kontakty/page";
import * as Company from "../_fixed/o-kompanii/page";
import * as Team from "../_fixed/o-kompanii/sotrudniki/page";
import * as ProcessingHub from "../_fixed/obrabotka-stekla/page";
import * as GlazingHub from "../_fixed/osteklenie/page";
import * as Home from "../_fixed/page";
import * as Constructions from "../_fixed/steklyannye-konstrukcii/page";
import * as Canopies from "../_fixed/steklyannye-kozyrki/page";
import * as Railings from "../_fixed/steklyannye-ograzhdeniya/page";
import * as Partitions from "../_fixed/steklyannye-peregorodki/page";
import * as ShopWindows from "../_fixed/torgovye-vitriny/page";
import * as Triplex from "../_fixed/tripleks/page";
import * as TemperedHub from "../_fixed/zakalennoe-steklo/page";
import * as MirrorsHub from "../_fixed/zerkala/page";
import type { Metadata } from "next";

/**
 * Registry of the fixed-URL templates served by the `[[...slug]]` dispatcher.
 *
 * WHY THESE ARE NOT ROUTE FOLDERS
 * -------------------------------
 * The image is built without a database. A static route (no dynamic segment) is prerendered at
 * build time; its CMS loaders then await `connection()` (`@/lib/cms/cache`), which in Next 16
 * makes the route dynamic for good (`ƒ`, `Cache-Control: private, no-store`) — its `revalidate`
 * export never takes effect. A dynamic segment with `generateStaticParams() → []` is not
 * prerendered at all and is ISR'd on first request. So every fixed URL is served by the root
 * optional catch-all `(site)/[[...slug]]`: this map picks the template by path, everything else
 * falls through to the generic `pages` resolver.
 *
 * A template module keeps the shape of a page file — `generateMetadata()` + a default component,
 * both without params (the URL is fixed) — but NOT the route segment config (`revalidate`,
 * `dynamic`, …): Next reads that only from the route file, i.e. from `./page.tsx`.
 *
 * Routing precedence is unchanged: static and narrower dynamic routes (`/blog/[slug]/`,
 * `/zakalennoe-steklo/[slug]/`, `/obekty/`, `/poisk/`, `/raschet-stoimosti/`, …) win over the
 * optional catch-all. A fixed path must therefore NOT also exist as a route folder
 * (`(site)/<path>/page.tsx`): it would silently shadow its entry here (`./fixed-paths.test.ts`).
 */
export interface FixedRouteModule {
  generateMetadata: () => Promise<Metadata>;
  default: () => ReactNode | Promise<ReactNode>;
}

const FIXED_ROUTES = {
  "/": Home,
  "/blog/": Blog,
  "/kontakty/": Contacts,
  "/o-kompanii/": Company,
  "/o-kompanii/sotrudniki/": Team,
  "/kak-zakazat/": HowToOrder,
  "/kak-zakazat/oplata/": HowToOrderPayment,
  "/kak-zakazat/trebovaniya-k-chertezham/": DrawingRequirements,
  "/zakalennoe-steklo/": TemperedHub,
  "/obrabotka-stekla/": ProcessingHub,
  "/osteklenie/": GlazingHub,
  "/zerkala/": MirrorsHub,
  "/steklyannye-konstrukcii/": Constructions,
  "/dushevye-peregorodki/": ShowerPartitions,
  "/furnitura/": Fittings,
  "/steklyannye-kozyrki/": Canopies,
  "/steklyannye-ograzhdeniya/": Railings,
  "/steklyannye-peregorodki/": Partitions,
  "/torgovye-vitriny/": ShopWindows,
  "/tripleks/": Triplex,
} satisfies Record<FixedPath, FixedRouteModule>;

/** Template of a fixed URL, or `null` for any other path (→ the generic `pages` resolver). */
export function fixedRouteFor(path: string): FixedRouteModule | null {
  return isFixedPath(path) ? FIXED_ROUTES[path] : null;
}
