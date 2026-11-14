import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { quizPrefillField } from "../fields/quiz-prefill";
import type { Block } from "payload";

/** Quiz call to action with its own pre-fill (overrides the document's `quizPrefill`). */
export const QuizCtaBlock: Block = {
  slug: "quizCta",
  dbName: scopedDbName("blk_quiz_cta"),
  interfaceName: "QuizCtaBlock",
  labels: { singular: "Призыв к квизу", plural: "Призывы к квизу" },
  fields: [
    ...sectionFields(),
    { name: "text", type: "textarea", label: "Текст" },
    { name: "buttonLabel", type: "text", label: "Текст кнопки" },
    quizPrefillField({ name: "prefill" }),
  ],
};
