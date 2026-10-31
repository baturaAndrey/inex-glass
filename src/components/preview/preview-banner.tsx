import { isDraftModeEnabled } from "@/lib/preview/draft";
import { PREVIEW_EXIT_PATH } from "@/lib/preview/preview-url";

/**
 * «Режим превью» strip of the page draft preview (task 11, admin redesign). Renders nothing
 * outside Draft Mode — always the case for prerendered/ISR pages, so they stay static.
 * «Выйти» is a plain `<form method="post">` to `/api/preview/exit/`: no client JS, and forms are
 * never prefetched.
 */
export async function PreviewBanner() {
  if (!(await isDraftModeEnabled())) return null;
  return (
    <div role="status" className="bg-warning-bg text-warning-text border-warning border-b">
      <div className="text-small mx-auto flex w-full max-w-[1920px] flex-wrap items-center gap-3 px-(--ig-gutter) py-2">
        <span>Режим превью: показан черновик страницы</span>
        <form method="post" action={PREVIEW_EXIT_PATH}>
          <button type="submit" className="ig-btn ig-btn--secondary ig-btn--s max-sm:min-h-11">
            Выйти
          </button>
        </form>
      </div>
    </div>
  );
}
