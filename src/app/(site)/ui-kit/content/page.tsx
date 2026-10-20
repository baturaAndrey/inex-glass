import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Clock, FileText, Ruler } from "lucide-react";
import { Badge } from "@/components/ig/badge";
import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Callout } from "@/components/ig/callout";
import { Card } from "@/components/ig/card";
import { Compare } from "@/components/ig/compare";
import { DataTable, type DataTableColumn } from "@/components/ig/data-table";
import { Placeholder } from "@/components/ig/placeholder";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import { StatsTiles } from "@/components/ig/stats-tiles";
import { Steps } from "@/components/ig/steps";
import { Terms } from "@/components/ig/terms";
import { TextLink } from "@/components/ig/text-link";
import { ThickCard } from "@/components/ig/thick-card";
import { Timeline, type TimelineStep } from "@/components/ig/timeline";
import { getEnv } from "@/lib/env";
import { ContentDemo } from "./content-demo";
import type { Metadata } from "next";

/**
 * Internal catalog of the content primitives (task-13) for visual checks at 375 / 1366 / 1920.
 * Not a public page: 404 when SITE_ENV=production, never indexed. Sample texts come from
 * the prototypes (`Tables`, `Cards`, `Patterns`, `Home`, `Order`).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI kit — контент",
  robots: { index: false, follow: false },
};

const THICKNESS_COLUMNS: DataTableColumn[] = [
  { key: "mm", label: "Толщина" },
  { key: "price", label: "Цена, от", numeric: true },
  { key: "weight", label: "Вес", numeric: true },
  { key: "size", label: "Размеры", numeric: true },
];

const THICKNESS_ROWS = [
  { mm: <b>4 мм</b>, price: <b>от 700 ₽/м²</b>, weight: "10 кг/м²", size: "[мин.–макс. размер]" },
  { mm: <b>6 мм</b>, price: "[цена]", weight: "15 кг/м²", size: "[мин.–макс. размер]" },
  { mm: <b>8 мм</b>, price: "[цена]", weight: "20 кг/м²", size: "[мин.–макс. размер]" },
  {
    mm: <b>10 мм</b>,
    price: <b>от 1 400 ₽/м²</b>,
    weight: "25 кг/м²",
    size: "150 × 300 – 3000 × 2000 мм",
  },
  { mm: <b>15 мм</b>, price: "По запросу", weight: "37,5 кг/м²", size: "[мин.–макс. размер]" },
];

const NEIGHBOUR_COLUMNS: DataTableColumn[] = [
  { key: "param", label: "Параметр" },
  { key: "t8", label: "8 мм", align: "center", numeric: true },
  { key: "t10", label: "10 мм", align: "center", numeric: true },
  { key: "t12", label: "12 мм", align: "center", numeric: true },
];

const NEIGHBOUR_ROWS = [
  { param: "Вес, кг/м²", t8: "20", t10: "25", t12: "30" },
  { param: "Макс. размер, мм", t8: "[…]", t10: "3000 × 2000", t12: "[…]" },
  { param: "Мин. отверстие, мм", t8: "8", t10: "10", t12: "12" },
];

const COMPARE_TOPIC_ROWS = [
  {
    topic: "Чертёж",
    self: "Чертёж уходит на завод как есть",
    inex: "Инженер проверяет чертёж до размещения заказа",
  },
  {
    topic: "Упаковка",
    self: "Упаковку не видите до приезда машины",
    inex: "Контролируем упаковку, присылаем фото при отгрузке",
  },
  {
    topic: "Цена",
    self: "Цена может измениться после запуска",
    inex: "Цена фиксируется в договоре",
  },
  {
    topic: "Документы",
    self: "Документы собираете сами",
    inex: "Паспорт и ГОСТ 30698 на каждую партию",
  },
];

const COMPARE_ROWS = COMPARE_TOPIC_ROWS.map(({ self, inex }) => ({ self, inex }));

const TERMS = [
  { text: "Заказы от 50 м²" },
  { text: "Срок от 10 рабочих дней с даты договора" },
  { text: "КП в среднем за 2–3 рабочих дня" },
  { text: "Цена в договоре фиксируется" },
];

const TERMS_WITH_ICONS = [
  { icon: <Ruler aria-hidden="true" />, text: "Заказы от 50 м²" },
  { icon: <Clock aria-hidden="true" />, text: "Срок от 10 рабочих дней" },
  { icon: <FileText aria-hidden="true" />, text: "Паспорт и ГОСТ 30698" },
];

const STEPS = [
  { title: "Отправляете чертёж", text: "DWG, DXF или PDF" },
  { title: "Проверяем чертёж", text: "Отверстия, кромки, допуски" },
  { title: "Присылаем КП", text: "В среднем за 2–3 рабочих дня" },
  { title: "Договор", text: "Цена фиксируется" },
  { title: "Производство и упаковка", text: "От 10 рабочих дней" },
  { title: "Отгрузка на объект", text: "Фото упаковки и накладная" },
];

const STATS = [
  { value: "21 год", text: "опыт специалистов Inex" },
  { value: "1500+", text: "проектов по всей России" },
  { value: "4–19 мм", text: "толщины закалённого стекла" },
];

const ORDER_TITLES = [
  "Спецификация согласована",
  "В производстве",
  "Упаковано",
  "Отгружено",
  "Получено",
] as const;

/** Five order steps with the first `doneCount` done and the next one current. */
function orderSteps(doneCount: number, dates: string[]): TimelineStep[] {
  return ORDER_TITLES.map((title, index) => ({
    key: title,
    title,
    state: index < doneCount ? "done" : index === doneCount ? "current" : "todo",
    ...(dates[index] ? { date: dates[index] } : {}),
  }));
}

