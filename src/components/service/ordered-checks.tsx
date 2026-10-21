/**
 * Compact numbered list «Как мы проверяем файл» (`.dr-ol` of `Drawings.dc.html`): small
 * primary-light circles with the number, then the sentence. Numbering is the `ol` order.
 */
export function OrderedChecks({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ol
      className="m-0 flex list-none flex-col gap-4 p-0 text-[17px] leading-normal max-sm:text-[15px]"
      data-testid="ordered-checks"
    >
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="bg-primary-light text-primary-dark grid size-9 flex-none place-items-center rounded-full text-base leading-none font-bold"
          >
            {index + 1}
          </span>
          <span className="pt-1.5 max-sm:pt-2">{item}</span>
        </li>
      ))}
    </ol>
  );
}
