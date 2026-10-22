import type { ComponentProps } from "react";
import { DefaultNav } from "@payloadcms/next/rsc";

/**
 * Admin sidebar (`admin.components.Nav`). Stub: renders Payload's default nav until task 03
 * replaces the body (the export name and path are a contract with `payload.config.ts`).
 */
export function InexNav(props: ComponentProps<typeof DefaultNav>) {
  return <DefaultNav {...props} />;
}
