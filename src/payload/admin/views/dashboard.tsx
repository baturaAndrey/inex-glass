import { DefaultDashboard } from "@payloadcms/next/views";
import type { DashboardViewServerProps } from "@payloadcms/next/views";

/**
 * Admin dashboard (`admin.components.views.dashboard`). Stub: renders Payload's default
 * dashboard until task 04 replaces the body (the export name and path are a contract with
 * `payload.config.ts`).
 */
export function InexDashboard(props: DashboardViewServerProps) {
  return <DefaultDashboard {...props} />;
}
