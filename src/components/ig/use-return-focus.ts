"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Explicit «return focus to the trigger» for Radix Dialog based overlays (Drawer, Lightbox).
 *
 * Radix restores focus to the element that was focused when its FocusScope mounted. Under
 * React Strict Mode (dev) the scope effect runs twice: the second run sees focus already inside
 * the dialog, remembers that element and, on close, falls back to `<body>`. Capturing the
 * trigger in `onOpenAutoFocus` (dispatched only on the first run) fixes it in every mode.
 *
 * The same double run also fires a spurious «close» autofocus while the dialog is still open;
 * it is ignored (`open` is tracked) so focus stays inside the dialog.
 *
 * Spread the result onto `DialogPrimitive.Content`.
 */
export function useReturnFocus(open: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const onOpenAutoFocus = useCallback(() => {
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    if (openRef.current) {
      event.preventDefault();
      return;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) {
      event.preventDefault();
      trigger.focus({ preventScroll: true });
    }
  }, []);

  return { onOpenAutoFocus, onCloseAutoFocus };
}
