import {
  Building2,
  Ellipsis,
  Fence,
  Frame,
  House,
  Layers,
  PanelsTopLeft,
  RectangleVertical,
  ShowerHead,
  Store,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import {
  isEdgeAllowed,
  NBSP,
  QUIZ_CUSTOM_THICKNESS,
  QUIZ_CUSTOM_THICKNESS_LABEL,
  QUIZ_DECOR,
  QUIZ_EDGES,
  QUIZ_KINDS,
  QUIZ_PACKING,
  QUIZ_ROLES,
  QUIZ_STAMP,
  QUIZ_TYPES,
  THICKNESSES,
  TINT_COLORS,
} from "@/lib/domain";
import type { QuizEdgeId, QuizTypeId } from "@/lib/domain";

/**
 * Option lists of the quiz steps: order, labels (verbatim teksty/05-kviz.md via the domain
 * constants of `quiz-schema.ts`) and Lucide icons. Texts that teksty/05 does not contain are
 * marked «(не из teksty)» and listed in the task report for approval.
 */

export const TYPE_ICONS: Record<QuizTypeId, LucideIcon> = {
  tempered: RectangleVertical,
  triplex: Layers,
  partitions: PanelsTopLeft,
  railings: Fence,
  shower: ShowerHead,
  canopies: Umbrella,
  facade: Building2,
  shopfronts: Store,
  verandas: House,
  mirrors: Frame,
  other: Ellipsis,
};

export const TYPE_OPTIONS = QUIZ_TYPES.map((type) => ({
  value: type.id,
  title: type.label,
  Icon: TYPE_ICONS[type.id],
}));

/** Step 2: 4 … 19 mm, then «Подберите под нагрузку». */
export const THICKNESS_VALUES = THICKNESSES;
export const CUSTOM_THICKNESS = QUIZ_CUSTOM_THICKNESS;
export const CUSTOM_THICKNESS_TITLE = QUIZ_CUSTOM_THICKNESS_LABEL;
export const CUSTOM_THICKNESS_SUB = "опишите конструкцию";
export const CUSTOM_NOTE_LABEL = "Опишите конструкцию: размер стекла, как крепится, где стоит";

/** «10 мм». */
export const mmLabel = (n: number) => `${n}${NBSP}мм`;

/** Triplex layer glasses offered by the constructor (4 … 12 mm). */
export const TRIPLEX_GLASS_VALUES = [4, 5, 6, 8, 10, 12] as const;
/** (не из teksty) Labels of the triplex constructor. */
export const TRIPLEX_LABELS = {
  glass1: "Стекло 1",
  glass2: "Стекло 2",
  film: "Плёнка EVA",
} as const;

export const KIND_OPTIONS = QUIZ_KINDS.map((kind) => ({ value: kind.id, label: kind.label }));
export const TINT_OPTIONS = TINT_COLORS.map((tint) => ({ value: tint.id, label: tint.label }));
export const RAL_LABEL = "Цвет RAL";
export const RAL_PLACEHOLDER = "Например, RAL 9003";
export const BEND_RADIUS_LABEL = "Радиус гиба, мм";

/** Step 4 edge options available for a product type (facet — mirrors only). */
export function edgeOptions(type: QuizTypeId | undefined): { value: QuizEdgeId; label: string }[] {
  return QUIZ_EDGES.filter((edge) => isEdgeAllowed(edge.id, type)).map((edge) => ({
    value: edge.id,
    label: edge.label,
  }));
}

export const YES = "yes";
export const NO = "no";
export const YES_NO_OPTIONS = [
  { value: YES, label: "да" },
  { value: NO, label: "нет" },
] as const;
/** «Отверстия: нет · есть». */
export const HOLES_OPTIONS = [
  { value: NO, label: "нет" },
  { value: YES, label: "есть" },
] as const;

export const DECOR_OPTIONS = QUIZ_DECOR.map((decor) => ({ value: decor.id, label: decor.label }));
export const STAMP_OPTIONS = QUIZ_STAMP.map((stamp) => ({ value: stamp.id, label: stamp.label }));
/** (не из teksty) Field for «укажу место». */
export const STAMP_NOTE_LABEL = "Место клейма";

export const PACKING_OPTIONS = QUIZ_PACKING.map((pack) => ({ value: pack.id, label: pack.label }));
export const CARRIER_NOTE_LABEL = "Требования перевозчика";

export const ROLE_OPTIONS = QUIZ_ROLES.map((role) => ({ value: role.id, label: role.label }));

/** (не из teksty) Field for the «Другой» city. */
export const CITY_OTHER_LABEL = "Город";
/** (не из teksty) Optional comment of step 7 (coordinator decision). */
export const COMMENT_LABEL = "Комментарий";

/** `true` → `'yes'`, `false` → `'no'`, unknown → `null` (for single chip groups). */
export const toYesNo = (value: boolean | undefined): string | null =>
  value === undefined ? null : value ? YES : NO;
/** Inverse of `toYesNo`. */
export const fromYesNo = (value: string | null): boolean | undefined =>
  value === YES ? true : value === NO ? false : undefined;

/** Step titles (h2), verbatim teksty/05-kviz.md. */
export const STEP_TITLES = {
  1: "Что нужно рассчитать?",
  2: "Какое стекло?",
  3: "Объём и размеры",
  4: "Обработка",
  5: "Чертёж",
  6: "Сроки и доставка",
  7: "Контакты",
} as const;

/** Defaults of `site-settings.forms`, verbatim teksty/05-kviz.md «Экран после отправки». */
export const DEFAULT_THANK_YOU_TITLE = "Спасибо, заявка принята";
export const DEFAULT_THANK_YOU_TEXT =
  "Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня, для больших объёмов дольше. Связь — звонком и по e-mail.";
