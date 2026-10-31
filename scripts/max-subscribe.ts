/**
 * MAX webhook subscription of the bot (task 06).
 *
 *   pnpm payload run scripts/max-subscribe.ts                    # subscribe <SITE_URL>/api/max/webhook/
 *   pnpm payload run scripts/max-subscribe.ts -- --list          # show the bot's subscriptions
 *   pnpm payload run scripts/max-subscribe.ts -- --unsubscribe   # remove OUR subscription
 *   pnpm payload run scripts/max-subscribe.ts -- --force         # also replace a stale URL of OUR site
 *
 * The bot is shared with another live site. Subscriptions are classified by URL, compared
 * normalized (scheme and host lower case, default port dropped, trailing slashes ignored):
 * - «ours» — exactly our webhook URL: re-subscribing refreshes its secret and update types;
 * - «stale» — same origin as our `SITE_URL`, another path (an old path, or ours without the
 *   trailing slash, which MAX would POST into a 308 redirect): removed only with `--force`;
 * - «foreign» — any other origin (or an unparsable URL): NEVER removed or overwritten, not even
 *   with `--force`. The script prints it and exits with code 1.
 *
 * Why a foreign subscription blocks: `res/max-api/schema.yaml` models subscriptions as a list
 * (`GET /subscriptions` returns an array, `DELETE` takes a `url`), but does not say whether a
 * second `POST /subscriptions` adds a webhook or replaces the existing one, nor whether every
 * update would be delivered to every URL. Subscribing next to the other site could therefore
 * silently cut its webhook off; that has to be resolved with its owner (a separate bot, or one
 * webhook that serves both sites), not by this script.
 *
 * Needs `MAX_BOT_TOKEN`, `MAX_WEBHOOK_SECRET` and an `https:` `SITE_URL` (MAX delivers only to
 * HTTPS on port 443). Neither the token nor the secret is printed.
 *
 * Top-level `await` on purpose: `payload run` exits as soon as the module body returns.
 */
import { getEnv } from "@/lib/env";
import { MaxApiError, maxListSubscriptions, maxSubscribe, maxUnsubscribe } from "@/lib/max/client";
import { MAX_UPDATE_TYPES, MAX_WEBHOOK_PATH } from "@/lib/max/config";

const args = new Set(process.argv.slice(2));
const mode = args.has("--list") ? "list" : args.has("--unsubscribe") ? "unsubscribe" : "subscribe";
const force = args.has("--force");

function fail(message: string): never {
  console.error(`MAX: ${message}`);
  process.exit(1);
}

const describeError = (error: unknown): string =>
  error instanceof MaxApiError
    ? `${error.message} (HTTP ${error.status}${error.code ? `, ${error.code}` : ""})`
    : error instanceof Error
      ? error.name
      : "unknown error";

/**
 * `URL` lower-cases scheme and host and drops the default port. `normalized` also ignores
 * trailing slashes (same endpoint); `exact` keeps them (what MAX will actually POST to).
 */
function parseUrl(raw: string): { origin: string; normalized: string; exact: string } | null {
  try {
    const url = new URL(raw);
    const path = url.pathname.replace(/\/+$/, "");
    return {
      origin: url.origin,
      normalized: `${url.origin}${path}${url.search}`,
      exact: `${url.origin}${url.pathname}${url.search}`,
    };
  } catch {
    return null;
  }
}

type Kind = "ours" | "stale" | "foreign";

const KIND_LABEL: Record<Kind, string> = {
  ours: "этот сайт",
  stale: "этот сайт, другой URL",
  foreign: "ДРУГОЙ САЙТ",
};

const { MAX_BOT_TOKEN, MAX_WEBHOOK_SECRET, SITE_URL } = getEnv();
if (!MAX_BOT_TOKEN) fail("не задан MAX_BOT_TOKEN.");

const webhookUrl = new URL(MAX_WEBHOOK_PATH, SITE_URL);
const target = parseUrl(webhookUrl.href) ?? fail(`некорректный SITE_URL: ${SITE_URL}`);

function classify(raw: string): Kind {
  const parsed = parseUrl(raw);
  if (!parsed || parsed.origin !== target.origin) return "foreign";
  if (parsed.exact === target.exact) return "ours";
  // Same origin, another path — including ours without the trailing slash (`normalized` equal):
  // MAX would POST into a 308 redirect and not follow it.
  return "stale";
}

const subscriptions = (
  await maxListSubscriptions().catch((error: unknown) =>
    fail(`не удалось получить подписки: ${describeError(error)}`)
  )
).map((item) => ({ ...item, kind: classify(item.url) }));
const ofKind = (kind: Kind) => subscriptions.filter((item) => item.kind === kind);

function printSubscriptions(): void {
  if (subscriptions.length === 0) {
    console.log("MAX: подписок нет.");
    return;
  }
  for (const item of subscriptions) {
    const types = item.updateTypes.join(", ") || "все типы";
    const slashHint =
      item.kind === "stale" && parseUrl(item.url)?.normalized === target.normalized
        ? " — без завершающего слеша, MAX получит 308"
        : "";
    console.log(`  [${KIND_LABEL[item.kind]}${slashHint}] ${item.url}  (${types})`);
  }
}

if (mode === "list") {
  printSubscriptions();
  process.exit(0);
}

if (mode === "unsubscribe") {
  const ours = ofKind("ours");
  if (ours.length === 0) {
    console.log(`MAX: подписки ${webhookUrl.href} нет, удалять нечего.`);
    printSubscriptions();
    process.exit(0);
  }
  for (const item of ours) {
    await maxUnsubscribe(item.url).catch((error: unknown) =>
      fail(`не удалось отписаться: ${describeError(error)}`)
    );
  }
  console.log(`MAX: подписка ${webhookUrl.href} удалена.`);
  process.exit(0);
}

// subscribe
if (!MAX_WEBHOOK_SECRET) fail("не задан MAX_WEBHOOK_SECRET.");
if (webhookUrl.protocol !== "https:") fail(`MAX принимает только HTTPS на 443: ${webhookUrl.href}`);

if (ofKind("foreign").length > 0) {
  console.error("MAX: у бота есть подписка другого сайта:");
  printSubscriptions();
  fail(
    [
      "подписка не изменена, чужую подписку скрипт не удаляет и не перезаписывает (даже с --force).",
      "     Схема Bot API не гарантирует, что у бота может быть несколько webhook одновременно:",
      "     новая подписка может отключить webhook другого сайта. Решите с его владельцем",
      "     (отдельный бот или общий webhook) и повторите.",
    ].join("\n")
  );
}

const stale = ofKind("stale");
if (stale.length > 0 && !force) {
  console.error("MAX: у бота есть подписка этого сайта с другим URL:");
  printSubscriptions();
  fail(`подписка не изменена. Заменить на ${webhookUrl.href} — с флагом --force.`);
}

for (const item of stale) {
  await maxUnsubscribe(item.url).catch((error: unknown) =>
    fail(`не удалось удалить подписку ${item.url}: ${describeError(error)}`)
  );
  console.log(`MAX: удалена устаревшая подписка ${item.url} (--force).`);
}

await maxSubscribe({
  url: webhookUrl.href,
  secret: MAX_WEBHOOK_SECRET,
  updateTypes: MAX_UPDATE_TYPES,
}).catch((error: unknown) => fail(`подписка не создана: ${describeError(error)}`));

console.log(`MAX: webhook подписан: ${webhookUrl.href}`);
console.log(`     события: ${MAX_UPDATE_TYPES.join(", ")}`);
process.exit(0);
