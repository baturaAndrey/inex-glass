import { QUIZ_FLAG_LABELS } from "@/lib/domain/quiz-flags";
import type { QuizFlag } from "@/lib/domain/quiz-flags";
import { Badge, Wrap } from "../ui";
import type { DefaultServerCellComponentProps } from "payload";

/** List cell of `leads.flags`: chips with the Russian flag labels. */
export function FlagsCell({ cellData }: DefaultServerCellComponentProps) {
  const labels = (Array.isArray(cellData) ? cellData : [])
    .map((flag) => QUIZ_FLAG_LABELS[flag as QuizFlag] as string | undefined)
    .filter((label): label is string => label !== undefined);
  if (labels.length === 0) return null;
  return (
    <Wrap>
      {labels.map((label) => (
        <Badge key={label}>{label}</Badge>
      ))}
    </Wrap>
  );
}
