import { Fragment, type ReactNode } from "react";

/**
 * Card text of the «Проектирование» / «Производство» pages (`cards` block `text`, a plain
 * textarea): the first lines are the description, lines starting with `- ` (or `— `) are
 * bullets. `**bold**` marks a strong fragment.
 */
export interface CardText {
  intro: string[];
  bullets: string[];
}

const BULLET = /^\s*[-—–]\s+/u;

export function parseCardText(text: string | null | undefined): CardText {
  const intro: string[] = [];
  const bullets: string[] = [];
  for (const raw of (text ?? "").split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line) continue;
    if (BULLET.test(line)) bullets.push(line.replace(BULLET, ""));
    else intro.push(line);
  }
  return { intro, bullets };
}

/** `**fragment**` → `<strong>`; everything else stays plain text. */
export function inlineBold(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/u);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  );
}
