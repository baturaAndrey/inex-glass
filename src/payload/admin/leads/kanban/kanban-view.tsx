import { redirect } from "next/navigation";
import { getRole } from "@/payload/access";
import { LEADS_KANBAN_PATH } from "@/payload/admin/leads/constants";
import { loadKanbanPage } from "./data";
import { KanbanFilters } from "./filters";
import { KanbanBoard } from "./kanban-board";
import { KanbanPageHead } from "./page-head";
import { kanbanExportHref, parseKanbanQuery } from "./query";
import { KanbanStats } from "./stats";
import type { AdminViewServerProps, TypedUser } from "payload";

/**
 * Leads kanban — `/admin/collections/leads/kanban/` (`leads.admin.components.views.kanban`,
 * mockup `res/admin-mockup/Leads.dc.html`). Payload renders custom collection views inside its
 * default template (menu and app header), so this view renders only the page itself.
 *
 * Top to bottom: head (search, export), summary tiles, filters, the board. The URL holds the
 * whole state (`query.ts`); only `KanbanBoardProps` cross into the client.
 */
export async function LeadsKanbanView({ initPageResult, searchParams }: AdminViewServerProps) {
  const { req } = initPageResult;
  const user = req.user as TypedUser | null;
  if (!user) redirect(`/admin/login/?redirect=${encodeURIComponent(LEADS_KANBAN_PATH)}`);

  // Only staff reach the admin, but a custom view checks access itself (as the leads report).
  if (getRole(user) === null) {
    return (
      <div className="iga-kanban">
        <div className="iga-kanban__page">
          <p role="alert">Недостаточно прав для просмотра заявок.</p>
        </div>
      </div>
    );
  }

  const query = parseKanbanQuery(searchParams);
  const now = new Date();
  const { board, stats, chipCounts } = await loadKanbanPage(req.payload, user, query, now);

  return (
    <div className="iga-kanban">
      <KanbanPageHead query={query} exportHref={kanbanExportHref(query, now)} />
      <div className="iga-kanban__page">
        <KanbanStats stats={stats} />
        <KanbanFilters query={query} counts={chipCounts} />
        <KanbanBoard {...board} />
      </div>
    </div>
  );
}
