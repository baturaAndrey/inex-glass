import type { CSSProperties, ReactNode } from "react";
import { formatNumber } from "@/lib/domain/format";
import { createdAtWhere, presetRange } from "@/lib/leads-admin/period";
import { LEAD_FLAGS } from "@/payload/collections/crm/constants";
import {
  FORM_TYPE_LABELS,
  LEAD_FORM_TYPE_VALUES,
  LEADS_LIST_PATH,
  statusBadgeColors,
} from "./constants";
import { loadLeadStatuses, loadStaffNames } from "./data";
import { ExportPanel } from "./export-panel";
import type { Payload, ServerProps, TypedUser, Where } from "payload";

/**
 * `beforeListTable` of `leads`: quick filters (chips) and the export panel (ТЗ §6.1 «Список»).
 *
 * Every chip is a plain link to the list with ONE `where` condition in Payload's query format
 * (`?where[status][equals]=<id>`), so it composes with the built-in filter builder, survives a
 * reload and can be bookmarked. The active chip is detected from the current `where[...]` keys.
 * Counters respect the viewer's access (`overrideAccess: false`).
 */

type Chip = {
  key: string;
  label: string;
  params: Record<string, string>;
  count?: number | undefined;
  color?: string | undefined;
};

type Props = ServerProps & { user?: TypedUser };

const FLAG_VALUES = LEAD_FLAGS.map((flag) => flag.value);

const QUICK_PERIODS = [
  ["today", "Сегодня"],
  ["7d", "7 дней"],
  ["30d", "30 дней"],
  ["month", "Месяц"],
] as const;

function chipHref(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return query ? `${LEADS_LIST_PATH}?${query}` : LEADS_LIST_PATH;
}

/** Current `where[...]` params of the page, flat (`where[status][equals]` → id). */
function currentWhereParams(searchParams: ServerProps["searchParams"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (key.startsWith("where[") && typeof value === "string") result[key] = value;
  }
  return result;
}

function isActive(chip: Chip, current: Record<string, string>): boolean {
  const chipKeys = Object.keys(chip.params);
  const currentKeys = Object.keys(current);
  if (chipKeys.length !== currentKeys.length) return false;
  return chipKeys.every((key) => current[key] === chip.params[key]);
}

/** A chip counter; `undefined` (no number shown) when the query fails — never breaks the list. */
async function countLeads(
  payload: Payload,
  user: TypedUser | undefined,
  where: Where
): Promise<number | undefined> {
  try {
    const { totalDocs } = await payload.count({
      collection: "leads",
      where,
      overrideAccess: false,
      user,
    });
    return totalDocs;
  } catch {
    return undefined;
  }
}

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
};

const groupLabelStyle: CSSProperties = {
  color: "var(--theme-elevation-500)",
  fontSize: "12px",
  minWidth: "88px",
};

function ChipLink({ chip, active }: { chip: Chip; active: boolean }) {
  const colors = chip.color ? statusBadgeColors(chip.color) : null;
  return (
    <a
      href={chipHref(chip.params)}
      aria-current={active ? "true" : undefined}
      data-quick-filter={chip.key}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 10px",
        borderRadius: "999px",
        border: `1px solid ${active ? "var(--theme-elevation-800)" : "var(--theme-elevation-150)"}`,
        background: active ? "var(--theme-elevation-800)" : "var(--theme-elevation-0)",
        color: active ? "var(--theme-elevation-0)" : "var(--theme-elevation-800)",
        fontSize: "13px",
        lineHeight: "18px",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {colors ? (
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: "50%", background: colors.color }}
        />
      ) : null}
      {chip.label}
      {chip.count !== undefined ? (
        <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
          {formatNumber(chip.count)}
        </span>
      ) : null}
    </a>
  );
}

function ChipGroup({
  label,
  chips,
  current,
  children,
}: {
  label: string;
  chips: Chip[];
  current: Record<string, string>;
  children?: ReactNode;
}) {
  return (
    <div style={rowStyle} role="group" aria-label={label}>
      <span style={groupLabelStyle}>{label}</span>
      {chips.map((chip) => (
        <ChipLink key={chip.key} chip={chip} active={isActive(chip, current)} />
      ))}
      {children}
    </div>
  );
}

export async function LeadListQuickFilters({ payload, user, searchParams }: Props) {
  const current = currentWhereParams(searchParams);
  const statuses = await loadLeadStatuses(payload);
  const userId = user ? String(user.id) : null;

  // Sequential on purpose: the list view runs its own queries at the same time, and the chips
  // must not compete with it for the connection pool.
  const statusCounts: (number | undefined)[] = [];
  for (const status of statuses) {
    statusCounts.push(await countLeads(payload, user, { status: { equals: status.id } }));
  }
  const duplicateCount = await countLeads(payload, user, { isDuplicate: { equals: true } });
  const staffNames = await loadStaffNames(payload).catch(() => new Map<string, string>());

  const statusChips: Chip[] = [
    { key: "all", label: "Все", params: {} },
    ...statuses.map((status, index) => ({
      key: `status-${status.slug}`,
      label: status.name,
      params: { "where[status][equals]": status.id },
      count: statusCounts[index],
      color: status.color ?? undefined,
    })),
  ];

  const flagParams = Object.fromEntries(
    FLAG_VALUES.map((flag, index) => [`where[flags][in][${index}]`, flag])
  );
  const workChips: Chip[] = [
    ...(userId
      ? [{ key: "mine", label: "Мои", params: { "where[assignee][equals]": userId } }]
      : []),
    {
      key: "unassigned",
      label: "Без ответственного",
      params: { "where[assignee][exists]": "false" },
    },
    {
      key: "duplicates",
      label: "Дубли",
      params: { "where[isDuplicate][equals]": "true" },
      count: duplicateCount,
    },
    { key: "flagged", label: "С флагами", params: flagParams },
  ];

  const periodChips: Chip[] = QUICK_PERIODS.map(([preset, label]) => {
    const where = createdAtWhere(presetRange(preset));
    return {
      key: `period-${preset}`,
      label,
      params: { "where[createdAt][greater_than_equal]": where.createdAt.greater_than_equal },
    };
  });

  const sourceChips: Chip[] = LEAD_FORM_TYPE_VALUES.map((formType) => ({
    key: `source-${formType}`,
    label: FORM_TYPE_LABELS[formType],
    params: { "where[formType][equals]": formType },
  }));

  return (
    <section
      aria-label="Быстрые фильтры заявок"
      style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}
    >
      <ChipGroup label="Статус" chips={statusChips} current={current} />
      <ChipGroup label="Работа" chips={workChips} current={current} />
      <ChipGroup label="Период" chips={periodChips} current={current} />
      <ChipGroup label="Источник" chips={sourceChips} current={current} />
      <ExportPanel
        statuses={statuses.map(({ id, name }) => ({ id, name }))}
        assignees={[...staffNames].map(([id, name]) => ({ id, name }))}
      />
    </section>
  );
}
