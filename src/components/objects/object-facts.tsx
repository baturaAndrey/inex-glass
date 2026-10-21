import Link from "next/link";
import { Calculator, FileText } from "lucide-react";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { DRAWING_CTA_LABEL } from "@/components/page/quiz-cta";
import { cn } from "@/lib/utils";

export interface ObjectFactsProps {
  city?: string | null | undefined;
  type?: string | null | undefined;
  year?: number | null | undefined;
  products: readonly string[];
  task?: string | null | undefined;
  /** Quiz link of «Рассчитать похожий проект» (`buildQuizHref`). */
  quizHref: string;
  /** Source of the drawing form: `obekty-<slug>`. */
  formSource: string;
  className?: string | undefined;
}

export const SIMILAR_PROJECT_LABEL = "Рассчитать похожий проект";

/**
 * Side panel of an object (prototype `.op-side`): facts as a `dl` (rows without a value are
 * hidden), «Задача и сложность» when filled, the quiz CTA and the drawing form. Sticky under the
 * compact header from 1101 px (`--ig-header-compact-h` + 24 px = 88 px).
 */
export function ObjectFacts({
  city,
  type,
  year,
  products,
  task,
  quizHref,
  formSource,
  className,
}: ObjectFactsProps) {
  const facts = [
    { label: "Город", value: city?.trim() },
    { label: "Тип объекта", value: type?.trim() },
    { label: "Год", value: year ? String(year) : "" },
    { label: "Изделия", value: products.join(", ") },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
  const taskText = task?.trim();

  return (
    <aside
      aria-label="Об объекте"
      className={cn(
        "bg-bg flex flex-col gap-6 rounded-xl p-7 max-sm:p-5",
        "md:sticky md:top-[calc(var(--ig-header-compact-h)+24px)]",
        className
      )}
      data-object-facts=""
    >
      {facts.length > 0 ? (
        <dl className="m-0 flex flex-col">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="border-line flex justify-between gap-4 border-b py-3 text-[15px] leading-[1.4]"
            >
              <dt className="text-text-2">{fact.label}</dt>
              <dd className="m-0 text-right font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {taskText ? (
        <div className="flex flex-col gap-2">
          <span className="ig-label">Задача и сложность</span>
          <p className="ig-body m-0">{taskText}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          asChild
          variant="primary"
          size="l"
          block
          leftIcon={<Calculator aria-hidden="true" strokeWidth={2} />}
        >
          <Link href={quizHref} data-quiz-cta="">
            {SIMILAR_PROJECT_LABEL}
          </Link>
        </Button>
        <FormTrigger
          formKey="drawing"
          params={{ label: DRAWING_CTA_LABEL, source: formSource }}
          asChild
        >
          <Button
            variant="secondary"
            block
            leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
          >
            {DRAWING_CTA_LABEL}
          </Button>
        </FormTrigger>
      </div>
    </aside>
  );
}
