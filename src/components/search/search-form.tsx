import { useId } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Input } from "@/components/ig/input";
import { SEARCH_PAGE_PATH, SEARCH_QUERY_MAX_LENGTH } from "@/lib/search/types";
import { cn } from "@/lib/utils";

export interface SearchFormProps {
  /** Current query (results page). */
  defaultValue?: string | undefined;
  /** Accessible name of the field (visually hidden). */
  label?: string | undefined;
  placeholder?: string | undefined;
  className?: string | undefined;
}

/** A query of whitespace only is not submitted (native constraint validation, no JS). */
const NON_BLANK_PATTERN = ".*\\S.*";

/**
 * Plain GET search form (`/poisk/?q=…`) of the 404 page and the results page (task 35). Works
 * without JS and without the database: no suggestions here (those live in the header).
 */
export function SearchForm({
  defaultValue,
  label = "Поиск по сайту",
  placeholder = "Например, закалённое стекло 10 мм",
  className,
}: SearchFormProps) {
  const id = useId();
  return (
    <form
      action={SEARCH_PAGE_PATH}
      method="get"
      role="search"
      aria-label={label}
      className={cn("flex w-full gap-2 max-sm:flex-col", className)}
      data-testid="search-form"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          strokeWidth={2}
          className="text-text-2 pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
        />
        <Input
          id={id}
          name="q"
          type="search"
          required
          pattern={NON_BLANK_PATTERN}
          title="Введите запрос"
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="pl-11"
        />
      </div>
      <Button type="submit" leftIcon={<Search aria-hidden="true" strokeWidth={2} />}>
        Найти
      </Button>
    </form>
  );
}
