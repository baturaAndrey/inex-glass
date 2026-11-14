"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { DEFAULT_THANK_YOU_TEXT, DEFAULT_THANK_YOU_TITLE } from "./options";

const WAIT_LINKS = [
  {
    href: "/kak-zakazat/trebovaniya-k-chertezham/",
    label: "Требования к чертежам",
    note: "— если файл ещё не готов",
  },
  { href: "/kak-zakazat/sroki/", label: "Сроки изготовления", note: "— как спланировать заказ" },
] as const;

const LINK_CLASS =
  "text-primary-pressed underline decoration-1 underline-offset-2 transition-colors hover:text-primary-dark";

/** Screen after a successful submission (`.qz-done`); focus moves to the heading. */
export function QuizSuccess({ title, text }: { title: string; text: string }) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      data-slot="quiz-success"
      className="flex flex-col items-start gap-6 px-10 pt-12 pb-10 max-sm:px-4 max-sm:py-8"
    >
      <span
        aria-hidden="true"
        className="bg-primary-light text-primary-pressed grid size-16 place-items-center rounded-full"
      >
        <Check className="size-8" strokeWidth={2.5} />
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-text m-0 text-[28px] leading-[1.2] font-bold outline-none max-sm:text-[22px]"
      >
        {title || DEFAULT_THANK_YOU_TITLE}
      </h2>
      <p className="text-body text-text m-0 max-w-[640px]">{text || DEFAULT_THANK_YOU_TEXT}</p>
      <div className="bg-bg flex w-full flex-col gap-2 rounded-[14px] px-5 py-[18px]">
        <span className="text-h6 text-text">Пока ждёте:</span>
        {WAIT_LINKS.map((link) => (
          <span key={link.href} className="text-body text-text">
            <Link href={link.href} className={LINK_CLASS}>
              {link.label}
            </Link>{" "}
            {link.note}
          </span>
        ))}
      </div>
    </div>
  );
}
