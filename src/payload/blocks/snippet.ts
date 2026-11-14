import { text as validateText } from "payload/shared";
import { scopedDbName } from "../fields/db-name";
import { relGlobal } from "../slugs";
import { sectionFields } from "./_section";
import type { Block, TextFieldSingleValidation } from "payload";

type SnippetsGlobal = { items?: { key?: unknown }[] | null } | null;

/** The key must exist in the `snippets` global (`items[].key`). */
const validateSnippetKey: TextFieldSingleValidation = async (value, options) => {
  const base = await validateText(value, options);
  if (base !== true) return base;
  if (!value) return "Укажите ключ фрагмента";

  const { req } = options;
  let snippets: SnippetsGlobal;
  try {
    snippets = (await req.payload.findGlobal({
      slug: relGlobal("snippets"),
      depth: 0,
      overrideAccess: true,
      req,
    })) as SnippetsGlobal;
  } catch {
    return "Не удалось проверить ключ: справочник «Фрагменты» недоступен";
  }

  const exists = (snippets?.items ?? []).some((item) => item.key === value);
  return exists ? true : `Фрагмент «${value}» не найден в справочнике «Фрагменты»`;
};

/** Reusable fragment from the `snippets` global (samples, inex.su bridge…). */
export const SnippetBlock: Block = {
  slug: "snippet",
  dbName: scopedDbName("blk_snippet"),
  interfaceName: "SnippetBlock",
  labels: { singular: "Фрагмент", plural: "Фрагменты" },
  fields: [
    ...sectionFields(),
    {
      name: "snippetKey",
      type: "text",
      label: "Ключ фрагмента",
      required: true,
      validate: validateSnippetKey,
      admin: { description: "Ключ из справочника «Фрагменты», напр. samples." },
    },
  ],
};
