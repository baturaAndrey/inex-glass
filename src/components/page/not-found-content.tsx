import { FileQuestion } from "lucide-react";
import { Chip } from "@/components/ig/chip";
import { Container } from "@/components/ig/container";
import { SearchForm } from "@/components/search/search-form";
import { QuizLink } from "./quiz-cta";

/**
 * Body of the 404 page (ТЗ §2.4: own 404 with search and links to the sections). Shared by
 * `NotFoundResponse` (server-rendered 404 returned by pages), `(site)/not-found.tsx` (client-side
 * boundary) and `app/global-not-found.tsx` (unmatched URLs). Static on purpose: it must render even when the database is down.
 * The search is the plain GET form of the site search (task 35, `SearchForm`): no suggestions,
 * no database access.
 */

/** Section row of the header (same URLs). */
export const NOT_FOUND_SECTIONS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Закалённое стекло", href: "/zakalennoe-steklo/" },
  { label: "Триплекс", href: "/tripleks/" },
  { label: "Обработка стекла", href: "/obrabotka-stekla/" },
  { label: "Стеклянные перегородки", href: "/steklyannye-peregorodki/" },
  { label: "Ограждения", href: "/steklyannye-ograzhdeniya/" },
  { label: "Козырьки", href: "/steklyannye-kozyrki/" },
  { label: "Остекление зданий", href: "/osteklenie/" },
  { label: "Стекло для мебели", href: "/zakalennoe-steklo/dlya-mebeli/" },
  { label: "Зеркала", href: "/zerkala/" },
];

export const NOT_FOUND_TITLE = "Страница не найдена";
export const NOT_FOUND_TEXT =
  "Возможно, адрес изменился или страница удалена. Воспользуйтесь поиском или перейдите в нужный раздел.";

export function NotFoundContent() {
  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
        <FileQuestion aria-hidden="true" className="text-brand size-16" strokeWidth={1.5} />
        <div className="flex flex-col gap-3">
          <h1 className="ig-h2 m-0">{NOT_FOUND_TITLE}</h1>
          <p className="ig-body text-text-2 m-0">{NOT_FOUND_TEXT}</p>
        </div>

        <SearchForm placeholder="Поиск по сайту" />

        <nav aria-label="Разделы сайта" className="w-full">
          <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
            {NOT_FOUND_SECTIONS.map((section) => (
              <li key={section.href}>
                <Chip href={section.href}>{section.label}</Chip>
              </li>
            ))}
          </ul>
        </nav>

        <QuizLink />
      </div>
    </Container>
  );
}
