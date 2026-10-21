import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";

export const BLOG_TITLE_ID = "page-title";

/**
 * Top of the blog pages (`.pg-top` of Article.dc.html): white band with the crumbs and the
 * page H1 (54 / 44 / 32 px), optional lead under it.
 */
export function BlogPageTop({
  crumbs,
  title,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={BLOG_TITLE_ID}
      className="bg-surface border-hairline border-b pt-10 pb-14 max-sm:pt-6 max-sm:pb-8"
    >
      <Container className="flex flex-col gap-5">
        <Breadcrumbs items={crumbs} />
        <h1
          id={BLOG_TITLE_ID}
          className="ig-h1 max-w-[1100px] max-md:text-[44px] max-sm:text-[32px] max-sm:leading-[1.15]"
        >
          {title}
        </h1>
        {children}
      </Container>
    </section>
  );
}
