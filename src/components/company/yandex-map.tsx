"use client";

import { useId, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Chip } from "@/components/ig/chip";
import { cn } from "@/lib/utils";
import { yandexWidgetUrl, type MapPoint } from "./map-widget";

/*
 * Microcopy of the map that is not in teksty (task 29 Notes: «на согласование»).
 */
const SHOW_MAP_LABEL = "Показать карту";
const PROVIDER_NOTE = "Карта загрузится с сервиса Яндекс.Карты";
const OPEN_LABEL = "Открыть в Яндекс.Картах";
const POINTS_LABEL = "Точки на карте";

export interface YandexMapProps {
  /** Addresses of the `contacts` global, numbered like the address cards. */
  points: MapPoint[];
  className?: string | undefined;
}

/** Static «map» plate: the well colour with a 48 px grid of line-colour rules (no requests). */
const PLATE =
  "bg-well bg-[linear-gradient(0deg,var(--ig-line)_1px,transparent_1px),linear-gradient(90deg,var(--ig-line)_1px,transparent_1px)] bg-[size:48px_48px]";

/**
 * Click-to-load Yandex map (152-FZ: no third-party request before the visitor asks for it),
 * styled to the Paper mockup `2560_kontakty` (2026-11, frame `map`): a 24 px frame, the point
 * chips in its top-left corner (numbered like the address cards), «Открыть в Яндекс.Картах» as
 * a white pill in the bottom-right corner. ≤599 px the chips move above the frame, so they do
 * not cover the small map.
 *
 * Until «Показать карту» is pressed the frame is a static plate (grid, no network requests); the
 * point switches only choose which address the map will show. After the click an `<iframe>` of
 * the Yandex map widget is created for the selected point (search by address — no invented
 * coordinates). «Открыть в Яндекс.Картах» is always available as a plain external link.
 * No Metrika goals are attached here.
 */
export function YandexMap({ points, className }: YandexMapProps) {
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const noteId = useId();
  const point = points[selected] ?? points[0];
  if (!point) return null;

  return (
    <div className={cn("relative flex flex-col max-sm:gap-3", className)} data-testid="yandex-map">
      {points.length > 1 ? (
        <div
          role="group"
          aria-label={POINTS_LABEL}
          className="absolute top-6 left-6 z-10 flex max-w-[calc(100%-48px)] flex-wrap gap-2 max-sm:static max-sm:max-w-none"
        >
          {points.map((item, index) => {
            const active = index === selected;
            return (
              <Chip
                key={item.key}
                active={active}
                onClick={() => setSelected(index)}
                className={cn("rounded-full", !active && "bg-surface")}
                icon={
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-5 place-items-center rounded-full text-[11px] leading-none font-bold",
                      active ? "bg-surface text-primary-pressed" : "bg-primary text-white"
                    )}
                  >
                    {item.number}
                  </span>
                }
              >
                {item.title}
              </Chip>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "border-line relative h-[520px] overflow-hidden rounded-xl border max-md:h-[440px] max-sm:h-[360px]",
          PLATE
        )}
      >
        {loaded ? (
          <iframe
            key={point.key}
            src={yandexWidgetUrl(point.query)}
            title={`Карта: ${point.title}`}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 pb-20 text-center">
            <span
              aria-hidden="true"
              className="bg-primary grid size-11 place-items-center rounded-full border-[3px] border-white text-[17px] leading-none font-semibold text-white"
            >
              {point.number}
            </span>
            <p className="text-ink-2 m-0 text-lg leading-snug font-semibold">{point.title}</p>
            <Button
              variant="secondary"
              onClick={() => setLoaded(true)}
              aria-describedby={noteId}
              leftIcon={<MapPin aria-hidden="true" />}
            >
              {SHOW_MAP_LABEL}
            </Button>
            <p id={noteId} className="text-small text-text-2 m-0">
              {PROVIDER_NOTE}
            </p>
          </div>
        )}

        <a
          href={point.openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-surface border-line text-primary-pressed hover:border-brand focus-visible:outline-brand absolute right-6 bottom-6 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-3 text-[15px] leading-[18px] font-medium no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 max-sm:right-4 max-sm:bottom-4"
        >
          {OPEN_LABEL}
          <span className="sr-only">: {point.title}</span>
          <ExternalLink aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
        </a>
      </div>
    </div>
  );
}
