import "./(site)/globals.css";
import { FormDialogProvider } from "@/components/forms/form-dialog-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NotFoundContent, NOT_FOUND_TITLE } from "@/components/page/not-found-content";
import { TITLE_BRAND_SUFFIX } from "@/lib/seo/metadata";
import { rubik } from "./(site)/fonts";
import type { Metadata } from "next";

/**
 * Global 404 (Next 16, `experimental.globalNotFound`) for URLs that match no route at all.
 * The app has two root layouts — `(site)` and `(payload)` — so there is no single layout to
 * compose a 404 from: this file renders its own document with the site styles, font, header
 * and footer. Next answers it with HTTP 404 and adds `noindex` itself (no robots here: no duplicate tag).
 */
export const metadata: Metadata = {
  title: { absolute: `${NOT_FOUND_TITLE}${TITLE_BRAND_SUFFIX}` },
};

export default function GlobalNotFound() {
  return (
    <html lang="ru" className={rubik.variable}>
      <body className="flex min-h-screen flex-col">
        <FormDialogProvider>
          <SiteHeader />
          <main id="main-content" className="flex-1">
            <NotFoundContent />
          </main>
          <SiteFooter />
        </FormDialogProvider>
      </body>
    </html>
  );
}
