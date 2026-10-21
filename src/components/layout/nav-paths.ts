/**
 * Route constants and the router-link rule used by the client parts of the header.
 *
 * Split out of `./nav-defaults` (task 39): client components imported the paths from there and
 * thereby shipped the whole default navigation table (~2 KB gzip) in the JS of every page.
 * `./nav-defaults` re-exports everything below, so server code keeps importing from it.
 */

export const QUIZ_PATH = "/raschet-stoimosti/";
export const MY_CALC_URL = "/raschet-stoimosti/?resume=1";
export const SEARCH_PATH = "/poisk/";
export const ORDER_PATH_PREFIX = "/zakaz/";

/**
 * Hrefs that must bypass the Next router (same rule as `ig/text-link`): protocol links
 * (`https:`, `tel:`, `mailto:`), protocol-relative `//`, the Payload admin (separate root
 * layout — never `next/link`) and `/api/*` route handlers.
 */
const NON_ROUTER_HREF = /^(?:[a-z][a-z\d+.-]*:|\/\/|\/(?:admin|api)(?:[/?#]|$))/i;

export function isRouterHref(href: string): boolean {
  return !NON_ROUTER_HREF.test(href);
}
