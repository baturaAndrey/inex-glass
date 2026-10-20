import "./globals.css";
import type { Metadata } from "next";

/**
 * Temporary root layout of the public site (Rubik and the Inex design system come in task 05).
 * The admin has its own root layout in the `(payload)` route group.
 */
export const metadata: Metadata = {
  title: {
    default: "Inex Glass",
    template: "%s | Inex Glass",
  },
  // Placeholder site: keep it out of search indexes until real pages ship.
  robots: { index: false, follow: false },
};

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col antialiased">
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
