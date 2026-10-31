import { Container } from "@/components/ig/container";
import { cn } from "@/lib/utils";
import { NavAnchor } from "./nav-anchor";
import { NavDropdown } from "./nav-dropdown";
import type { HeaderNavData } from "./nav-defaults";

export interface SectionNavProps {
  nav: Pick<HeaderNavData, "sections" | "laptopVisibleCount" | "moreLabel">;
}

/**
 * Header row 3 (44 px, 14 px): the 9 main sections. At 1101–1365 px only the first
 * `laptopVisibleCount` links stay, the rest move under «Ещё ▾» (a simple dropdown, not a mega
 * menu). Hidden ≤1100 (the mobile menu has them).
 */
export function SectionNav({ nav }: SectionNavProps) {
  const { sections, laptopVisibleCount, moreLabel } = nav;
  const overflow = sections.slice(laptopVisibleCount);

  return (
    <nav
      aria-label="Разделы"
      className="border-hairline bg-surface h-11 border-t text-[14px] leading-[1.4] shadow-[0_1px_0_var(--ig-hairline)] max-md:hidden"
    >
      <Container className="flex h-full items-center justify-between gap-5">
        {sections.map((section, index) => (
          <NavAnchor
            key={section.href}
            link={section}
            className={cn(
              "text-text hover:text-primary-hover whitespace-nowrap no-underline",
              index >= laptopVisibleCount && "max-lg:hidden"
            )}
          />
        ))}
        {overflow.length > 0 ? (
          <div className="lg:hidden">
            <NavDropdown
              label={moreLabel}
              align="end"
              items={overflow.map((section) => ({
                kind: "link",
                label: section.label,
                href: section.href,
                newTab: section.newTab,
              }))}
            />
          </div>
        ) : null}
      </Container>
    </nav>
  );
}
