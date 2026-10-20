"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Check, TriangleAlert, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* -------------------------------------------------------------------------------------------------
 * Pure helpers (exported for consumers and tests)
 * -----------------------------------------------------------------------------------------------*/

const KB = 1024;
const MB = KB * KB;

/** Display order of formats in messages (teksty/05-kviz.md); unknown ones follow in `accept` order. */
const FORMAT_ORDER = ["dwg", "dxf", "pdf", "jpg", "png"] as const;
/** Extensions shown under another name (`jpeg` is listed as JPG). */
const FORMAT_ALIASES: Readonly<Record<string, string>> = { jpeg: "jpg" };

export type FileRejectReason = "format" | "size";
export type FileMeta = { name: string; size: number };

/** `4,2 МБ`, `50 МБ`, `850 КБ`, `12 Б` (binary units, comma as the decimal separator). */
export function formatFileSize(bytes: number): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe < KB) return `${Math.round(safe)} Б`;

  const kilobytes = Math.round(safe / KB);
  if (kilobytes < KB) return `${kilobytes} КБ`;

  const megabytes = Math.round((safe / MB) * 10) / 10;
  return `${String(megabytes).replace(".", ",")} МБ`;
}

/** Lower-case extension without the dot (`'Plan.DWG'` → `'dwg'`), `''` when there is none. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
}

/** `['a']` → `a`; `['a','b','c']` → `a, b или c`. */
function joinWithOr(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} или ${items[items.length - 1]}`;
}

/** Upper-case format names for messages, de-duplicated and in the canonical order. */
export function acceptedFormatLabels(accept: readonly string[]): string[] {
  const normalized = [
    ...new Set(accept.map((ext) => {
      const clean = ext.replace(/^\./, "").toLowerCase();
      return FORMAT_ALIASES[clean] ?? clean;
    })),
  ];
  const known = FORMAT_ORDER.filter((ext) => normalized.includes(ext));
  const others = normalized.filter((ext) => !(FORMAT_ORDER as readonly string[]).includes(ext));
  return [...known, ...others].map((ext) => ext.toUpperCase());
}

/** «Подойдут DWG, DXF, PDF, JPG или PNG». */
export function formatErrorText(accept: readonly string[]): string {
  return `Подойдут ${joinWithOr(acceptedFormatLabels(accept))}`;
}

/** «Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии». */
export function sizeErrorText(maxBytes: number): string {
  return `Файл больше ${formatFileSize(maxBytes)}. Сожмите его или пришлите ссылку в комментарии`;
}

/** «DWG, DXF, PDF, JPG или PNG · до 50 МБ». */
export function defaultUploadHint(accept: readonly string[], maxBytes: number): string {
  return `${joinWithOr(acceptedFormatLabels(accept))} · до ${formatFileSize(maxBytes)}`;
}

/** Local check: the extension (case-insensitive) must be in `accept`, the size ≤ `maxBytes`. */
export function validateFile(
  file: FileMeta,
  accept: readonly string[],
  maxBytes: number
): FileRejectReason | null {
  const allowed = new Set(accept.map((ext) => ext.replace(/^\./, "").toLowerCase()));
  if (!allowed.has(fileExtension(file.name))) return "format";
  if (file.size > maxBytes) return "size";
  return null;
}

/* -------------------------------------------------------------------------------------------------
 * FileUploadView — stateless markup of every state (used by FileUpload and the ui-kit demo)
 * -----------------------------------------------------------------------------------------------*/

export type FileUploadStatus =
  | { kind: "empty" }
  | { kind: "drag" }
  | { kind: "uploading"; name: string; size: number; progress?: number | undefined }
  | { kind: "done"; name: string; size: number }
  | { kind: "error"; message: string };

const DEFAULT_TITLE_LEAD = "Перетащите чертёж или";
const BROWSE_LABEL = "выберите файл";
const RETRY_LABEL = "Выбрать другой файл";
const DROP_TITLE = "Отпустите файл";
const DROP_ZONE_LABEL = "Загрузка файла";

export type FileUploadViewProps = {
  status: FileUploadStatus;
  /** Custom title; the "выберите файл" link is then shown on its own line. */
  title?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean | undefined;
  /** Opens the file dialog (and resets local errors in `FileUpload`). */
  onBrowse?: (() => void) | undefined;
  onClear?: (() => void) | undefined;
  /** Drag & drop handlers attached to the drop zone. */
  dropZoneHandlers?:
    | {
        onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
        onDragOver: (event: DragEvent<HTMLDivElement>) => void;
        onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
        onDrop: (event: DragEvent<HTMLDivElement>) => void;
      }
    | undefined;
  browseRef?: Ref<HTMLButtonElement> | undefined;
  className?: string | undefined;
  /** Rendered inside the root (the hidden `<input type="file">`). */
  children?: ReactNode;
};

function statusAnnouncement(status: FileUploadStatus): string {
  switch (status.kind) {
    case "uploading":
      return `Загрузка файла ${status.name}`;
    case "done":
      return `Файл ${status.name} загружен`;
    case "error":
      return status.message;
    default:
      return "";
  }
}

function FilePlaque({
  name,
  size,
  uploading,
  progress,
  disabled,
  onClear,
}: {
  name: string;
  size: number;
  uploading: boolean;
  progress?: number | undefined;
  disabled?: boolean | undefined;
  onClear?: (() => void) | undefined;
}) {
  const ext = fileExtension(name).slice(0, 4).toUpperCase() || "FILE";
  const percent =
    progress === undefined ? undefined : Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <div className="ig-file">
      <span className="ig-file__ext" aria-hidden="true">
        {ext}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="ig-file__name" title={name}>
          {name}
        </span>
        {uploading ? (
          <>
            <div
              role="progressbar"
              aria-label={`Загрузка файла ${name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1.5 w-full overflow-hidden rounded-full bg-well"
            >
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-[width] duration-200",
                  percent === undefined && "w-full animate-pulse opacity-40"
                )}
                style={percent === undefined ? undefined : { width: `${percent}%` }}
              />
            </div>
            <span className="ig-file__meta text-text-2">
              Загрузка…{percent === undefined ? null : ` ${percent}%`}
            </span>
          </>
        ) : (
          <span className="ig-file__meta">
            <Check aria-hidden="true" />
            {formatFileSize(size)} · загружено
          </span>
        )}
      </div>
      {!uploading && onClear ? (
        <Button
          variant="ghost"
          size="s"
          onClick={onClear}
          disabled={disabled}
          aria-label={`Удалить файл ${name}`}
          className="max-sm:min-h-11"
        >
          удалить
        </Button>
      ) : null}
    </div>
  );
}

