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

/**
 * Click-to-load Yandex map (152-FZ: no third-party request before the visitor asks for it).
 *
 * Until «Показать карту» is pressed the frame is a static plate (light grid, no network
 * requests); the point switches only choose which address the map will show. After the click an
 * `<iframe>` of the Yandex map widget is created for the selected point (search by address — no
 * invented coordinates). «Открыть в Яндекс.Картах» is always available as a plain external link.
 * No Metrika goals are attached here.
 */
export function YandexMap({ points, className }: YandexMapProps) {
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const noteId = useId();
  const point = points[selected] ?? points[0];
  if (!point) return null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {points.length > 1 ? (
        <div role="group" aria-label={POINTS_LABEL} className="flex flex-wrap gap-2">
          {points.map((item, index) => (
            <Chip
              key={item.key}
              active={index === selected}
              onClick={() => setSelected(index)}
              icon={
                <span
                  aria-hidden="true"
                  className="bg-brand grid size-5 place-items-center rounded-full text-[11px] leading-none font-bold text-white"
                >
                  {item.number}
                </span>
              }
            >
              {item.title}
            </Chip>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "relative h-[440px] overflow-hidden rounded-xl max-sm:h-[300px]",
          // Static «map» plate: light teal wash with a 48 px grid, drawn in CSS (no requests).
          "bg-[#E3ECE9] bg-[linear-gradient(rgba(22,64,61,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(22,64,61,.06)_1px,transparent_1px)] bg-[size:48px_48px]"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <span
              aria-hidden="true"
              className="bg-surface text-primary-pressed shadow-card grid size-14 place-items-center rounded-full"
            >
              <MapPin strokeWidth={2} className="size-7" />
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
      </div>

      <p className="m-0">
        <a
          href={point.openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ig-link inline-flex items-center gap-1.5"
        >
          {OPEN_LABEL}
          <span className="sr-only">: {point.title}</span>
          <ExternalLink aria-hidden="true" strokeWidth={2} className="size-4" />
        </a>
      </p>
    </div>
  );
}
