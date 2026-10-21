"use client";

import { useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@payloadcms/ui";
import { FORM_TYPE_LABELS, LEAD_FORM_TYPE_VALUES, LEADS_EXPORT_API_PATH } from "./constants";

/**
 * «Выгрузка» panel of the leads list: period (dates or presets), format and filters; «Скачать»
 * is a plain link to `GET /api/admin/leads/export/` with the chosen query, so the browser
 * downloads the file with the admin session cookie and the server does all validation.
 */

type Option = { id: string; name: string };

type Preset = "7d" | "30d" | "month" | "quarter" | "custom";

const PRESETS: readonly (readonly [Preset, string])[] = [
  ["7d", "7 дней"],
  ["30d", "30 дней"],
  ["month", "Этот месяц"],
  ["quarter", "Этот квартал"],
  ["custom", "Даты"],
];

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  fontSize: "12px",
  color: "var(--theme-elevation-500)",
};

const controlStyle: CSSProperties = {
  height: "32px",
  padding: "0 8px",
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: "var(--style-radius-s, 4px)",
  background: "var(--theme-input-bg, var(--theme-elevation-0))",
  color: "var(--theme-elevation-800)",
  fontSize: "13px",
};

export function ExportPanel({ statuses, assignees }: { statuses: Option[]; assignees: Option[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [assignee, setAssignee] = useState("");
  const [duplicates, setDuplicates] = useState(false);

  const customInvalid = preset === "custom" && (!from || !to || from > to);

  const href = useMemo(() => {
    const params = new URLSearchParams({ format });
    if (preset === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    } else {
      params.set("period", preset);
    }
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    if (assignee) params.set("assignee", assignee);
    if (duplicates) params.set("duplicates", "1");
    return `${LEADS_EXPORT_API_PATH}?${params.toString()}`;
  }, [assignee, duplicates, format, from, preset, source, status, to]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
      <Button
        buttonStyle="secondary"
        size="small"
        margin={false}
        extraButtonProps={{ "aria-expanded": open, "aria-controls": `${id}-panel` }}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Скрыть выгрузку" : "Выгрузка"}
      </Button>
      {open ? (
        <div
          id={`${id}-panel`}
          role="region"
          aria-label="Выгрузка заявок"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "12px",
            padding: "12px",
            border: "1px solid var(--theme-elevation-150)",
            borderRadius: "var(--style-radius-m, 4px)",
            background: "var(--theme-elevation-50)",
            width: "100%",
          }}
        >
          <label style={fieldStyle}>
            Период
            <select
              style={controlStyle}
              value={preset}
              onChange={(event) => setPreset(event.target.value as Preset)}
            >
              {PRESETS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {preset === "custom" ? (
            <>
              <label style={fieldStyle}>
                С
                <input
                  type="date"
                  style={controlStyle}
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label style={fieldStyle}>
                По
                <input
                  type="date"
                  style={controlStyle}
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <label style={fieldStyle}>
            Формат
            <select
              style={controlStyle}
              value={format}
              onChange={(event) => setFormat(event.target.value as "csv" | "xlsx")}
            >
              <option value="xlsx">Excel (XLSX)</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label style={fieldStyle}>
            Статус
            <select
              style={controlStyle}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Все</option>
              {statuses.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Источник
            <select
              style={controlStyle}
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="">Все</option>
              {LEAD_FORM_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {FORM_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Ответственный
            <select
              style={controlStyle}
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">Все</option>
              <option value="me">Мои</option>
              {assignees.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{ ...fieldStyle, flexDirection: "row", alignItems: "center", height: "32px" }}
          >
            <input
              type="checkbox"
              checked={duplicates}
              onChange={(event) => setDuplicates(event.target.checked)}
            />
            Только дубли
          </label>
          {customInvalid ? (
            <span style={{ ...fieldStyle, color: "var(--theme-error-500)" }} role="status">
              Укажите даты «с» и «по»
            </span>
          ) : (
            <Button el="anchor" url={href} buttonStyle="primary" size="small" margin={false}>
              Скачать
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
