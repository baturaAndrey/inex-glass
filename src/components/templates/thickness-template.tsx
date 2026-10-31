import { cache, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { FormSection } from "@/components/forms/form-section";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { Faq } from "@/components/ig/faq";
import { PageHero } from "@/components/ig/page-hero";
import type { SectionVariant } from "@/components/ig/section";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import type { QuizPrefill } from "@/components/page/quiz-cta";
import { RichText } from "@/components/rich-text/rich-text";
import { CtParagraph, CtSection } from "@/components/zak-hub/ct-cards-section";
import { getConditions, getPlaceholderContext, getPrices, getTechLimits } from "@/lib/cms/globals";
import { getThicknessByN, getThicknessGroups, redirectIfExists } from "@/lib/cms/queries";
import { priceState, replacePlaceholders, THICKNESSES } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { faqLd, JsonLd, thicknessProductLd } from "@/lib/seo/jsonld";
import { buildMetadata, resolveH1 } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import { buildThicknessView, thicknessHref, thicknessLabel } from "@/lib/thickness-view";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Thickness, ThicknessGroup } from "@/payload-types";
import { HolesRules } from "./thickness/holes-rules";
import { Neighbors } from "./thickness/neighbors";
import { Passport } from "./thickness/passport";
import type { Metadata } from "next";

/**
 * Thickness card `/zakalennoe-steklo/{N}-mm/` (`Thick10.dc.html`, `Thick19.dc.html`): one
 * template for 4, 5, 6, 8, 10, 12, 15 and 19 mm. Texts of the template are teksty/03; the
 * group texts (selection, processing, FAQ) come from `thickness-groups` unless the thickness
 * overrides them; prices, weights and hole distances come from the domain library.
 *
 * The 45-day rule decides the price, the title (`seo.title` ↔ `seo.titleNoPrice`) and the
 * Product JSON-LD; the page is ISR (`revalidate` of the route) so it follows the date.
 */

/** `^(4|5|6|8|10|12|15|19)-mm$` — anything else (`7-mm`, `010-mm`, `10-MM`) is not a card. */
const SLUG_PATTERN = new RegExp(`^(${THICKNESSES.join("|")})-mm$`);

/** `10-mm` → 10; `null` for any other slug. */
export function parseThicknessSlug(slug: string): number | null {
  const match = SLUG_PATTERN.exec(slug);
  return match ? Number(match[1]) : null;
}

/** Template copy (teksty/03). */
const TEXT = {
  h1: (n: number) => `Закалённое стекло ${n} мм`,
  includedTitle: "Что входит в цену",
  included: (n: number) =>
    `В цену «от» входят стекло толщиной ${n} мм, закалка и проверка параметров заказа. Отдельно считаются фигурная резка, обработка кромки и фацет, отверстия и вырезы, печать и матирование. Точная стоимость — в КП; цена в договоре фиксируется.`,
  podborTitle: "Подберём толщину под вашу нагрузку",
  podborAsk:
    "Опишите конструкцию — размер стекла, способ крепления, назначение, — и мы подберём толщину или схему триплекса.",
  podborButton: "Подобрать под нагрузку",
  obrabotkaTitle: (n: number) => `Обработка стекла ${n} мм`,
  holesTitle: (n: number) => `Отверстия в стекле ${n} мм — по ГОСТ 30698-2014`,
  neighborsTitle: "Соседние толщины",
  faqTitle: "Частые вопросы",
  drawingButton: "Загрузить чертёж",
  quizButton: (n: number) => `Рассчитать стекло ${n} мм`,
} as const;

const sourceOf = (n: number) => `thickness-${n}`;

/** Per-request memo: metadata and the page resolve the same thickness. */
const loadThickness = cache(async (n: number) => {
  const doc = await getThicknessByN(n);
  if (!doc) return null;
  // The group is read from its own (tagged) list, so edits of the group texts expire the card.
  const groupId = typeof doc.group === "string" ? doc.group : doc.group?.id;
  const groups = await getThicknessGroups({ depth: 0 });
  const group =
    groups.find((item) => item.id === groupId) ??
    (typeof doc.group === "object" ? doc.group : null);
  return { doc, group };
});

function ogImageOf(doc: Thickness): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([doc.seo?.ogImage]);
}

export async function generateThicknessMetadata(n: number): Promise<Metadata> {
  const loaded = await loadThickness(n);
  if (!loaded) return NOT_FOUND_METADATA;
  const { doc } = loaded;
  const placeholders = await getPlaceholderContext({ thickness: n });
  const state = priceState(n, placeholders.prices, placeholders.now);
  return buildMetadata({
    seo: {
      ...doc.seo,
      title: (state === "price" ? doc.seo?.title : doc.seo?.titleNoPrice) ?? null,
    },
    path: doc.path || thicknessHref(n),
    fallbackTitle: resolveH1(doc.seo, TEXT.h1(n), placeholders),
    placeholders,
    image: ogImageOf(doc),
    // 5, 15 and 19 mm (and any card switched off by an editor): noindex, follow.
    forceNoindex: doc.indexable === false,
  });
}

interface TemplateSection {
  key: string;
  heading: string;
  content: ReactNode;
}

type FaqItems = NonNullable<ThicknessGroup["faq"]>;

/** FAQ of the card: its own override, otherwise the group questions. */
function faqItems(doc: Thickness, group: ThicknessGroup | null): FaqItems {
  const own = (doc.faqOverride ?? []).filter((item) => item.question.trim() !== "");
  if (own.length > 0) return own;
  return (group?.faq ?? []).filter((item) => item.question.trim() !== "");
}

/** Rhythm of the template sections after the hero (which is `bg`). */
const variantAt = (index: number): SectionVariant => (index % 2 === 0 ? "sf" : "bg");

