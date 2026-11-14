import { CLIENTS_HUB_PATH } from "@/components/clients/copy";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { redirectIfExists } from "@/lib/cms/queries";
import { loadServicePage } from "@/lib/service/service-page";
import { ClientsHubPage } from "./clients-hub-template";
import { ClientsSegmentPage } from "./clients-segment-template";

/**
 * `pages` documents with the template «Сегмент» (the «Клиентам» section): the hub `/klientam/`
 * renders the hub layout, every other one the segment-page layout (Paper mockups
 * `2560_klientam` / `2560_klientam_podryadchikam`).
 */
export async function ClientsPage({ path }: { path: string }) {
  const data = await loadServicePage(path);
  if (!data) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }
  return data.path === CLIENTS_HUB_PATH ? (
    <ClientsHubPage data={data} />
  ) : (
    <ClientsSegmentPage data={data} />
  );
}
