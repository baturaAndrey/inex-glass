import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";

export interface ServiceHeroProps {
  title: string;
  crumbs: Crumb[];
  lead?: string | undefined;
  /** Buttons row (`CtaButtons`). */
  actions?: ReactNode;
}

const TITLE_ID = "page-title";

/**
 * First screen of the service pages with their own layout (`.pg-top` of `HowTo` / `Drawings`):
 * white band with a hairline under it, crumbs, the only H1 (54 / 44 / 32 px), the 20 px lead
 * and the buttons. The crumbs live here, so `PageShell` runs with `hideBreadcrumbs`.
 */
export function ServiceHero({ title, crumbs, lead, actions }: ServiceHeroProps) {
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="bg-surface border-hairline border-b pt-10 pb-14 max-sm:pt-6 max-sm:pb-8"
    >
      <Container className="flex flex-col items-start gap-5">
        <Breadcrumbs items={crumbs} />
        <h1
          id={TITLE_ID}
          className="ig-h1 m-0 max-w-[1100px] text-balance max-md:text-[44px] max-sm:text-[32px]"
        >
          {title}
        </h1>
        {lead ? (
          <p className="text-lead-l text-ink-3 m-0 max-w-[820px] text-pretty">{lead}</p>
        ) : null}
        {actions}
      </Container>
    </section>
  );
}