export async function ThicknessPage({ n }: { n: number }) {
  const loaded = await loadThickness(n);
  const path = thicknessHref(n);
  if (!loaded) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }
  const { doc, group } = loaded;
  const [ctx, pricesDoc, conditions, limits] = await Promise.all([
    getPlaceholderContext({ thickness: n }),
    getPrices(),
    getConditions(),
    getTechLimits(),
  ]);
  const pagePath = doc.path || path;
  const view = buildThicknessView({
    n,
    doc,
    prices: ctx.prices,
    promo: ctx.promo,
    conditions,
    now: ctx.now,
    captionTemplate: pricesDoc?.caption,
    limits,
  });

  const h1 = resolveH1(doc.seo, TEXT.h1(n), ctx);
  const prefill: QuizPrefill = {
    ...doc.quizPrefill,
    type: doc.quizPrefill?.type ?? "tempered",
    thickness: n,
    ctaLabel: doc.quizPrefill?.ctaLabel || TEXT.quizButton(n),
  };
  const podbor = doc.podborOverride ?? group?.podborText ?? null;
  const obrabotka = doc.obrabotkaOverride ?? group?.obrabotkaText ?? null;
  const faq = faqItems(doc, group);
  const minOrder = conditions?.minOrderText?.trim();

  const productLd = view.showProductJsonLd
    ? thicknessProductLd({
        thickness: n,
        prices: ctx.prices,
        now: ctx.now,
        name: h1,
        url: pagePath,
        description: replacePlaceholders(doc.seo?.description ?? "", ctx).trim() || null,
      })
    : null;
  const faqJsonLd = faqLd(
    faq.map((item) => ({
      question: replacePlaceholders(item.question, ctx),
      answer: replacePlaceholders(lexicalToPlainText(item.answer), ctx),
    }))
  );

  const sections: TemplateSection[] = [
    {
      key: "included",
      heading: TEXT.includedTitle,
      content: <CtParagraph>{TEXT.included(n)}</CtParagraph>,
    },
    {
      key: "podbor",
      heading: TEXT.podborTitle,
      content: (
        <>
          {podbor ? <ThicknessRichText data={podbor} ctx={ctx} /> : null}
          <CtParagraph className="mt-4">{TEXT.podborAsk}</CtParagraph>
          <FormTrigger
            formKey="load"
            params={{ label: TEXT.podborButton, source: sourceOf(n), thickness: n }}
            asChild
          >
            <Button variant="secondary">{TEXT.podborButton}</Button>
          </FormTrigger>
        </>
      ),
    },
    ...(obrabotka
      ? [
          {
            key: "obrabotka",
            heading: TEXT.obrabotkaTitle(n),
            content: <ThicknessRichText data={obrabotka} ctx={ctx} />,
          },
        ]
      : []),
    {
      key: "holes",
      heading: TEXT.holesTitle(n),
      content: <HolesRules view={view} holes={limits.holes} />,
    },
    { key: "neighbors", heading: TEXT.neighborsTitle, content: <Neighbors view={view} /> },
    ...(faq.length > 0
      ? [
          {
            key: "faq",
            heading: TEXT.faqTitle,
            content: (
              <Faq
                className="max-w-[1100px]"
                items={faq.map((item) => ({
                  question: replacePlaceholders(item.question, ctx),
                  answer: <RichText data={item.answer} ctx={ctx} />,
                }))}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <PageShell path={pagePath} lastLabel={thicknessLabel(n)} quiz={false}>
      <JsonLd data={[productLd, faqJsonLd]} />
      <PageHero
        variant="ct-hero"
        title={h1}
        facts={minOrder ? withPeriod(minOrder) : undefined}
        actions={
          <FormTrigger
            formKey="drawing"
            params={{ label: TEXT.drawingButton, source: sourceOf(n) }}
            asChild
          >
            <Button size="l" leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}>
              {TEXT.drawingButton}
            </Button>
          </FormTrigger>
        }
        aside={<Passport view={view} prefill={prefill} src={pagePath} ctx={ctx} />}
      >
        <p
          aria-hidden="true"
          className="text-primary-dark m-0 mt-2 text-[120px] leading-[0.9] font-bold tracking-[-0.03em] tabular-nums max-sm:text-[72px]"
        >
          {n}
          <small className="text-text-2 ml-2 text-[40px] font-medium tracking-normal max-sm:text-[28px]">
            мм
          </small>
        </p>
      </PageHero>

      {sections.map((section, index) => (
        <CtSection
          key={section.key}
          variant={variantAt(index)}
          id={section.key === "faq" ? "faq" : undefined}
          headingId={`th-${section.key}-title`}
          heading={section.heading}
          data-section={section.key}
        >
          {section.content}
        </CtSection>
      ))}

      <RenderBlocks
        blocks={doc.layout}
        ctx={ctx}
        page={{ path: pagePath, title: h1, quizPrefill: doc.quizPrefill }}
      />

      <FormSection formKey="full" source={sourceOf(n)} />
    </PageShell>
  );
}

/** Group / override texts: `{N}`, `{2N}`, `{вес}` … substituted with the card thickness. */
function ThicknessRichText({
  data,
  ctx,
}: {
  data: NonNullable<ThicknessGroup["podborText"]>;
  ctx: PlaceholderContext;
}) {
  return (
    <RichText
      data={data}
      ctx={ctx}
      className="text-ink-3 max-w-[880px] text-[17px] leading-[1.6] max-sm:text-base [&_p]:max-w-none"
    />
  );
}

const withPeriod = (text: string) => (/[.!?…]$/u.test(text) ? text : `${text}.`);
