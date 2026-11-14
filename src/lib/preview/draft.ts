import { draftMode } from "next/headers";

/**
 * `true` while the current request is in Next Draft Mode (cookie `__prerender_bypass`, set by
 * `/api/preview/`). Outside a Next request scope (seed scripts, jobs, `payload run`, tests)
 * `draftMode()` throws — that is simply "not in preview".
 */
export async function isDraftModeEnabled(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
}
