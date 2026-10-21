/**
 * Corrected redirect map inex.su → Inex Glass and the list of disputed URLs (task 37).
 *
 *   pnpm tsx --env-file=.env scripts/import-inex/fix-csv.ts [--check] [--check-db]
 *
 * Reads `docs/inex/12-migration-inex-su.csv`, applies the rules R0–R7 of
 * `src/lib/migration/rules.ts` and writes:
 *   - `docs/inex/12-migration-inex-su.fixed.csv` — same columns + `rule`, source row order,
 *     `;`, UTF-8 with BOM, LF;
 *   - `docs/reports/migration-disputed.md` — totals, changes by rule, disputed URLs, allowed
 *     many→one targets, notes for the inex.su administrator.
 *
 * Inputs from the import (optional, used when present):
 *   - the Firecrawl cache (`scripts/.cache/firecrawl/`): parse status for R7 and `sameObject`
 *     for slug collisions (R5);
 *   - `scripts/.import-tmp/slugs.json` (`{ oldUrl: slug }`, written by `import.ts`): the slugs
 *     really stored in Payload win over the computed ones.
 *
 * `--check` validates the result (exit code 1 on problems): URL shape, registry of
 * `docs/inex/17-meta.md`, object slugs known to the import (`slugs.json`) or — with
 * `--check-db` — present in the `objects` collection, 301/stay consistency, expected totals.
 */
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import {
  DOOR_OBJECT_SLUGS,
  OBJECTS_LISTING,
  classify,
  fixRows,
  hasNonAscii,
  hasUpperCase,
  isShowerConfigUrl,
  lastSegment,
  objectSlugFromUrl,
  parseUrlRegistry,
  summarize,
  validateRows,
  type FixSummary,
  type FixedRow,
  type ImportStatus,
  type Row,
  type RuleId,
} from "@/lib/migration/rules";

import { parseAllObjects, sameObject, type ParseResult } from "./parse-objects";
import {
  DISPUTED_REPORT,
  FIXED_CSV,
  META_MD,
  SLUGS_JSON,
  mdRow,
  readJson,
  readSourceCsv,
  writeCsv,
  writeFileAtomic,
} from "./shared";

/** Expected totals of the task spec (checked by `--check`). */
const EXPECTED = { total: 446, redirect: 231, stay: 215, objects: 168 } as const;

const RULE_TITLES: Record<RuleId, string> = {
  R0: "stay — без изменений",
  R1: "лестницы → stay",
  R2: "отделка интерьера → stay",
  R3: "категории портфолио → /obekty/",
  R4: "старая пагинация → /obekty/",
  R5: "объекты → /obekty/<slug>/",
  R6: "/produkciya/*, /materialy/steklo — без изменений",
  R7: "объект не импортирован → /obekty/",
};

/**
 * Objects that keep the 301 by default but look like products staying on inex.su (columns,
 * fire barriers, Grand Forge railings, doors). Listed for Inex to confirm.
 */
const SUSPICIOUS_OBJECT = [
  {
    pattern: /kolonn/,
    question: "Колонны остаются на inex.su — это стеклянная конструкция или колонна?",
  },
  { pattern: /pozharn/, question: "Пожарные преграды остаются на inex.su — переносить объект?" },
  {
    pattern: /grand-?e?-forge/,
    question: "Ограждения Grand Forge остаются на inex.su (решение 30.09) — переносить объект?",
  },
  {
    pattern: /^dushevaya-pryamaya-01$/,
    question: "Душевая в разделе цельностеклянных перегородок — оставить в портфолио?",
  },
] as const;

interface ImportContext {
  parsed: Map<string, ParseResult>;
  slugs: Record<string, string>;
}

async function loadImportContext(): Promise<ImportContext> {
  const [parsed, slugs] = await Promise.all([
    parseAllObjects(),
    readJson<Record<string, string>>(SLUGS_JSON, {}),
  ]);
  return { parsed, slugs };
}

