"use client";

import Link from "next/link";
import { setConsent } from "@/lib/consent";
import { useConsent } from "@/lib/use-consent";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** Privacy policy page linked from the banner text. */
const POLICY_HREF = "/politika-konfidencialnosti/";

export interface CookieBannerProps {
  className?: string | undefined;
}

/**
 * Cookie notice (`.ig-cookie`), text verbatim from `teksty/15-politika-pdn.md`.
 * Rendered only when the visitor has made no choice (`useConsent() === null`): during SSR and
 * hydration the choice is unknown (`undefined`), so the server HTML never contains the banner
 * and returning visitors never see it flash. «Принять» → `all` (Metrika may load),
 * «Только необходимые» → `necessary`. Does not steal focus.
 * Phones: a column above the sticky CTA (`--ig-sticky-h`, set by `StickyCta`).
 */
export function CookieBanner({ className }: CookieBannerProps) {
  const consent = useConsent();
  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Уведомление о cookie"
      className={cn(
        "ig-cookie fixed inset-x-4 bottom-4 z-40 mx-auto max-w-[960px]",
        "animate-in fade-in-0 motion-safe:slide-in-from-bottom-2 duration-(--ig-dur-slow)",
        "max-sm:text-caption max-sm:bottom-[calc(var(--ig-sticky-h,0px)+8px)] max-sm:flex-col max-sm:items-stretch max-sm:gap-3 max-sm:p-4",
        className
      )}
    >
      <p>
        Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали,
        какие разделы полезны. Подробнее — в{" "}
        <Link href={POLICY_HREF}>политике обработки персональных данных</Link>.
      </p>
      <div className="ig-cookie__actions max-sm:[&>.ig-btn]:flex-auto">
        <Button variant="secondary" size="s" onClick={() => setConsent("necessary")}>
          Только необходимые
        </Button>
        <Button variant="primary" size="s" onClick={() => setConsent("all")}>
          Принять
        </Button>
      </div>
    </div>
  );
}
