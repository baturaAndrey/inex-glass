import { headers } from "next/headers";
import { getPayload } from "payload";
import { formatDateTime } from "@/lib/leads-admin/export-rows";
import config from "@payload-config";
import { loadLeadTimeline } from "./load-timeline";

/**
 * «История» of the lead card (server component, admin redesign task 09). Self-contained with
 * `{ leadId }`: takes Payload and the viewer from the request, so the card (task 08) only places
 * it under the comments of «Комментарии и история» (the shared `h2` is the card's; this block is
 * a named region without a heading of its own).
 *
 * Renders nothing for a viewer without access to the lead.
 */
export async function LeadHistory({ leadId }: { leadId: string }) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return null;

  const items = await loadLeadTimeline(payload, user, leadId);
  if (items === null) return null;

  return (
    <div role="region" aria-label="История" className="iga-lead-history">
      {items.length === 0 ? (
        <p className="iga-lead-history__empty">Событий пока нет</p>
      ) : (
        <ol className="iga-lead-history__list">
          {items.map((item) => (
            <li
              key={item.id}
              className="iga-lead-history__item"
              data-kind={item.kind}
              data-tone={item.tone}
            >
              <span className="iga-lead-history__meta">
                <time dateTime={item.date}>{formatDateTime(item.date)}</time> · {item.author}
              </span>
              <span className="iga-lead-history__text">
                {item.href ? <a href={item.href}>{item.text}</a> : item.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
