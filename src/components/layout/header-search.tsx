"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { Input } from "@/components/ig/input";
import {
  useSearchSuggestions,
  type SuggestStatus,
} from "@/components/search/use-search-suggestions";
import { pluralRu } from "@/lib/domain/plural";
import { searchPageHref } from "@/lib/search/pagination";
import { SEARCH_KIND_LABELS, SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { SEARCH_PATH } from "./nav-defaults";

export interface HeaderSearchProps {
  /** Visually hidden label, «Поиск по сайту». */
  label: string;
  placeholder: string;
  className?: string | undefined;
  /** Focus the field on mount (mobile overlay). */
  autoFocus?: boolean;
  /** Called when a navigation starts from the field (the mobile overlay closes itself). */
  onNavigate?: (() => void) | undefined;
}

const RESULT_FORMS = ["результат", "результата", "результатов"] as const;

/** Text of the polite live region: how many suggestions are shown. */
function liveMessage(status: SuggestStatus, count: number): string {
  if (status === "error") return "Подсказки недоступны";
  if (status !== "ready") return "";
  return count === 0 ? "Ничего не найдено" : `Найдено ${count} ${pluralRu(count, RESULT_FORMS)}`;
}

/**
 * Site search field of the header (task 14 markup, task 35 suggestions): a plain GET form
 * (`/poisk/?q=…`, works without JS) turned into an ARIA 1.2 combobox. Up to 6 suggestions from
 * `/api/site-search/` (debounce 200 ms) with the title and the kind; ↑/↓ move the active option,
 * Enter opens it — or, with no option chosen, opens `/poisk/?q=…`; Esc closes the list.
 * A blank query is never submitted.
 */
export function HeaderSearch({
  label,
  placeholder,
  className,
  autoFocus = false,
  onNavigate,
}: HeaderSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { hits, status } = useSearchSuggestions(value);

  // While the next answer loads, the previous suggestions stay (no flicker on every key).
  const available = hits.length > 0 && (status === "ready" || status === "loading");
  const visible = open && available;
  const optionId = (index: number) => `${id}-opt-${index}`;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const go = (href: string) => {
    close();
    onNavigate?.();
    router.push(href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!available) return;
        event.preventDefault();
        setOpen(true);
        const step = event.key === "ArrowDown" ? 1 : -1;
        // Cycles through «no option» (-1) between the last and the first suggestion.
        setActive((current) => {
          const next = current + step;
          if (next >= hits.length) return -1;
          if (next < -1) return hits.length - 1;
          return next;
        });
        return;
      }
      case "Enter": {
        const hit = visible && active >= 0 ? hits[active] : undefined;
        if (hit) {
          event.preventDefault();
          go(hit.url);
        }
        return; // no option chosen: the form submits (`onSubmit`)
      }
      case "Escape":
        if (visible) {
          event.preventDefault();
          close();
        }
        return;
      default:
        return;
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    go(searchPageHref(query));
  };

  return (
    <form
      action={SEARCH_PATH}
      method="get"
      role="search"
      onSubmit={onSubmit}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
      }}
      className={cn("relative flex min-w-0", className)}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        strokeWidth={2}
        className="text-text-2 pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
      />
      <Input
        id={id}
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded-full pr-10 pl-11"
      />
      {status === "loading" ? (
        <Loader2
          aria-hidden="true"
          strokeWidth={2}
          className="text-text-2 pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin motion-reduce:animate-none"
        />
      ) : null}

      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!visible}
        className="border-hairline bg-surface shadow-dropdown absolute top-full right-0 left-0 z-50 m-0 mt-2 max-h-[min(420px,70vh)] min-w-[min(360px,calc(100vw-32px))] list-none overflow-y-auto rounded-md border p-1.5"
        data-testid="search-suggestions"
      >
        {hits.map((hit, index) => (
          <li
            key={hit.url}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            // Keeps the focus in the field; the click itself navigates.
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => setActive(index)}
            onClick={() => go(hit.url)}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-sm px-3 py-2.5",
              index === active ? "bg-primary-light" : "hover:bg-well"
            )}
          >
            <span className="text-text text-[15px] leading-snug font-medium">{hit.title}</span>
            <span className="ig-small text-text-2">{SEARCH_KIND_LABELS[hit.kind]}</span>
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status" aria-live="polite">
        {open ? liveMessage(status, hits.length) : ""}
      </span>
    </form>
  );
}

export type MobileSearchProps = Omit<HeaderSearchProps, "autoFocus" | "onNavigate">;

/**
 * Phone (≤599 px) search: an icon button opening a panel at the top of the screen with the same
 * form. Radix Dialog: focus trap, Esc / overlay close, focus returns to the button. The panel
 * closes when a suggestion or the results page is opened.
 */
export function MobileSearch({ label, placeholder, className }: MobileSearchProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className={cn("size-11", className)}>
          <Search aria-hidden="true" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Esc with the suggestions open closes the list only (the field handles it); the
          // panel closes on the next Esc.
          onEscapeKeyDown={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.getAttribute("aria-expanded") === "true") event.preventDefault();
          }}
          className="bg-surface shadow-modal data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 fixed inset-x-0 top-0 z-50 py-3 duration-(--ig-dur-base) outline-none motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <Container className="flex items-center gap-2">
            <HeaderSearch
              label={label}
              placeholder={placeholder}
              className="flex-1"
              autoFocus
              onNavigate={() => setOpen(false)}
            />
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Закрыть поиск" className="size-11">
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </Container>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