function DemoSection({
  id,
  title,
  variant = "bg",
  children,
}: {
  id: string;
  title: string;
  variant?: SectionVariant;
  children: ReactNode;
}) {
  return (
    <Section id={id} variant={variant} aria-labelledby={`${id}-h`}>
      <SectionHead title={title} headingId={`${id}-h`} />
      <div className="flex flex-col gap-10">{children}</div>
    </Section>
  );
}

function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="ig-label m-0">{label}</p>
      {children}
    </div>
  );
}

export default function UiKitContentPage() {
  if (getEnv().SITE_ENV === "production") notFound();

  return (
    <>
      <DemoSection id="kit-badges" title="Бейджи и хлебные крошки" variant="sf">
        <Demo label="Badge: promo / success / info / promo plain">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="promo">Акция</Badge>
            <Badge variant="success">Получено</Badge>
            <Badge variant="info">В производстве</Badge>
            <Badge variant="promo" plain>
              −5% на закалённое стекло при заказе от 100 м²
            </Badge>
          </div>
        </Demo>
        <Demo label="Breadcrumbs: ссылки, некликабельный пункт, текущая страница">
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Закалённое стекло", href: "/zakalennoe-steklo/" },
              { label: "Закалённое стекло 10 мм" },
            ]}
          />
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Инструменты" },
              { label: "Калькулятор веса стекла для остекления фасадов и перегородок" },
            ]}
          />
        </Demo>
      </DemoSection>

      <DemoSection id="kit-tables" title="Таблицы фактов">
        <Demo label="DataTable: строки-ссылки, текущая толщина (≤599 — карточки)">
          <p className="ig-small ig-muted m-0">
            Ориентировочная цена на 01.11.2026. Точная стоимость — в КП.
          </p>
          <DataTable
            caption="Толщины закалённого стекла: цена, вес, размеры"
            columns={THICKNESS_COLUMNS}
            rows={THICKNESS_ROWS}
            highlightRow={3}
            rowHref={(_row, index) =>
              `/zakalennoe-steklo/${["4", "6", "8", "10", "15"][index] ?? "10"}-mm/`
            }
          />
        </Demo>
        <Demo label="DataTable: подсвеченная колонка, mobile=scroll">
          <DataTable
            caption="Соседние толщины"
            columns={NEIGHBOUR_COLUMNS}
            rows={NEIGHBOUR_ROWS}
            highlightColumn="t10"
            mobile="scroll"
          />
        </Demo>
      </DemoSection>

      <DemoSection id="kit-compare" title="Сравнение «сами / через Inex Glass»" variant="sf">
        <Demo label="Compare без topic (2 колонки, ≤760 — пары)">
          <Compare rows={COMPARE_ROWS} />
        </Demo>
        <Demo label="Compare с topic (Home, блок 2)">
          <div className="rounded-xl bg-[linear-gradient(135deg,#5A968E_0%,#A9CBC5_42%,#C9DEDA_58%,#6FA39B_100%)] p-10 max-md:p-6 max-sm:p-4">
            <Compare rows={COMPARE_TOPIC_ROWS} />
          </div>
        </Demo>
      </DemoSection>

      <DemoSection id="kit-terms" title="Условия и callout">
        <Demo label="Terms: bar / plain с иконками">
          <Terms items={TERMS} />
          <Terms items={TERMS_WITH_ICONS} variant="plain" />
        </Demo>
        <Demo label="Callout: warning со списком / info с текстом">
          <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
            <Callout
              title="Что важно знать до заказа"
              items={[
                "После закалки стекло нельзя резать и сверлить",
                "Отверстия и вырезы — только по чертежу",
                "Размеры проёма снимаются после чистовой отделки",
              ]}
            />
            <Callout variant="info" title="ГОСТ-справка">
              <p>
                Отверстие — не ближе 2t к кромке и между отверстиями, 6t от угла. Для 10 мм: 20 мм,
                20 мм и 60 мм. Минимальный диаметр — 10 мм.
              </p>
            </Callout>
          </div>
        </Demo>
      </DemoSection>

      <DemoSection id="kit-steps" title="Шаги и статистика" variant="sf">
        <Demo label="Steps (6 → 3 при ≤1365 → список при ≤599)">
          <div className="bg-surface shadow-card rounded-xl p-9 max-sm:p-5">
            <Steps steps={STEPS} />
          </div>
        </Demo>
        <Demo label="StatsTiles в контенте">
          <StatsTiles items={STATS} />
        </Demo>
        <Demo label="StatsTiles glass — только hero главной">
          <div className="rounded-xl bg-[linear-gradient(120deg,#B9CEC9_0%,#DCE6E3_45%,#A9C2BD_100%)] p-5">
            <StatsTiles items={STATS} glass />
          </div>
        </Demo>
      </DemoSection>

      <DemoSection id="kit-timeline" title="Таймлайн заказа">
        <Demo label="responsive: «В производстве» (≥600 горизонтально, ≤599 вертикально)">
          <Timeline steps={orderSteps(1, ["28.10.2026", "с 30.10.2026", "—", "план 15.11", "—"])} />
        </Demo>
        <Demo label="horizontal: «Отгружено»">
          <Timeline
            orientation="horizontal"
            steps={orderSteps(3, [
              "28.10.2026",
              "30.10.2026",
              "14.11.2026",
              "15.11.2026",
              "план 18.11",
            ])}
          />
        </Demo>
        <Demo label="vertical: всё выполнено">
          <div className="max-w-md">
            <Timeline
              orientation="vertical"
              steps={orderSteps(5, [
                "28.10.2026",
                "30.10.2026",
                "14.11.2026",
                "15.11.2026",
                "18.11.2026",
              ])}
            />
          </div>
        </Demo>
      </DemoSection>

      <DemoSection id="kit-cards" title="Карточки" variant="sf">
        <Demo label="Card: раздел с ценой / ссылка / без ссылки / статья 16:9">
          <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4">
            <Card
              href="/zakalennoe-steklo/"
              image={<Placeholder />}
              title="Закалённое стекло"
              sub="4–19 мм по вашим размерам"
              footer={
                <span className="flex flex-col gap-0.5">
                  <span className="ig-price-m">от 700 ₽/м²</span>
                  <span className="ig-micro ig-muted">ориентировочная цена на 01.11.2026</span>
                </span>
              }
            />
            <Card
              href="/tripleks/"
              image={<Placeholder />}
              title="Триплекс"
              sub="Закалённый, для ограждений и козырьков"
            />
            <Card
              image={<Placeholder label="фото объекта" />}
              title="ТРЦ «Алмаз»"
              sub="Челябинск · торговый центр"
            >
              <div className="ig-chips mt-2">
                <span className="ig-chip ig-chip--static">закалённый триплекс 8+8</span>
                <span className="ig-chip ig-chip--static">осветлённое 12 мм</span>
              </div>
            </Card>
            <Card
              href="/blog/"
              image={<Placeholder ratio="16/9" label="иллюстрация" />}
              eyebrow="Статья"
              title="Можно ли резать закалённое стекло"
              arrow={false}
            />
          </div>
        </Demo>
        <Demo label="ThickCard: с ценой / «Цена по расчёту»">
          <div className="grid max-w-[640px] grid-cols-2 gap-5 max-sm:grid-cols-1">
            <ThickCard
              mm={10}
              href="/zakalennoe-steklo/10-mm/"
              priceLabel="от 1 400 ₽/м²"
              note="ориентировочная цена на 15.10.2026"
              specs={[
                { label: "Вес", value: "25 кг/м²" },
                { label: "Размеры", value: "до 3000 × 2000 мм" },
              ]}
            />
            <ThickCard
              mm={19}
              href="/zakalennoe-steklo/19-mm/"
              priceLabel="Цена по расчёту"
              note="пришлём в КП за 2–3 рабочих дня"
              specs={[
                { label: "Вес", value: "47,5 кг/м²" },
                { label: "Размеры", value: "[макс. размер]" },
              ]}
            />
          </div>
        </Demo>
        <Demo label="Placeholder: 4/3, 16/9, произвольный 16/10">
          <div className="grid grid-cols-3 gap-6 max-sm:grid-cols-1">
            <Placeholder className="rounded-lg" />
            <Placeholder ratio="16/9" label="иллюстрация" className="rounded-lg" />
            <Placeholder ratio="16/10" className="rounded-lg" />
          </div>
        </Demo>
      </DemoSection>

      <ContentDemo />

      <Section variant="sf" aria-label="Навигация по UI kit">
        <TextLink href="/ui-kit/" variant="arrow">
          Базовые компоненты UI kit
        </TextLink>
      </Section>
    </>
  );
}
