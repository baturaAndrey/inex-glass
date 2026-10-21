import { countWords } from "@/payload/utils/lexical-text";

/** Reading speed of the blog cards (task-31): 200 words per minute. */
export const BLOG_WORDS_PER_MINUTE = 200;

/** Whole minutes to read `text`: `max(1, ceil(words / 200))`. */
export function estimateReadingMinutes(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / BLOG_WORDS_PER_MINUTE));
}
