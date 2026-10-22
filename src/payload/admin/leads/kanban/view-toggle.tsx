import { LEADS_KANBAN_PATH, LEADS_LIST_PATH } from "@/payload/admin/leads/constants";

/**
 * «Канбан / Таблица» switch of the leads module: on the kanban (`active="kanban"`) and above the
 * list (`beforeList` of `leads` → `LeadsViewToggle`). Plain links: admin links are `<a>`.
 */
export function ViewToggle({ active }: { active: "kanban" | "list" }) {
  return (
    <div className="iga-seg" role="group" aria-label="Вид">
      <a href={LEADS_KANBAN_PATH} aria-current={active === "kanban" ? "page" : undefined}>
        Канбан
      </a>
      <a href={LEADS_LIST_PATH} aria-current={active === "list" ? "page" : undefined}>
        Таблица
      </a>
    </div>
  );
}

/** `beforeList` of `leads`: the switch above the list (the quick filters stay below it). */
export function LeadsViewToggle() {
  return (
    <div className="iga-kanban__list-toggle">
      <ViewToggle active="list" />
    </div>
  );
}
