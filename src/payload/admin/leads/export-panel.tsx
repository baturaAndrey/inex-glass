"use client";

import { useId, useMemo, useState } from "react";
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
    <div className="iga-screens-export">
      <button
        type="button"
        className="iga-btn iga-btn--secondary iga-btn--sm"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Скрыть выгрузку" : "Выгрузка"}
      </button>
      {open ? (
        <div
          id={`${id}-panel`}
          role="region"
          aria-label="Выгрузка заявок"
          className="iga-card iga-screens-export__panel"
        >
          <label className="iga-field iga-screens-export__field">
            Период
            <select
              className="iga-select"
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
              <label className="iga-field iga-screens-export__field">
                С
                <input
                  type="date"
                  className="iga-input"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label className="iga-field iga-screens-export__field">
                По
                <input
                  type="date"
                  className="iga-input"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <label className="iga-field iga-screens-export__field">
            Формат
            <select
              className="iga-select"
              value={format}
              onChange={(event) => setFormat(event.target.value as "csv" | "xlsx")}
            >
              <option value="xlsx">Excel (XLSX)</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label className="iga-field iga-screens-export__field">
            Статус
            <select
              className="iga-select"
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
          <label className="iga-field iga-screens-export__field">
            Источник
            <select
              className="iga-select"
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
          <label className="iga-field iga-screens-export__field">
            Ответственный
            <select
              className="iga-select"
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
          <label className="iga-screens-export__check">
            <input
              type="checkbox"
              checked={duplicates}
              onChange={(event) => setDuplicates(event.target.checked)}
            />
            Только дубли
          </label>
          {customInvalid ? (
            <span className="iga-field__error iga-screens-export__error" role="status">
              Укажите даты «с» и «по»
            </span>
          ) : (
            <a className="iga-btn iga-btn--primary iga-btn--sm" href={href}>
              Скачать
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}
