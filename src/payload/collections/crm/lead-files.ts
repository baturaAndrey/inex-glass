import path from "node:path";
import { getEnv } from "@/lib/env";
import { adminOrManagerFieldAccess, isAdmin, isAdminOrManager } from "@/payload/access";
import { rel } from "@/payload/slugs";
import { LEAD_FILE_KINDS, LEAD_FILE_SOURCES, toOptions } from "./constants";
import { systemOnly } from "./field-access";
import { enforceUploadPolicy } from "./upload-hooks";
import { LEAD_FILE_POLICY, payloadMimeTypes, setDownloadOnlyHeaders } from "./upload-policy";
import type { CollectionConfig } from "payload";

/**
 * Private lead attachments (drawings DWG/DXF/PDF, quiz photos).
 *
 * Stored on disk under `${UPLOADS_DIR}/leads` (absolute path; the Docker volume in prod).
 * Only PDF/PNG/JPEG/DWG/DXF are accepted: Payload's `mimeTypes` plus `enforceUploadPolicy`
 * (extension allow-list, MIME per extension, magic bytes; the vague browser types of DWG/DXF are
 * replaced by a canonical one). Read access is staff-only, so Payload's file route never serves
 * these files anonymously, and it always answers as a download (`attachment`, `nosniff`, sandbox
 * CSP), so a disguised HTML file cannot run in the site origin. Regular downloads go through
 * task 17's protected route. Size limit: global `upload.limits.fileSize` in `payload.config.ts`.
 */
export const LeadFiles: CollectionConfig = {
  slug: "lead-files",
  labels: { singular: "Файл заявки", plural: "Файлы заявок" },
  admin: {
    group: "Заявки",
    useAsTitle: "originalName",
    defaultColumns: ["originalName", "kind", "source", "lead", "createdAt"],
  },
  access: {
    read: isAdminOrManager,
    create: isAdminOrManager,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: path.resolve(getEnv().UPLOADS_DIR, "leads"),
    filesRequiredOnCreate: true,
    disableLocalStorage: false,
    mimeTypes: payloadMimeTypes(LEAD_FILE_POLICY),
    modifyResponseHeaders: ({ headers }) => setDownloadOnlyHeaders(headers),
  },
  hooks: {
    beforeValidate: [enforceUploadPolicy(LEAD_FILE_POLICY)],
  },
  fields: [
    {
      name: "lead",
      type: "relationship",
      label: "Заявка",
      relationTo: rel("leads"),
      index: true,
    },
    {
      name: "originalName",
      type: "text",
      label: "Исходное имя файла",
      access: { read: adminOrManagerFieldAccess },
    },
    {
      name: "kind",
      type: "select",
      label: "Тип",
      options: toOptions(LEAD_FILE_KINDS),
      access: { read: adminOrManagerFieldAccess },
    },
    {
      name: "source",
      type: "select",
      label: "Источник",
      options: toOptions(LEAD_FILE_SOURCES),
      access: { read: adminOrManagerFieldAccess },
    },
    {
      name: "sha256",
      type: "text",
      label: "SHA-256",
      access: { read: adminOrManagerFieldAccess, ...systemOnly },
      admin: { readOnly: true },
    },
    {
      name: "sizeBytes",
      type: "number",
      label: "Размер, байт",
      access: { read: adminOrManagerFieldAccess, ...systemOnly },
      admin: { readOnly: true },
    },
  ],
};