/** Stateless rendering of one FileUpload state (empty, drag, uploading, done, error). */
export function FileUploadView({
  status,
  title,
  hint,
  disabled,
  onBrowse,
  onClear,
  dropZoneHandlers,
  browseRef,
  className,
  children,
}: FileUploadViewProps) {
  const isError = status.kind === "error";
  const isDrag = status.kind === "drag";

  // Mouse/touch convenience: a click anywhere on the zone opens the dialog. Keyboard users
  // get the same action through the focusable link-button inside.
  function handleZoneClick(event: MouseEvent<HTMLDivElement>) {
    if (disabled || !onBrowse) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    onBrowse();
  }

  let body: ReactNode;
  if (status.kind === "uploading" || status.kind === "done") {
    body = (
      <FilePlaque
        name={status.name}
        size={status.size}
        uploading={status.kind === "uploading"}
        progress={status.kind === "uploading" ? status.progress : undefined}
        disabled={disabled}
        onClear={onClear}
      />
    );
  } else {
    const browseButton = (label: string) => (
      <button
        ref={browseRef}
        type="button"
        className="ig-link disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onBrowse}
        disabled={disabled}
      >
        {label}
      </button>
    );

    body = (
      <div
        role="group"
        aria-label={DROP_ZONE_LABEL}
        aria-disabled={disabled || undefined}
        className={cn(
          "ig-upload",
          isDrag && "is-drag",
          isError && "is-error",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
        onClick={handleZoneClick}
        {...dropZoneHandlers}
      >
        <span className="ig-upload__icon" aria-hidden="true">
          {isError ? <TriangleAlert /> : <Upload />}
        </span>
        {status.kind === "drag" ? (
          <span className="ig-upload__title text-primary-dark">{DROP_TITLE}</span>
        ) : status.kind === "error" ? (
          <>
            <span className="ig-upload__title text-danger-text">{status.message}</span>
            {browseButton(RETRY_LABEL)}
          </>
        ) : title !== undefined ? (
          <>
            <span className="ig-upload__title">{title}</span>
            {browseButton(BROWSE_LABEL)}
            {hint ? <span>{hint}</span> : null}
          </>
        ) : (
          <>
            <span className="ig-upload__title">
              {DEFAULT_TITLE_LEAD} {browseButton(BROWSE_LABEL)}
            </span>
            {hint ? <span>{hint}</span> : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div data-slot="ig-file-upload" className={className}>
      {body}
      {/* One persistent polite live region announces uploading / done / error changes. */}
      <div className="sr-only" aria-live="polite">
        {statusAnnouncement(status)}
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * FileUpload
 * -----------------------------------------------------------------------------------------------*/

export interface FileUploadProps {
  /** Extensions without the dot, lower case: `['dwg','dxf','pdf','jpg','jpeg','png']`. */
  accept: readonly string[];
  /** Maximum size in bytes (`52428800` = 50 МБ). */
  maxBytes: number;
  /** The file was uploaded successfully. */
  value: FileMeta | null;
  /** Upload in progress; `progress` is 0..1 (omit for an indeterminate bar). */
  uploading?: { name: string; size: number; progress?: number | undefined } | null | undefined;
  /** Called only for a file that passed the local checks; the consumer uploads it. */
  onSelect: (file: File) => void;
  onClear: () => void;
  onReject?: ((reason: FileRejectReason, file: File) => void) | undefined;
  /** External error, e.g. the server rejected the upload. */
  error?: string | null | undefined;
  /** Default: «Перетащите чертёж или выберите файл». */
  title?: ReactNode;
  /** Default: built from `accept` / `maxBytes` («DWG, DXF, PDF, JPG или PNG · до 50 МБ»). */
  hint?: ReactNode;
  disabled?: boolean | undefined;
  id?: string | undefined;
  name?: string | undefined;
  className?: string | undefined;
}

/**
 * Single-file upload (`.ig-upload` / `.ig-file`): click or drag & drop, local format/size
 * validation, progress and "uploaded" plaques. It never uploads by itself.
 */
export function FileUpload({
  accept,
  maxBytes,
  value,
  uploading,
  onSelect,
  onClear,
  onReject,
  error,
  title,
  hint,
  disabled = false,
  id,
  name,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const browseRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<FileRejectReason | null>(null);

  // After "удалить" the plaque (and the focused button) disappears: move focus to the
  // "выберите файл" button of the empty zone so keyboard users are not dropped to <body>.
  useEffect(() => {
    if (restoreFocusRef.current && browseRef.current) {
      restoreFocusRef.current = false;
      browseRef.current.focus();
    }
  });

  const localErrorText =
    localError === "format"
      ? formatErrorText(accept)
      : localError === "size"
        ? sizeErrorText(maxBytes)
        : null;
  const errorText = localErrorText ?? (error || null);

  let status: FileUploadStatus;
  if (uploading) status = { kind: "uploading", ...uploading };
  else if (value) status = { kind: "done", name: value.name, size: value.size };
  else if (isDragging && !disabled) status = { kind: "drag" };
  else if (errorText) status = { kind: "error", message: errorText };
  else status = { kind: "empty" };

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reason = validateFile(file, accept, maxBytes);
    setLocalError(reason);
    if (reason) onReject?.(reason, file);
    else onSelect(file);
  }

  function openDialog() {
    if (disabled) return;
    setLocalError(null);
    inputRef.current?.click();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    // Allow choosing the same file again after an error or removal.
    event.target.value = "";
  }

  function handleClear() {
    restoreFocusRef.current = true;
    setLocalError(null);
    onClear();
  }

  const dropZoneHandlers = {
    onDragEnter(event: DragEvent<HTMLDivElement>) {
      if (disabled) return;
      event.preventDefault();
      setIsDragging(true);
    },
    onDragOver(event: DragEvent<HTMLDivElement>) {
      if (disabled) return;
      // preventDefault marks the zone as a valid drop target.
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(event: DragEvent<HTMLDivElement>) {
      // Ignore leave events fired when the pointer moves onto a child element.
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      setIsDragging(false);
    },
    onDrop(event: DragEvent<HTMLDivElement>) {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFile(event.dataTransfer.files[0]);
    },
  };

  return (
    <FileUploadView
      status={status}
      title={title}
      hint={hint ?? defaultUploadHint(accept, maxBytes)}
      disabled={disabled}
      onBrowse={openDialog}
      onClear={handleClear}
      dropZoneHandlers={dropZoneHandlers}
      browseRef={browseRef}
      className={className}
    >
      <input
        ref={inputRef}
        type="file"
        id={id}
        name={name}
        accept={accept.map((ext) => `.${ext.replace(/^\./, "")}`).join(",")}
        onChange={handleInputChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </FileUploadView>
  );
}
