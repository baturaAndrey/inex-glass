"use client";

import type { ComponentType } from "react";
import { Button } from "@/components/ig/button";
import type { FormComponentProps, FormKey } from "./form-dialog-provider";

// The form contract types are defined next to the provider; re-exported for registry consumers.
export type { FormComponentProps, FormKey, FormParams } from "./form-dialog-provider";

/**
 * Registry formKey → form component, rendered by `FormDialogProvider` (modal) and by page
 * blocks (`variant: 'page'`).
 *
 * STUBS: task 21 replaces this whole file with the real forms (drawing, callback, sample, load,
 * contacts, full). Keep the export name and the `Record<FormKey, …>` shape.
 */

function createStubForm(key: FormKey): ComponentType<FormComponentProps> {
  function StubForm({ onClose, variant }: FormComponentProps) {
    return (
      <div className="flex flex-col gap-4">
        <p className="ig-body text-text-2 m-0">Форма «{key}» появится на следующем этапе</p>
        {variant === "modal" ? (
          <div>
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  StubForm.displayName = `StubForm(${key})`;
  return StubForm;
}

export const FORM_REGISTRY: Record<FormKey, ComponentType<FormComponentProps>> = {
  drawing: createStubForm("drawing"),
  callback: createStubForm("callback"),
  sample: createStubForm("sample"),
  load: createStubForm("load"),
  contacts: createStubForm("contacts"),
  full: createStubForm("full"),
};
