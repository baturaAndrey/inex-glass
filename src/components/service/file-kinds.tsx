import type { ComponentType } from "react";
import { FileText, FileX, type LucideProps } from "lucide-react";
import { TextLink } from "@/components/ig/text-link";
import { cn } from "@/lib/utils";

type FileKindTone = "main" | "plain" | "no";

interface FileKind {
  tone: FileKindTone;
  tag: string;
  title: string;
  text: string;
  link?: { label: string; href: string };
}

/**
 * Cards of the approved `Drawings.dc.html` design; the wording matches teksty 04 §2 «Какие файлы
 * принимаем» (the cards split each bullet into a title and a sentence).
 */
const FILE_KINDS: readonly FileKind[] = [
  {
    tone: "main",
    tag: "Основной формат",
    title: "DWG и DXF",
    text: "Пришлите как есть, переводить в PDF не нужно.",
  },
  {
    tone: "plain",
    tag: "Для простых стёкол",
    title: "PDF с размерами или эскиз",
    text: "Для простых прямоугольных стёкол.",
  },
  {
    tone: "no",
    tag: "Не принимаем",
    title: "Физические шаблоны",
    text: "Проём сложной формы пришлите контуром в DWG или DXF в масштабе 1:1.",
    link: { label: "Как снять размеры проёма", href: "/blog/kak-snyat-razmery-dlya-stekla/" },
  },
];

export const FILE_KINDS_HEADING = "Какие файлы принимаем";
const FILE_SIZE_NOTE = "Размер файла — до 50 МБ.";

const TONE: Record<
  FileKindTone,
  { card: string; icon: string; tag: string; Icon: ComponentType<LucideProps> }
> = {
  main: {
    card: "bg-primary-light border-brand",
    icon: "bg-surface text-primary-pressed",
    // `primary` (#267D70), not the brand teal: white 12 px text needs ≥4.5:1.
    tag: "bg-primary text-white",
    Icon: FileText,
  },
  plain: {
    card: "bg-surface border-hairline",
    icon: "bg-bg text-text-2",
    tag: "bg-well text-ink-2",
    Icon: FileText,
  },
  no: {
    card: "bg-danger-bg border-danger",
    icon: "bg-surface text-danger-text",
    tag: "bg-danger-text text-white",
    Icon: FileX,
  },
};

/**
 * «Какие файлы принимаем» (`.dr-files`): three cards — the main format, the format for simple
 * glass and what is not accepted (red, crossed-out file). 3 columns → 1 at ≤1100 px.
 */
export function FileKinds({ headingId }: { headingId: string }) {
  return (
    <>
      <h2 id={headingId} className="ig-h2 mt-0 mb-8 max-sm:mb-5">
        {FILE_KINDS_HEADING}
      </h2>
      <ul
        className="m-0 grid list-none grid-cols-3 gap-6 p-0 max-md:grid-cols-1 max-sm:gap-4"
        data-testid="file-kinds"
      >
        {FILE_KINDS.map(({ tone, tag, title, text, link }) => {
          const style = TONE[tone];
          return (
            <li
              key={title}
              data-tone={tone}
              className={cn(
                "flex flex-col gap-3 rounded-xl border-[1.5px] p-7 max-sm:p-5",
                style.card
              )}
            >
              <span
                aria-hidden="true"
                className={cn("grid size-14 place-items-center rounded-[14px]", style.icon)}
              >
                <style.Icon strokeWidth={2} className="size-7" />
              </span>
              <span
                className={cn(
                  "self-start rounded-sm px-2.5 py-1.5 text-xs leading-none font-semibold tracking-[0.06em] uppercase",
                  style.tag
                )}
              >
                {tag}
              </span>
              <h3 className="m-0 text-2xl leading-[1.3] font-semibold max-sm:text-xl">{title}</h3>
              <p className="text-ink-3 m-0 text-base leading-normal">{text}</p>
              {link ? (
                <TextLink href={link.href} variant="arrow" className="self-start">
                  {link.label}
                </TextLink>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-small text-text-2 mt-5 mb-0">{FILE_SIZE_NOTE}</p>
    </>
  );
}
