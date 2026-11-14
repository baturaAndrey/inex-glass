"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useConfig } from "@payloadcms/ui";
import { Eye, EyeOff } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * «Показать пароль» toggle for the password fields of the admin auth screens (login, reset
 * password, create first user — Payload's `.template-minimal` views).
 *
 * Payload 3.91 renders these fields itself (`LoginForm` → `PasswordField`) and offers no slot
 * inside the input (`AfterInput` is not passed by the auth views), so the toggle is mounted next
 * to the native `<input>` through a portal: a host `<span>` is appended to the input's wrapper
 * `<div>` (whose React children — `BeforeInput`, input, `AfterInput` — never change on these
 * screens, so React never touches the extra node) and the button is a normal React component
 * rendered into it. The input keeps its `name` / `autocomplete`; only its `type` is switched, and
 * it is reset to `password` on submit so password managers see a password field when saving.
 *
 * Registered as an admin provider (`admin.components.providers`): providers wrap every admin view,
 * including the minimal auth screens that render no nav. The `MutationObserver` runs only on
 * those screens and is idempotent (an input is enhanced once, tracked by `data-iga-pw-toggle`);
 * it re-scans at most once per animation frame, so re-rendered or newly mounted fields
 * (e.g. login after logout) get the toggle too.
 */

const SCOPE_SELECTOR = ".template-minimal";
// `.field-type.password` and `.field-type.confirm-password`; enhanced inputs are skipped by attribute.
const INPUT_SELECTOR = `${SCOPE_SELECTOR} .field-type__wrap input[type="password"]`;
const ENHANCED_ATTR = "data-iga-pw-toggle";
const FIELD_CLASS = "iga-pw-field";
const HOST_CLASS = "iga-pw-toggle-host";

const LABEL_SHOW = "Показать пароль";
const LABEL_HIDE = "Скрыть пароль";

interface ToggleTarget {
  /** Portal key: unique per enhancement, so a re-enhanced field gets a fresh button. */
  key: number;
  input: HTMLInputElement;
  host: HTMLSpanElement;
}

let nextKey = 0;

/** `/a//b/c/` → `/a/b/c` (trailingSlash: true adds the slash Payload's routes do not have). */
function normalizePath(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

/** Mounts a host next to each not yet enhanced password input in scope. */
function enhanceNewInputs(): ToggleTarget[] {
  const added: ToggleTarget[] = [];
  document.querySelectorAll<HTMLInputElement>(INPUT_SELECTOR).forEach((input) => {
    const wrapper = input.parentElement;
    if (!wrapper || input.hasAttribute(ENHANCED_ATTR)) return;
    const host = document.createElement("span");
    host.className = HOST_CLASS;
    wrapper.classList.add(FIELD_CLASS);
    wrapper.appendChild(host);
    input.setAttribute(ENHANCED_ATTR, "");
    added.push({ key: ++nextKey, input, host });
  });
  return added;
}

/** Undoes `enhanceNewInputs` for one target (route change, provider unmount). */
function restore({ input, host }: ToggleTarget): void {
  host.remove();
  input.removeAttribute(ENHANCED_ATTR);
  input.parentElement?.classList.remove(FIELD_CLASS);
  input.type = "password";
}

function PasswordToggleButton({ input }: { input: HTMLInputElement }): ReactNode {
  const [visible, setVisible] = useState(false);

  const apply = useCallback(
    (next: boolean) => {
      input.setAttribute("type", next ? "text" : "password");
      setVisible(next);
    },
    [input],
  );

  useEffect(() => {
    const form = input.form;
    // Capture phase: runs before Payload's own submit handler serialises the form.
    const hideOnSubmit = (): void => apply(false);
    form?.addEventListener("submit", hideOnSubmit, true);
    return () => {
      form?.removeEventListener("submit", hideOnSubmit, true);
      input.setAttribute("type", "password");
    };
  }, [apply, input]);

  const label = visible ? LABEL_HIDE : LABEL_SHOW;
  const Icon = visible ? EyeOff : Eye;

  return (
    <button
      aria-controls={input.id || undefined}
      aria-label={label}
      aria-pressed={visible}
      className="iga-pw-toggle"
      onClick={() => apply(!visible)}
      // A mouse click keeps the caret in the input; keyboard users still focus the button by Tab.
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" focusable="false" size={18} strokeWidth={2} />
    </button>
  );
}

export function PasswordToggleProvider({ children }: { children?: ReactNode }): ReactNode {
  const { config } = useConfig();
  const pathname = usePathname();
  const [targets, setTargets] = useState<ToggleTarget[]>([]);

  const adminRoute = config.routes.admin;
  const { createFirstUser, login, reset } = config.admin.routes;
  const current = normalizePath(pathname ?? "");
  const isAuthScreen = [login, reset, createFirstUser].some((route) => {
    const base = normalizePath(`${adminRoute}${route}`);
    return current === base || current.startsWith(`${base}/`);
  });

  useEffect(() => {
    if (!isAuthScreen) return;

    let live: ToggleTarget[] = [];
    const sync = (): void => {
      const kept = live.filter(({ input, host }) => input.isConnected && host.isConnected);
      // A field re-rendered by Payload without our host: un-mark it so the scan re-enhances it.
      live
        .filter((target) => !kept.includes(target))
        .forEach(({ input, host }) => {
          host.remove();
          input.removeAttribute(ENHANCED_ATTR);
        });
      const added = enhanceNewInputs();
      if (added.length === 0 && kept.length === live.length) return;
      live = [...kept, ...added];
      setTargets(live);
    };

    sync();
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    });
    // Attributes are not observed: our own `type` / data-attribute writes never re-trigger it.
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      live.forEach(restore);
      setTargets([]);
    };
  }, [isAuthScreen, pathname]);

  return (
    <>
      {children}
      {targets.map((target) =>
        createPortal(<PasswordToggleButton input={target.input} />, target.host, target.key),
      )}
    </>
  );
}
