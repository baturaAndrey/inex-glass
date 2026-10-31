/**
 * Heading of the order page: eyebrow «Страница заказа» (not the URL: the real link holds a
 * token, not the number), H1 «Заказ № 2026-0147», «{company} · {composition}».
 */
export function OrderTitle({ number, subtitle }: { number: string; subtitle: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="ig-label">Страница заказа</span>
      <h1 className="m-0 text-[40px] leading-[1.15] font-bold max-sm:text-[28px] max-sm:leading-[1.2]">
        Заказ № {number}
      </h1>
      {subtitle ? (
        <p className="text-text-2 m-0 text-[18px] leading-[1.5] max-sm:text-[16px]">{subtitle}</p>
      ) : null}
    </div>
  );
}
