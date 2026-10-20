"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="text-destructive h-16 w-16" aria-hidden="true" />
        </div>
        <h1 className="mb-4 text-2xl font-bold">Что-то пошло не так</h1>
        <p className="text-muted-foreground mb-6">
          Произошла непредвиденная ошибка. Попробуйте ещё раз.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mb-4 text-xs">Код ошибки: {error.digest}</p>
        )}
        <Button onClick={reset}>Попробовать снова</Button>
      </div>
    </div>
  );
}
