"use client";

import type { ChangeEvent, SelectHTMLAttributes } from "react";

/**
 * A `<select>` of a GET filter form that submits the form on change (the kanban's «Источник» and
 * «Период»). Without JavaScript the form has a «Применить» button in `<noscript>`.
 */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.currentTarget.form?.requestSubmit();
  };
  return <select {...props} onChange={onChange} />;
}
