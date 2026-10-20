import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <FileQuestion className="text-muted-foreground h-16 w-16" aria-hidden="true" />
        </div>
        <h1 className="mb-4 text-4xl font-bold">Страница не найдена</h1>
        <p className="text-muted-foreground mb-6">Такой страницы нет или она была перемещена.</p>
        <Button asChild>
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
