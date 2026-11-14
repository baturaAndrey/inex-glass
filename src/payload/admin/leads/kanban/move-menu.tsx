"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Ellipsis } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * «Перенести в…» of a kanban card: a menu button with every other status (the only way to move a
 * card on phones, an alternative to drag-and-drop elsewhere). WAI-ARIA menu button pattern:
 * arrows, Home/End, Enter/Space, Escape (focus back to the button), Tab (focus to the button,
 * then on along the page), click outside closes.
 *
 * The list is portalled to `<body>` with `position: fixed`: the board scrolls horizontally and
 * an absolutely positioned list would be clipped by that overflow box. It is placed under the
 * button (above it when there is no room below) and follows it on scroll and resize.
 */

export interface MoveTarget {
  id: string;
  name: string;
  color: string;
}

/** Gap between the button and the list. */
const MENU_OFFSET_PX = 4;
/** The list never touches the viewport edges. */
const VIEWPORT_MARGIN_PX = 8;

/** Places the fixed list next to the button: right edges aligned, inside the viewport. */
function placeMenu(button: HTMLElement, list: HTMLElement) {
  const anchor = button.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const { offsetWidth: width, offsetHeight: height } = list;

  const maxLeft = Math.max(VIEWPORT_MARGIN_PX, viewportWidth - width - VIEWPORT_MARGIN_PX);
  const left = Math.min(maxLeft, Math.max(VIEWPORT_MARGIN_PX, anchor.right - width));

  const below = anchor.bottom + MENU_OFFSET_PX;
  const above = anchor.top - MENU_OFFSET_PX - height;
  const fitsBelow = below + height <= viewportHeight - VIEWPORT_MARGIN_PX;
  const top = fitsBelow || above < VIEWPORT_MARGIN_PX ? below : above;

  list.style.left = `${Math.round(left)}px`;
  list.style.top = `${Math.round(top)}px`;
}

export function MoveMenu({
  cardTitle,
  targets,
  disabled,
  onSelect,
}: {
  cardTitle: string;
  targets: MoveTarget[];
  disabled?: boolean;
  onSelect: (statusId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const reposition = useCallback(() => {
    if (buttonRef.current && listRef.current) placeMenu(buttonRef.current, listRef.current);
  }, []);

  // Before paint: the list appears in place, then follows the button (any scrolling ancestor,
  // hence the capture phase).
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  // Focus the first item on open; close on a click outside (the list lives outside the root).
  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const focusItem = (index: number) => {
    const count = targets.length;
    if (count === 0) return;
    itemRefs.current[(index + count) % count]?.focus();
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(targets.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        // The portalled list sits at the end of <body>: hand the focus back to the button
        // first, so the browser's Tab continues from the card, not from the end of the page.
        close(true);
        break;
    }
  };

  const onButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="iga-kmenu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="iga-kmenu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Перенести заявку «${cardTitle}» в другой статус`}
        title="Перенести в…"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        <Ellipsis aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <div
              ref={listRef}
              id={menuId}
              role="menu"
              aria-label="Перенести в…"
              className="iga-kmenu__list"
              onKeyDown={onMenuKeyDown}
            >
              <span className="iga-kmenu__caption" aria-hidden="true">
                Перенести в…
              </span>
              {targets.map((target, index) => (
                <button
                  key={target.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className="iga-kmenu__item"
                  style={{ "--iga-status-color": target.color } as CSSProperties}
                  onClick={() => {
                    close(true);
                    onSelect(target.id);
                  }}
                >
                  <span className="iga-kmenu__dot" aria-hidden="true" />
                  {target.name}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
