import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ig/button";
import type { PublicDocument } from "@/lib/orders/public-view";
import { OrderCard } from "./order-card";

/**
 * «Документы»: specification, passport, certificates — icon, title, «PDF · 1,2 МБ» and
 * «Скачать» (`/zakaz/<token>/docs/<id>/`, an attachment). Hidden when there are no documents.
 * `ym-disable-tracklink`: Metrika must never record these URLs (they contain the token).
 */
export function DocumentsCard({
  docsBase,
  documents,
}: {
  /** `/zakaz/<token>/docs/`. */
  docsBase: string;
  documents: PublicDocument[];
}) {
  if (documents.length === 0) return null;
  return (
    <OrderCard title="Документы" titleId="order-documents-title">
      <ul className="m-0 flex list-none flex-col p-0">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="border-hairline flex items-center gap-4 border-t py-3.5 first:border-t-0 first:pt-0 last:pb-0 max-sm:gap-3"
          >
            <span
              aria-hidden="true"
              className="bg-primary-light text-primary-pressed grid size-11 flex-none place-items-center rounded-[10px]"
            >
              <FileText className="size-[22px]" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[15px] leading-[1.4] font-medium [overflow-wrap:anywhere]">
              {doc.title}
              {doc.meta ? (
                <span className="text-text-2 text-[13px] leading-[1.3] font-normal">
                  {doc.meta}
                </span>
              ) : null}
            </span>
            <Button
              asChild
              variant="secondary"
              size="s"
              leftIcon={<Download aria-hidden="true" strokeWidth={2} />}
            >
              <a
                href={`${docsBase}${doc.id}/`}
                download
                className="ym-disable-tracklink"
                aria-label={`Скачать «${doc.title}»`}
              >
                Скачать
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </OrderCard>
  );
}
