import { cn } from "@/lib/utils";

export interface PlaceholderProps {
  /** Aspect ratio: `4/3` (default), `16/9` or any CSS `aspect-ratio` value (`"16/10"`). */
  ratio?: "4/3" | "16/9" | (string & {});
  /** Caption in the middle; «фото объекта» by default. */
  label?: string;
  className?: string | undefined;
}

const DEFAULT_LABEL = "фото объекта";

/**
 * Photo placeholder (`.ig-ph`): grey-green gradient with a glare. Decorative — hidden from
 * assistive technology; the real photo later gets a proper `alt`.
 */
export function Placeholder({ ratio = "4/3", label = DEFAULT_LABEL, className }: PlaceholderProps) {
  const isPreset = ratio === "4/3" || ratio === "16/9";
  return (
    <div
      aria-hidden="true"
      className={cn("ig-ph", ratio === "16/9" && "ig-ph--16x9", className)}
      style={isPreset ? undefined : { aspectRatio: ratio }}
    >
      <span>{label}</span>
    </div>
  );
}
