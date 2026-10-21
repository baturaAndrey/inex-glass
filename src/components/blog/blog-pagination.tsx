import Link from "next/link";
import { pageLinks } from "@/lib/blog/pagination";
import { cn } from "@/lib/utils";

export interface BlogPaginationProps {
  current: number;
  total: number;
  className?: string | undefined;
}

/**
 * Page links of the blog listing (`/blog/`, `/blog/page/N/`): plain links, the current page has
 * `aria-current="page"`. Hidden when there is only one page. Separate from the objects
 * pagination (task-30) on purpose: the URL schemes differ.
 */
export function BlogPagination({ current, total, className }: BlogPaginationProps) {
  const links = pageLinks(current, total);
  if (links.length < 2) return null;
  return (
    <nav aria-label="Страницы" className={className}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {links.map((link) => (
          <li key={link.page}>
            <Link
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              className={cn(
                "grid h-11 min-w-11 place-items-center rounded-full border px-3 text-[15px] font-medium tabular-nums no-underline transition-colors duration-(--ig-dur-base)",
                link.current
                  ? "border-primary-dark bg-primary-dark text-white hover:text-white"
                  : "border-line bg-surface text-text hover:border-brand hover:text-primary-pressed"
              )}
            >
              {link.page}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
