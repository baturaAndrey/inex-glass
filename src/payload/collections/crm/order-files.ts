import path from "node:path";
import { getEnv } from "@/lib/env";
import { isAdmin, isAdminOrManager } from "@/payload/access";
import { relationId } from "@/payload/hooks/lead-hooks";
import { rel } from "@/payload/slugs";
import { ORDER_FILE_KINDS, toOptions } from "./constants";
import { systemOnly } from "./field-access";
import { enforceUploadPolicy } from "./upload-hooks";
import { ORDER_FILE_POLICY, payloadMimeTypes, setDownloadOnlyHeaders } from "./upload-policy";
import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

const THUMBNAIL_WIDTH = 400;
const PREVIEW_WIDTH = 1600;

/** Records who uploaded the file (staff user from the admin; empty for Local API jobs). */
const setUploadedBy: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== "create" || !data || relationId(data.uploadedBy)) return data;
  const userId = relationId(req.user);
  return userId ? { ...data, uploadedBy: userId } : data;
};

/**
 * Private order files: packing photos and documents (ТЗ §6.2).
 *
 * Stored under `${UPLOADS_DIR}/orders`. Staff-only read access keeps Payload's file route closed;
 * clients get files only through `/zakaz/<token>/docs/<id>/` (task 33). Same upload hardening as
 * `lead-files`: allow-list with magic bytes, download-only headers on Payload's file route.
 */
export const OrderFiles: CollectionConfig = {
  slug: "order-files",
  labels: { singular: "Файл заказа", plural: "Файлы заказов" },
  admin: {
    group: "Заказы",
    useAsTitle: "filename",
    defaultColumns: ["filename", "kind", "caption", "uploadedBy", "createdAt"],
  },
  access: {
    read: isAdminOrManager,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdmin,
  },
  upload: {
    staticDir: path.resolve(getEnv().UPLOADS_DIR, "orders"),
    mimeTypes: payloadMimeTypes(ORDER_FILE_POLICY),
    modifyResponseHeaders: ({ headers }) => setDownloadOnlyHeaders(headers),
    imageSizes: [
      { name: "thumbnail", width: THUMBNAIL_WIDTH },
      { name: "preview", width: PREVIEW_WIDTH },
    ],
    adminThumbnail: "thumbnail",
  },
  hooks: {
    beforeValidate: [enforceUploadPolicy(ORDER_FILE_POLICY)],
    beforeChange: [setUploadedBy],
  },
  fields: [
    { name: "kind", type: "select", label: "Вид", options: toOptions(ORDER_FILE_KINDS) },
    { name: "caption", type: "text", label: "Подпись" },
    {
      name: "uploadedBy",
      type: "relationship",
      label: "Загрузил",
      relationTo: rel("users"),
      access: systemOnly,
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
};