function applyRules(source: readonly Row[], ctx: ImportContext): FixedRow[] {
  return fixRows(source, {
    importStatus: (oldUrl): ImportStatus => {
      const result = ctx.parsed.get(oldUrl);
      if (!result) return "unknown";
      return result.ok ? "imported" : "failed";
    },
    sameObject: (a, b) => {
      const left = ctx.parsed.get(a);
      const right = ctx.parsed.get(b);
      return !!left?.ok && !!right?.ok && sameObject(left.value, right.value);
    },
    importedSlug: (oldUrl) => ctx.slugs[oldUrl],
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Check                                                                                      */
/* ------------------------------------------------------------------------------------------ */

async function knownObjectSlugsFromDb(): Promise<Set<string>> {
  // Imported lazily: booting Payload is only needed for `--check-db`.
  const { getSeedContext } = await import("@/seed/context");
  const ctx = await getSeedContext();
  const { docs } = await ctx.payload.find({
    collection: "objects",
    pagination: false,
    depth: 0,
    draft: true,
    overrideAccess: true,
    select: { slug: true },
  });
  return new Set(docs.map((doc) => doc.slug));
}

async function check(
  fixed: readonly FixedRow[],
  summary: FixSummary,
  ctx: ImportContext,
  useDb: boolean
): Promise<string[]> {
  const problems = validateRows(fixed);

  const registry = parseUrlRegistry(await readFile(META_MD, "utf8"));
  for (const row of fixed) {
    if (row.action !== "301" || row.new_url.startsWith(OBJECTS_LISTING)) continue;
    if (!registry.has(row.new_url)) {
      problems.push(`${row.old_url}: цели ${row.new_url} нет в реестре 17-meta.md`);
    }
  }

  const knownSlugs = useDb ? await knownObjectSlugsFromDb() : new Set(Object.values(ctx.slugs));
  const source = useDb ? "в БД (objects.slug)" : "в slugs.json";
  if (knownSlugs.size === 0) {
    problems.push(`нет известных slug объектов (${source}) — сначала запустите import.ts`);
  } else {
    for (const row of fixed) {
      const slug = objectSlugFromUrl(row.new_url);
      if (slug && !knownSlugs.has(slug))
        problems.push(`${row.old_url}: объекта ${slug} нет ${source}`);
    }
  }

  if (summary.total !== EXPECTED.total)
    problems.push(`строк ${summary.total}, ожидалось ${EXPECTED.total}`);
  // R7 rows stay 301 (to the listing), so the 301/stay totals do not depend on the import.
  if (summary.redirect !== EXPECTED.redirect) {
    problems.push(`301: ${summary.redirect}, ожидалось ${EXPECTED.redirect}`);
  }
  if (summary.stay !== EXPECTED.stay)
    problems.push(`stay: ${summary.stay}, ожидалось ${EXPECTED.stay}`);
  if (summary.byRule.R5 + summary.byRule.R7 !== EXPECTED.objects) {
    problems.push(
      `объектов ${summary.byRule.R5 + summary.byRule.R7}, ожидалось ${EXPECTED.objects}`
    );
  }
  return problems;
}

/* ------------------------------------------------------------------------------------------ */
/* Report                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function manyToOne(fixed: readonly FixedRow[]): Array<[string, FixedRow[]]> {
  const groups = new Map<string, FixedRow[]>();
  for (const row of fixed) {
    if (row.action !== "301") continue;
    groups.set(row.new_url, [...(groups.get(row.new_url) ?? []), row]);
  }
  return [...groups.entries()].filter(([, rows]) => rows.length > 1);
}

function buildReport(
  source: readonly Row[],
  fixed: readonly FixedRow[],
  summary: FixSummary,
  ctx: ImportContext
): string {
  const lines: string[] = [];
  const push = (...items: string[]) => lines.push(...items);
  const parsedCount = [...ctx.parsed.values()].filter((result) => result.ok).length;

  push(
    "# Карта редиректов inex.su → Inex Glass: исправления и спорные URL",
    "",
    `Сформировано скриптом \`scripts/import-inex/fix-csv.ts\` (${new Date().toISOString().slice(0, 10)}).`,
    "Исходник — `docs/inex/12-migration-inex-su.csv`, результат — `docs/inex/12-migration-inex-su.fixed.csv`",
    "(колонки `old_url;new_url;action;note;rule`, порядок строк как в исходнике, UTF-8 с BOM).",
    "Правила — `src/lib/migration/rules.ts` (R0–R7), тесты — `src/lib/migration/rules.test.ts`.",
    "",
    "## Итоги (числа)",
    "",
    "| Показатель | Исходный CSV | Исправленный CSV |",
    "|---|---:|---:|",
    mdRow(["Всего строк", source.length, summary.total]),
    mdRow(["301", source.filter((row) => row.action === "301").length, summary.redirect]),
    mdRow(["stay", source.filter((row) => row.action === "stay").length, summary.stay]),
    mdRow(["Объекты портфолио → `/obekty/<slug>/` (R5)", "—", summary.byRule.R5]),
    mdRow(["Уникальных страниц объектов (после слияния дублей)", "—", summary.objectTargets]),
    mdRow(["Объекты, не импортированные с inex.su (R7)", "—", summary.byRule.R7]),
    mdRow([
      "Страниц объектов разобрано из кэша Firecrawl",
      "—",
      `${parsedCount} из ${ctx.parsed.size}`,
    ]),
    mdRow(["Спорных строк (флаг disputed)", "—", summary.disputed]),
    "",
    `Ожидание задачи: 301 = ${EXPECTED.redirect}, stay = ${EXPECTED.stay} (168 объектов + 20 категорий + 3 пагинации + 39 \`/produkciya/*\` + \`/materialy/steklo\`). ` +
      (summary.redirect === EXPECTED.redirect && summary.stay === EXPECTED.stay
        ? "Совпадает."
        : "**Расхождение — см. ниже.**"),
    "",
    "## Изменения относительно исходного CSV по правилам",
    "",
    "| Правило | Что делает | Строк | Из них изменено |",
    "|---|---|---:|---:|",
    ...(Object.keys(RULE_TITLES) as RuleId[]).map((rule) =>
      mdRow([rule, RULE_TITLES[rule], summary.byRule[rule], summary.changedByRule[rule]])
    ),
    ""
  );

  const changedExamples = (rule: RuleId, limit = 5) =>
    fixed
      .map((row, index) => ({ row, before: source[index] }))
      .filter(
        ({ row, before }) =>
          row.rule === rule &&
          before &&
          (before.new_url !== row.new_url || before.action !== row.action)
      )
      .slice(0, limit)
      .map(
        ({ row, before }) =>
          `- \`${row.old_url}\`: \`${before?.new_url || "—"}\` (${before?.action}) → \`${row.new_url || "—"}\` (${row.action})`
      );
  for (const rule of ["R1", "R2", "R3", "R4", "R5", "R7"] as const) {
    const examples = changedExamples(rule);
    if (examples.length === 0) continue;
    push(`**${rule}** — примеры:`, "", ...examples, "");
  }

  // Slugs changed by case / homoglyphs (R5).
  const caseFixes = fixed.filter(
    (row, index) => row.rule === "R5" && source[index]?.new_url !== row.new_url
  );
  if (caseFixes.length > 0) {
    push(
      "Все изменения `new_url` у объектов (R5): регистр, кириллица, коллизии, slug из импорта:",
      "",
      "| old_url | было | стало |",
      "|---|---|---|",
      ...caseFixes.map((row) =>
        mdRow([
          `\`${row.old_url}\``,
          `\`${source[fixed.indexOf(row)]?.new_url}\``,
          `\`${row.new_url}\``,
        ])
      ),
      ""
    );
  }

  /* Disputed ------------------------------------------------------------------------------ */
  push("## Спорные URL — нужно решение Inex", "");

  const interior = fixed.filter((row) => row.rule === "R2" && row.disputed);
  push(
    "### 1. Отделка интерьера (8 объектов)",
    "",
    "По умолчанию **остаются на inex.su** (`stay`): ТЗ §9 и `12-migration-inex-su.md` — «отделка остаётся». Часть объектов по названию может быть стеклянной.",
    "",
    "| URL | Решение по умолчанию | Вопрос |",
    "|---|---|---|",
    ...interior.map((row) =>
      mdRow([
        `\`${row.old_url}\``,
        "stay",
        `Это стеклянная конструкция (${lastSegment(row.old_url)})? Если да — перенести на /obekty/ (нужен импорт страницы).`,
      ])
    ),
    ""
  );

  const doors = fixed.filter(
    (row) => row.rule === "R5" && DOOR_OBJECT_SLUGS.has(lastSegment(row.old_url))
  );
  push(
    "### 2. Двери внутри цельностеклянных перегородок (3)",
    "",
    "Двери остаются на inex.su, но эти объекты лежат в разделе перегородок. По умолчанию **301 на /obekty/** (маятниковые цельностеклянные двери в перегородках — стеклянная конструкция).",
    "",
    "| URL | Решение по умолчанию | Вопрос |",
    "|---|---|---|",
    ...doors.map((row) =>
      mdRow([
        `\`${row.old_url}\``,
        `301 → \`${row.new_url}\``,
        "Переносить на Inex Glass или оставить на inex.su (двери)?",
      ])
    ),
    ""
  );

  const stairRailings = fixed.filter((row) =>
    row.old_url.startsWith("/portfolio/ograzhdeniya/lestnichnye")
  );
  push(
    `### 3. Лестничные ограждения (${stairRailings.length} URL: категория + объекты) — подтвердить группой`,
    "",
    "Стеклянные перила на лестницах — товар Inex Glass, по умолчанию **301** (категория → `/obekty/`, объекты → `/obekty/<slug>/`). Сами лестницы остаются на inex.su (R1). Вопрос к Inex: подтвердить перенос всей группы.",
    ""
  );

  const suspicious = fixed.flatMap((row) => {
    if (row.rule !== "R5") return [];
    const slug = lastSegment(row.old_url).toLowerCase();
    const hit = SUSPICIOUS_OBJECT.find(({ pattern }) => pattern.test(slug));
    return hit ? [{ row, question: hit.question }] : [];
  });
  if (suspicious.length > 0) {
    push(
      "### 4. Объекты, похожие на продукцию, которая остаётся на inex.su",
      "",
      "| URL | Решение по умолчанию | Вопрос |",
      "|---|---|---|",
      ...suspicious.map(({ row, question }) =>
        mdRow([`\`${row.old_url}\``, `301 → \`${row.new_url}\``, question])
      ),
      ""
    );
  }

  const collisions = fixed.filter(
    (row) => row.rule === "R5" && /коллизия slug|тот же объект/.test(row.note)
  );
  push(
    "### 5. Коллизии slug объектов (R5)",
    "",
    "Два старых URL с одинаковым последним сегментом. Если название и ≥ 50 % фото совпадают — один объект (оба URL в `legacyUrls`), иначе второму добавлен суффикс категории.",
    "",
    "| URL | Решение | Вопрос |",
    "|---|---|---|",
    ...(collisions.length > 0
      ? collisions.map((row) =>
          mdRow([
            `\`${row.old_url}\``,
            `301 → \`${row.new_url}\` (${row.note.split("; ").find((n) => /коллизия|тот же/.test(n)) ?? ""})`,
            /тот же объект/.test(row.note)
              ? "Объединены в один объект — подтвердите, что это действительно один объект."
              : "Это один и тот же объект или разные? Если разные — устраивает ли имя с суффиксом категории?",
          ])
        )
      : [mdRow(["—", "коллизий нет", ""])]),
    ...(collisions.length > 0
      ? ["", `Коллизий: ${collisions.length} (первый URL пары сохраняет slug без суффикса).`]
      : []),
    ""
  );

  const notImported = fixed.filter((row) => row.rule === "R7");
  push(
    `### 6. Объекты, которые не удалось импортировать (R7): ${notImported.length}`,
    "",
    ...(notImported.length > 0
      ? [
          "| URL | Решение по умолчанию | Причина |",
          "|---|---|---|",
          ...notImported.map((row) => {
            const result = ctx.parsed.get(row.old_url);
            return mdRow([
              `\`${row.old_url}\``,
              "301 → `/obekty/`",
              result && !result.ok ? result.reason : "?",
            ]);
          }),
        ]
      : ["Нет: все страницы объектов получены и разобраны."]),
    ""
  );

  push(
    "### 7. Зеркала с подсветкой — расхождение с сайтом",
    "",
    "| URL | Решение по умолчанию | Вопрос |",
    "|---|---|---|",
    mdRow([
      "`/produkciya/zerkala/zerkala-s-podsvetkoi`",
      "stay (решение 30.09: «зеркала с подсветкой остаются на inex.su»)",
      "Страница `/zerkala/dlya-salonov/` нового сайта (task 27, тексты teksty дословно) предлагает «зеркала с LED-подсветкой». Либо убрать LED из текста Inex Glass, либо перенести раздел с inex.su (тогда 301 → `/zerkala/dlya-salonov/`). Решение — за Inex.",
    ]),
    ""
  );

  /* Many → one --------------------------------------------------------------------------- */
  const groups = manyToOne(fixed);
  push(
    "## Допустимые дубли целей (many→one)",
    "",
    "Несколько старых URL ведут на одну новую страницу — допустимо для разделов, категорий и листинга. Для объектов — только если это один и тот же объект (см. коллизии).",
    "",
    "| new_url | Старых URL | Примеры |",
    "|---|---:|---|",
    ...groups
      .sort((a, b) => b[1].length - a[1].length)
      .map(([target, rows]) =>
        mdRow([
          `\`${target}\``,
          rows.length,
          rows
            .slice(0, 3)
            .map((row) => `\`${row.old_url}\``)
            .join(", ") + (rows.length > 3 ? ", …" : ""),
        ])
      ),
    ""
  );

  /* Technical notes ----------------------------------------------------------------------- */
  const upper = source.filter((row) => hasUpperCase(row.old_url));
  const nonAscii = source.filter((row) => hasNonAscii(row.old_url));
  const showers = fixed.filter((row) => isShowerConfigUrl(row.old_url));
  push(
    "## Технические замечания для администратора inex.su",
    "",
    "1. **301 включать только после публикации** соответствующих страниц Inex Glass и их индексации (ТЗ §9, порядок переезда). Объекты импортированы **черновиками**: пока объект не опубликован, его `/obekty/<slug>/` отдаёт 404 — редирект на него включать нельзя. Строки с `rule=R5` включать постранично, по мере публикации.",
    "2. **Регистр.** `old_url` в CSV записаны в точности как на inex.su. Строки с заглавными буквами в старом адресе: " +
      upper.map((row) => `\`${row.old_url}\` (${row.action})`).join(", ") +
      ". Сравнение путей на inex.su должно быть регистрозависимым ровно для этих адресов (или правило писать для обоих вариантов). `new_url` всегда в нижнем регистре.",
    "3. **Кириллическая «о» в адресе.** " +
      nonAscii
        .map(
          (row) =>
            `\`${row.old_url}\` (${row.action}) — в запросе приходит как \`${encodeURI(row.old_url)}\``
        )
        .join("; ") +
      ". Правило редиректа нужно для percent-encoded варианта (он же указан в колонке `note`).",
    "4. **Слеш на конце.** inex.su отдаёт страницы и со слешем, и без; правило должно ловить оба варианта (`^/path/?$`). Цели Inex Glass — всегда со слешем (`trailingSlash: true`), без цепочек.",
    `5. **Каталог душевых** (конфигураций: ${showers.length}, \`/produkciya/dushevye/*\`) ведёт на один раздел \`/dushevye-peregorodki/\`: карточки конфигураций на новом сайте — внутри раздела, отдельных страниц нет.`,
    "6. Домен цели — `https://inexglass.ru` (production). Колонка `rule` служебная — для аудита, в конфигурацию сервера не переносится.",
    ""
  );
  return `${lines.join("\n")}\n`;
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                        */
/* ------------------------------------------------------------------------------------------ */

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      check: { type: "boolean", default: false },
      "check-db": { type: "boolean", default: false },
    },
  });

  const source = await readSourceCsv();
  const ctx = await loadImportContext();
  const fixed = applyRules(source, ctx);
  const summary = summarize(source, fixed);

  await writeCsv(
    FIXED_CSV,
    ["old_url", "new_url", "action", "note", "rule"],
    fixed.map((row) => [row.old_url, row.new_url, row.action, row.note, row.rule])
  );
  await writeFileAtomic(DISPUTED_REPORT, buildReport(source, fixed, summary, ctx));

  const categories = fixed.reduce<Record<string, number>>((acc, row) => {
    const kind = classify(row);
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
  process.stdout.write(
    `строк ${summary.total}: 301 = ${summary.redirect}, stay = ${summary.stay}; ` +
      `по правилам ${JSON.stringify(summary.byRule)}; спорных ${summary.disputed}; ` +
      `объектов ${summary.objectRows} → ${summary.objectTargets} страниц\n` +
      `классы: ${JSON.stringify(categories)}\n` +
      `записано: ${FIXED_CSV}\n         ${DISPUTED_REPORT}\n`
  );

  if (values.check || values["check-db"]) {
    const problems = await check(fixed, summary, ctx, values["check-db"]);
    if (problems.length > 0) {
      process.stderr.write(`--check: ${problems.length} проблем(ы):\n  ${problems.join("\n  ")}\n`);
      process.exit(1);
    }
    process.stdout.write("--check: ok\n");
  }
  process.exit(0);
}

try {
  await main();
} catch (error) {
  console.error("fix-csv: ошибка —", error instanceof Error ? error.message : error);
  process.exit(1);
}
