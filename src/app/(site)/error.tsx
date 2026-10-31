"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { TextLink } from "@/components/ig/text-link";

/**
 * Error boundary of the site pages. A client component cannot call the server loaders, so the
 * phone is not shown here: the visitor gets a link to the contacts page instead of a hard-coded
 * number that could drift from the `contacts` global.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest links this message to the server log entry of the same error.
    console.error("Site error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
        <TriangleAlert aria-hidden="true" className="text-danger size-16" strokeWidth={1.5} />
        <div className="flex flex-col gap-3">
          <h1 className="ig-h2 m-0">Что-то пошло не так</h1>
          <p className="ig-body text-text-2 m-0">
            Попробуйте обновить страницу. Если ошибка повторится, свяжитесь с нами —{" "}
            <TextLink href="/kontakty/">контакты</TextLink>.
          </p>
          {error.digest ? (
            <p className="ig-micro text-muted m-0">Код ошибки: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={reset} leftIcon={<RefreshCw aria-hidden="true" strokeWidth={2} />}>
            Попробовать ещё раз
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
