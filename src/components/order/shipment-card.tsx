"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ig/button";
import type { PublicShipment } from "@/lib/orders/public-view";
import { OrderCard } from "./order-card";

/** How long «Скопировано» stays on the button. */
const COPIED_MS = 2000;

/** Copies text; falls back to a selected off-screen textarea + `execCommand` (old browsers, http). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: try the legacy path.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-2">{term}</dt>
      <dd className="m-0 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5 font-medium [overflow-wrap:anywhere] max-sm:mb-2.5 max-sm:flex-col max-sm:items-start">
        {children}
      </dd>
    </>
  );
}

/**
 * «Отгрузка»: shipping date, carrier, waybill number with «Скопировать» → «Скопировано» (2 s,
 * announced via `aria-live`), «Открыть на сайте ТК». Empty rows are not rendered.
 */
export function ShipmentCard({
  shipment,
  copyLabel,
  copiedLabel,
}: {
  shipment: PublicShipment;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const onCopy = async () => {
    if (!shipment.waybill || !(await copyText(shipment.waybill))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <OrderCard title="Отгрузка" titleId="order-shipment-title">
      <dl className="m-0 grid grid-cols-[200px_minmax(0,1fr)] gap-x-6 gap-y-3 text-[16px] leading-[1.45] max-sm:grid-cols-1 max-sm:gap-1">
        {shipment.date ? <Row term="Дата отгрузки">{shipment.date}</Row> : null}
        {shipment.carrier ? <Row term="Транспортная компания">{shipment.carrier}</Row> : null}
        {shipment.waybill ? (
          <Row term="Номер накладной">
            <span className="tabular-nums" data-testid="order-waybill">
              {shipment.waybill}
            </span>
            <Button variant="secondary" size="s" onClick={() => void onCopy()}>
              <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
            </Button>
          </Row>
        ) : null}
        {shipment.trackingUrl ? (
          <Row term="Отслеживание">
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ig-link ig-link--arrow"
            >
              Открыть на сайте ТК
              <ArrowRight aria-hidden="true" strokeWidth={2} />
            </a>
          </Row>
        ) : null}
      </dl>
    </OrderCard>
  );
}
