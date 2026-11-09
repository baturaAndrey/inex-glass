import type { ReactNode } from "react";

/**
 * Left column of the two-column sections of the tempered-glass hub («Что проверить до заказа»,
 * «Как выбрать толщину»): a 560 px column with the H2, the sub paragraph (19 px) and whatever
 * follows (links, footnote, buttons). Full width ≤1100 px, where the sections stack.
 */
export function SplitIntro({
  heading,
  headingId,
  sub,
  children,
}: {
  heading: string;
  headingId: string;
  sub?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-[560px] shrink-0 flex-col gap-6 max-lg:w-[440px] max-md:w-full max-sm:gap-4">
      <h2 id={headingId} className="ig-h2 m-0 text-balance">
        {heading}
      </h2>
      {sub ? (
        <p className="text-ink-3 m-0 text-[19px] leading-[1.55] text-pretty max-sm:text-[17px]">
          {sub}
        </p>
      ) : null}
      {children}
    </div>
  );
}
