"use client";

import {
  useConfig,
  useDocumentInfo,
  useDocumentTitle,
  useFieldPath,
  useFormFields,
} from "@payloadcms/ui";
import { SEO_DESCRIPTION_SOFT_LIMIT, SEO_TITLE_SOFT_LIMIT } from "@/payload/fields/seo";
import { buildSnippet, clipForSnippet } from "./snippet";

/**
 * ui-field `seo.seoSnippet` — how the document looks in search results (task 07): URL line,
 * title (`seo.title`, or the document title + « | Inex Glass» as on the site), description or a
 * hint, noindex and placeholder notes. Updates while the editor types.
 */

/** Form path of the group that holds this ui-field: `seo.seoSnippet` → `seo`. */
const parentPath = (path: string): string => path.split(".").slice(0, -1).join(".");

const fieldPath = (parent: string, name: string): string => (parent ? `${parent}.${name}` : name);

const asText = (value: unknown): string | null => (typeof value === "string" ? value : null);

export function SeoSnippetPreview({ path: pathFromProps }: { path?: string | undefined }) {
  const pathFromContext = useFieldPath();
  const parent = parentPath(pathFromProps ?? pathFromContext ?? "");
  const { config, getEntityConfig } = useConfig();
  const { collectionSlug } = useDocumentInfo();
  const { title: documentTitle } = useDocumentTitle();

  // The live value of `useAsTitle` (the header title only follows it after a save).
  const useAsTitle = collectionSlug
    ? getEntityConfig({ collectionSlug })?.admin?.useAsTitle
    : undefined;

  const seoTitle = useFormFields(([fields]) => asText(fields[fieldPath(parent, "title")]?.value));
  const seoDescription = useFormFields(([fields]) =>
    asText(fields[fieldPath(parent, "description")]?.value)
  );
  const noindex = useFormFields(([fields]) => fields[fieldPath(parent, "noindex")]?.value === true);
  const docPath = useFormFields(([fields]) => asText(fields.path?.value));
  const liveTitle = useFormFields(([fields]) =>
    useAsTitle ? asText(fields[useAsTitle]?.value) : null
  );

  const snippet = buildSnippet({
    seoTitle,
    seoDescription,
    docTitle: liveTitle ?? documentTitle,
    path: docPath,
    origin: config.serverURL,
    noindex,
  });

  return (
    <div className="iga-snippet" data-testid="seo-snippet">
      <span className="iga-snippet__caption">Так страница выглядит в поиске</span>
      <span className="iga-snippet__url">{snippet.url}</span>
      <span className="iga-snippet__title">
        <span className="iga-snippet__title-text">
          {clipForSnippet(snippet.title, SEO_TITLE_SOFT_LIMIT)}
        </span>
        {snippet.titleIsFallback ? (
          <span className="iga-snippet__note"> (из названия страницы)</span>
        ) : null}
      </span>
      {snippet.description ? (
        <span className="iga-snippet__description">
          {clipForSnippet(snippet.description, SEO_DESCRIPTION_SOFT_LIMIT)}
        </span>
      ) : (
        <span className="iga-snippet__description iga-snippet__description--empty">
          Описание не заполнено — поисковик возьмёт текст со страницы
        </span>
      )}
      {snippet.noindex || snippet.hasPlaceholders ? (
        <span className="iga-snippet__flags">
          {snippet.noindex ? (
            <span className="iga-badge iga-badge--no">Закрыта от индексации</span>
          ) : null}
          {snippet.hasPlaceholders ? (
            <span className="iga-snippet__note">
              Метки в фигурных скобках ({"{N}"}, {"{цена}"}) подставляются на сайте
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
