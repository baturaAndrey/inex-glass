"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** `single` (default): opening one item closes the others; `multiple`: independent items. */
  type?: "single" | "multiple";
  /** Ids of items open on first render (SSR included). `single` keeps only the first one. */
  defaultOpen?: string[];
  /** Level of the heading that wraps every trigger button (WAI-ARIA accordion pattern). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string | undefined;
}

function initialOpen(type: AccordionProps["type"], defaultOpen: string[] | undefined): string[] {
  if (!defaultOpen) return [];
  return type === "multiple" ? defaultOpen : defaultOpen.slice(0, 1);
}

/** Index of the trigger to focus for a navigation key, `null` for other keys. */
function targetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * Accordion / FAQ (`.ig-acc`). Buttons carry `aria-expanded` / `aria-controls`, panels are
 * `role="region"` labelled by their button. Closed panels stay in the DOM (content is indexable)
 * but are `inert`. Height animates via `grid-template-rows: 0fr → 1fr` (200 ms), no jumps.
 * Keyboard: Enter / Space toggle (native button), ↑ / ↓ move between headers, Home / End.
 */
export function Accordion({
  items,
  type = "single",
  defaultOpen,
  headingLevel = 3,
  className,
}: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>(() => initialOpen(type, defaultOpen));
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const Heading = `h${headingLevel}` as const;

  const toggle = useCallback(
    (id: string) => {
      setOpen((current) => {
        if (current.includes(id)) return current.filter((openId) => openId !== id);
        return type === "multiple" ? [...current, id] : [id];
      });
    },
    [type]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = targetIndex(event.key, index, items.length);
    if (next === null) return;
    event.preventDefault();
    buttonsRef.current[next]?.focus();
  };

  return (
    <div className={cn("ig-acc", className)}>
      {items.map((item, index) => {
        const isOpen = open.includes(item.id);
        const buttonId = `${baseId}-trigger-${index}`;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={item.id} className={cn("ig-acc__item", isOpen && "is-open")}>
            <Heading className="m-0 font-[inherit]">
              <button
                ref={(element) => {
                  buttonsRef.current[index] = element;
                }}
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="ig-acc__btn"
                onClick={() => toggle(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span>{item.title}</span>
                <span aria-hidden="true" className="ig-acc__sign motion-reduce:transition-none">
                  <Plus strokeWidth={2} />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "ease-ig grid transition-[grid-template-rows] duration-(--ig-dur-base) motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="ig-acc__panel max-sm:pr-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
