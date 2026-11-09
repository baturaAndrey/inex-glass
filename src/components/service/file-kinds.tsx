import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type FileKindTone = "main" | "plain" | "no";

interface FileKind {
  tone: FileKindTone;
  /** Format chips above the title (none on the «not accepted» card, which has the icon). */
  tags: readonly string[];
  title: string;
  text: string;
  link?: { label: string; href: string };
}

/**
 * Cards of the Paper mockup `2560_kak-zakazat_trebovaniya` (frame `sec-files`); the wording is
 * teksty 04 §2 «Какие файлы принимаем» (each bullet split into chips, a title and a sentence).
 */
const FILE_KINDS: readonly FileKind[] = [
  {
    tone: "main",
    tags: ["DWG", "DXF"],
    title: "Основной формат",
    text: "Пришлите как есть, переводить в PDF не нужно.",
  },
  {
    tone: "plain",
    tags: ["PDF", "эскиз"],
    title: "PDF с размерами или эскиз",
    text: "Для простых прямоугольных стёкол.",
  },
  {
    tone: "no",
    tags: [],
    title: "Физические шаблоны не принимаем",
    text: "Проём сложной формы пришлите контуром в DWG или DXF в масштабе 1:1.",
    link: { label: "Как снять размеры проёма", href: "/blog/kak-snyat-razmery-dlya-stekla/" },
  },
];

export const FILE_KINDS_HEADING = "Какие файлы принимаем";
const FILE_SIZE_NOTE = "Размер файла — до 50 МБ.";

const TONE: Record<FileKindTone, { card: string; tag: string; title: string }> = {
  main: {
    card: "bg-primary-light",
    // `primary` (#267D70), not the brand teal: white 14 px text needs ≥4.5:1.
    tag: "bg-primary text-white",
    title: "text-text",
  },
  plain: {
    card: "bg-surface border-hairline border",
    tag: "bg-well text-text",
    title: "text-text",
  },
  no: {
    card: "bg-warning-bg border-warning border",
    tag: "",
    title: "text-warning-text",
  },
};

/**
 * «Какие файлы принимаем» (the heading is the article's): the main format, the format for simple
 * glass and what is not accepted (warning card). 3 columns → 1 at ≤1100 px; the file size note
 * under the cards.
 */
export function FileKinds() {
  return (
    <div className="flex flex-col gap-4">
      <ul
        className="m-0 grid list-none grid-cols-3 gap-4 p-0 max-md:grid-cols-1 max-sm:gap-3"
        data-testid="file-kinds"
      >
        {FILE_KINDS.map(({ tone, tags, title, text, link }) => {
          const style = TONE[tone];
          return (
            <li
              key={title}
              data-tone={tone}
              className={cn("flex flex-col gap-3 rounded-lg p-7 max-sm:p-5", style.card)}
            >
              {tone === "no" ? (
                <TriangleAlert
                  aria-hidden="true"
                  strokeWidth={2}
                  className="text-warning-text size-7"
                />
              ) : (
                <span className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-sm px-2.5 py-1 text-sm leading-[18px] font-semibold",
                        style.tag
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              )}
              <h3 className={cn("m-0 text-lg leading-[22px] font-semibold", style.title)}>
                {title}
              </h3>
              <p className="text-ink-3 m-0 text-base leading-[1.55]">
                {text}
                {link ? (
                  <>
                    {" "}
                    <Link
                      href={link.href}
                      className="text-primary-pressed hover:text-primary-dark font-medium underline decoration-1 underline-offset-[3px]"
                    >
                      {link.label}
                    </Link>
                  </>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-text-2 m-0 text-base leading-5">{FILE_SIZE_NOTE}</p>
    </div>
  );
}
