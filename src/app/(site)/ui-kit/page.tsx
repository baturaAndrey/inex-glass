import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, Calculator, FileText, Phone, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { PageHero, PageHeroStat, PageHeroTerm } from "@/components/ig/page-hero";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";

/**
 * Internal catalog of the design system for visual checks (375 / 1366 / 1920).
 * Not a public page: 404 when SITE_ENV=production, never indexed.
 * Rendered per request because one Docker image serves both staging and prod.
 * NB: it shows all three hero variants, so unlike real pages it contains several <h1>.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "UI kit",
  robots: { index: false, follow: false },
};

type Swatch = { token: string; hex: string; className: string; note?: string };

/** Literal class names (Tailwind only sees complete strings in the source). */
const PALETTE: { group: string; swatches: Swatch[] }[] = [
  {
    group: "Бренд",
    swatches: [
      {
        token: "--ig-primary",
        hex: "#2B8C7E",
        className: "bg-(--ig-primary)",
        note: "рамки, фокус, иконки",
      },
      {
        token: "--ig-btn-primary-bg",
        hex: "#267D70",
        className: "bg-(--ig-btn-primary-bg)",
        note: "фон кнопки, 4.9:1",
      },
      {
        token: "--ig-btn-primary-bg-hover",
        hex: "#1F6B60",
        className: "bg-(--ig-btn-primary-bg-hover)",
      },
      {
        token: "--ig-primary-pressed",
        hex: "#1F6B60",
        className: "bg-(--ig-primary-pressed)",
        note: "ссылки",
      },
      { token: "--ig-primary-dark", hex: "#16403D", className: "bg-(--ig-primary-dark)" },
      { token: "--ig-primary-light", hex: "#EAF3F1", className: "bg-(--ig-primary-light)" },
      { token: "--ig-navy", hex: "#324B64", className: "bg-(--ig-navy)", note: "подвал" },
      { token: "--ig-on-navy-2", hex: "#C9D3DD", className: "bg-(--ig-on-navy-2)" },
    ],
  },
  {
    group: "Нейтральные",
    swatches: [
      { token: "--ig-bg", hex: "#F4F5F3", className: "bg-(--ig-bg)" },
      { token: "--ig-surface", hex: "#FFFFFF", className: "bg-(--ig-surface)" },
      { token: "--ig-well", hex: "#ECEEEC", className: "bg-(--ig-well)" },
      { token: "--ig-line", hex: "#D9DCDE", className: "bg-(--ig-line)" },
      { token: "--ig-hairline", hex: "#E6E8E6", className: "bg-(--ig-hairline)" },
      { token: "--ig-text", hex: "#1C1F22", className: "bg-(--ig-text)" },
      { token: "--ig-text-2", hex: "#5B636B", className: "bg-(--ig-text-2)" },
      {
        token: "--ig-text-muted",
        hex: "#9AA1A8",
        className: "bg-(--ig-text-muted)",
        note: "плейсхолдеры",
      },
    ],
  },
  {
    group: "Дополнительные (прототипы)",
    swatches: [
      { token: "--ig-tint-green", hex: "#EEF2F0", className: "bg-(--ig-tint-green)" },
      { token: "--ig-ink-2", hex: "#3E464D", className: "bg-(--ig-ink-2)" },
      { token: "--ig-ink-3", hex: "#2A2F34", className: "bg-(--ig-ink-3)" },
      { token: "--ig-line-teal", hex: "#CFE3DF", className: "bg-(--ig-line-teal)" },
      { token: "--ig-gray-1", hex: "#AEB4BA", className: "bg-(--ig-gray-1)" },
      { token: "--ig-gray-2", hex: "#BFC4C8", className: "bg-(--ig-gray-2)" },
      { token: "--ig-teal-wash", hex: "#DCEBE8", className: "bg-(--ig-teal-wash)" },
      { token: "--ig-slate-blue", hex: "#9FB0C2", className: "bg-(--ig-slate-blue)" },
    ],
  },
  {
    group: "Семантика",
    swatches: [
      { token: "--ig-success", hex: "#A8DAB4", className: "bg-(--ig-success)" },
      { token: "--ig-success-bg", hex: "#EEF8F0", className: "bg-(--ig-success-bg)" },
      { token: "--ig-success-text", hex: "#237A35", className: "bg-(--ig-success-text)" },
      { token: "--ig-warning", hex: "#F2D59C", className: "bg-(--ig-warning)" },
      { token: "--ig-warning-bg", hex: "#FCF6EA", className: "bg-(--ig-warning-bg)" },
      { token: "--ig-warning-text", hex: "#8A5A00", className: "bg-(--ig-warning-text)" },
      { token: "--ig-danger", hex: "#EAADAD", className: "bg-(--ig-danger)" },
      { token: "--ig-danger-bg", hex: "#FCEFEF", className: "bg-(--ig-danger-bg)" },
      { token: "--ig-danger-text", hex: "#B23B3B", className: "bg-(--ig-danger-text)" },
      { token: "--ig-info", hex: "#AECAE6", className: "bg-(--ig-info)" },
      { token: "--ig-info-bg", hex: "#EEF4FA", className: "bg-(--ig-info-bg)" },
      { token: "--ig-info-text", hex: "#2C5B86", className: "bg-(--ig-info-text)" },
    ],
  },
];

const TYPE_SCALE: { name: string; className: string; spec: string }[] = [
  { name: "H1", className: "ig-h1", spec: "700 54/1.1 · ≤599: 32/1.15" },
  { name: "H2", className: "ig-h2", spec: "700 40/1.15 · ≤599: 28/1.2" },
  { name: "H3", className: "ig-h3", spec: "700 32/1.2 · ≤599: 22/1.25" },
  { name: "H4", className: "ig-h4", spec: "600 24/1.3 · ≤599: 20/1.3" },
  { name: "H5", className: "ig-h5", spec: "600 18/1.4" },
  { name: "H6", className: "ig-h6", spec: "600 16/1.4" },
  { name: "Body", className: "ig-body", spec: "400 16/1.5" },
  { name: "Small", className: "ig-small", spec: "400 14/1.45" },
  { name: "Micro", className: "ig-micro", spec: "500 12/1.4" },
  { name: "Label", className: "ig-label", spec: "micro, uppercase" },
  { name: "Price L", className: "ig-price-l", spec: "700 30/1.1 · ≤599: 24" },
  { name: "Price M", className: "ig-price-m", spec: "700 22/1.15 · ≤599: 20" },
  { name: "Price S", className: "ig-price-s", spec: "700 16/1.3" },
  { name: "Stat", className: "ig-stat", spec: "700 48/1 · ≤599: 36" },
];

const BUTTON_VARIANTS = ["primary", "secondary", "ghost"] as const;
const BUTTON_SIZES = ["l", "m", "s"] as const;

const SECTION_VARIANTS: SectionVariant[] = ["bg", "sf", "dark", "primary-dark"];

const TERMS = [
  "Заказы от 50 м²",
  "Срок от 10 рабочих дней с даты договора",
  "КП в среднем за 2–3 рабочих дня",
  "Цена в договоре фиксируется",
];

function Crumbs({ items }: { items: string[] }) {
  return (
    <nav className="ig-crumbs" aria-label="Хлебные крошки">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item} className="contents">
            {index > 0 ? (
              <span className="ig-crumbs__sep" aria-hidden="true">
                /
              </span>
            ) : null}
            {isLast ? <span aria-current="page">{item}</span> : <a href="#">{item}</a>}
          </span>
        );
      })}
    </nav>
  );
}

function HeroActions({ size = "l" }: { size?: "l" | "m" }) {
  return (
    <>
      <Button size={size} leftIcon={<Calculator />}>
        Рассчитать стоимость
      </Button>
      <Button size={size} variant="secondary" leftIcon={<FileText />}>
        Отправить чертёж
      </Button>
    </>
  );
}

function Terms() {
  return TERMS.map((term) => <PageHeroTerm key={term}>{term}</PageHeroTerm>);
}

function KitBlock({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Section id={id} variant="sf" aria-labelledby={`${id}-h`} className="border-hairline border-t">
      <SectionHead title={title} headingId={`${id}-h`} />
      {children}
    </Section>
  );
}

export default function UiKitPage() {
  if (getEnv().SITE_ENV === "production") notFound();

  return (
    <>
      <PageHero
        variant="home"
        titleId="kit-hero-home"
        media={{
          src: "/images/hero-glass-temp.jpg",
          alt: "Пирамида с закалённым стеклом на складе",
        }}
        eyebrow={[
          "Комплектация проектов",
          "заводы-партнёры в России и Китае",
          "доставка по Уралу, Сибири и Поволжью",
        ]}
        title="Закалённое стекло и стеклянные конструкции для ваших проектов"
        lead="Подберём завод под задачу и срок, проверим чертёж и согласуем спецификацию до запуска, проконтролируем упаковку и отправим на объект."
        stats={
          <>
            <PageHeroStat
              value="21 год"
              text="изготавливаем и комплектуем стеклянные конструкции"
            />
            <PageHeroStat value="1500+" text="проектов по всей России" />
            <PageHeroStat value="4–19 мм" text="толщины закалённого стекла" />
          </>
        }
        terms={<Terms />}
        actions={<HeroActions />}
      />

      <PageHero
        variant="ct-hero"
        titleId="kit-hero-ct"
        breadcrumbs={<Crumbs items={["Главная", "Закалённое стекло", "10 мм"]} />}
        title="Закалённое стекло 10 мм"
        facts="По вашему чертежу DWG или DXF · толщина 4–19 мм · заказы от 50 м² · от 10 рабочих дней с даты договора"
        strong="Проверяем чертёж до закалки — после неё стекло уже не изменить."
        actions={<HeroActions />}
        aside={
          <aside
            aria-label="Паспорт толщины"
            className="bg-surface shadow-card-hover flex flex-col gap-5 rounded-xl p-8 max-sm:p-5"
          >
            <span className="ig-label">Паспорт толщины</span>
            <span className="ig-price-l">от 1 400 ₽/м²</span>
            <dl className="ig-small m-0 flex flex-col gap-2">
              <div className="flex justify-between gap-3">
                <dt className="text-text-2">Вес</dt>
                <dd className="m-0 font-medium">25 кг/м²</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-2">Стандарт</dt>
                <dd className="m-0 font-medium">ГОСТ 30698-2014</dd>
              </div>
            </dl>
            <Button size="l" block leftIcon={<Calculator />}>
              Рассчитать стоимость
            </Button>
          </aside>
        }
        terms={<Terms />}
      />

      <PageHero
        variant="p5-top"
        titleId="kit-hero-p5"
        breadcrumbs={<Crumbs items={["Главная", "Стеклянные конструкции", "Перегородки"]} />}
        title="Стеклянные перегородки для офисов и коммерческих объектов"
        lead="Офисы, торговые центры, банки, медицинские центры: стекло, профиль и фурнитура одним комплектом."
        actions={<HeroActions />}
        terms={<Terms />}
      />

      <KitBlock id="palette" title="Палитра">
        <div className="flex flex-col gap-10">
          {PALETTE.map(({ group, swatches }) => (
            <div key={group} className="flex flex-col gap-4">
              <h3 className="ig-h5">{group}</h3>
              <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-lg:grid-cols-3 max-md:grid-cols-2">
                {swatches.map((swatch) => (
                  <li key={swatch.token} className="flex flex-col gap-2">
                    <span
                      className={`border-hairline block h-16 rounded-md border ${swatch.className}`}
                    />
                    <code className="ig-micro break-all">{swatch.token}</code>
                    <span className="ig-small text-text-2">
                      {swatch.hex}
                      {swatch.note ? ` · ${swatch.note}` : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </KitBlock>

      <KitBlock id="type" title="Типографика">
        <div className="flex flex-col gap-6">
          {TYPE_SCALE.map((item) => (
            <div
              key={item.name}
              className="border-hairline grid grid-cols-[160px_minmax(0,1fr)] items-baseline gap-6 border-b pb-4 max-sm:grid-cols-1 max-sm:gap-1"
            >
              <span className="ig-small text-text-2">
                {item.name} · {item.spec}
              </span>
              <span className={item.className}>Закалённое стекло 4–19 мм</span>
            </div>
          ))}
          <p className="text-h3 text-primary-dark m-0">Tailwind-мост: text-h3 text-primary-dark</p>
        </div>
      </KitBlock>

      <KitBlock id="buttons" title="Кнопки">
        <div className="flex flex-col gap-8">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size} leftIcon={<Calculator />}>
                  {variant} {size}
                </Button>
              ))}
              <Button variant={variant} size="icon" aria-label="Поиск">
                <Search />
              </Button>
              <Button variant={variant} disabled>
                Disabled
              </Button>
              <Button variant={variant} loading>
                Отправляем…
              </Button>
            </div>
          ))}
          <div className="bg-navy flex flex-wrap items-center gap-3 rounded-lg p-6">
            {BUTTON_SIZES.map((size) => (
              <Button key={size} variant="onDark" size={size} leftIcon={<Phone />}>
                onDark {size}
              </Button>
            ))}
            <Button variant="onDark" size="icon" aria-label="Позвонить">
              <Phone />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild rightIcon={<ArrowRight />}>
              <a href="#buttons">asChild-ссылка</a>
            </Button>
            <a href="#buttons" className={buttonVariants({ variant: "secondary", size: "s" })}>
              buttonVariants()
            </a>
            <button type="button" className="ig-btn ig-btn--primary bg-red-500">
              Слои: bg-red-500 перебивает .ig-btn
            </button>
          </div>
          <div className="max-w-[420px]">
            <Button block size="l">
              block
            </Button>
          </div>
        </div>
      </KitBlock>

      <KitBlock id="links" title="Ссылки">
        <div className="flex flex-wrap items-center gap-8">
          <TextLink href="/">Внутренняя ссылка</TextLink>
          <TextLink href="/" variant="arrow">
            Как мы работаем: 6 шагов
          </TextLink>
          <TextLink href="#links" variant="dashed">
            Пунктирная ссылка
          </TextLink>
          <TextLink href="tel:+73512000000">+7 351 200-00-00</TextLink>
          <TextLink href="https://inex.su" target="_blank">
            Внешняя (новая вкладка)
          </TextLink>
        </div>
      </KitBlock>

      {SECTION_VARIANTS.map((variant) => (
        <Section key={variant} variant={variant} aria-labelledby={`section-${variant}`}>
          <SectionHead
            headingId={`section-${variant}`}
            title={`Section variant="${variant}"`}
            sub="Вертикальные отступы 96 / 72 / 48 px, фон на всю ширину, контент в Container."
            action={
              variant === "dark" || variant === "primary-dark" ? (
                <Button variant="onDark" size="s">
                  Действие
                </Button>
              ) : (
                <TextLink href="#palette" variant="arrow">
                  Все цвета
                </TextLink>
              )
            }
          />
        </Section>
      ))}

      <KitBlock id="placeholder" title="Плейсхолдер .ig-ph и сетка">
        <div className="grid grid-cols-4 gap-6 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {["4 / 3", "4 / 3", "16 / 9", "4 / 3"].map((ratio, index) => (
            <div
              key={index}
              className={`ig-ph rounded-lg ${ratio === "16 / 9" ? "ig-ph--16x9" : ""}`}
            >
              <span>фото {ratio}</span>
            </div>
          ))}
        </div>
      </KitBlock>

      <section aria-label="Поля сетки" className="bg-well py-6">
        <Container>
          <div className="border-brand bg-primary-light ig-small rounded-md border border-dashed p-4">
            Container: поля --ig-gutter = 70 (≥1366) / 40 (1101–1365) / 24 (600–1100) / 16 (≤599) px
          </div>
        </Container>
        <div className="px-gutter mt-4">
          <div className="border-brand bg-surface ig-small rounded-md border border-dashed p-4">
            Утилита px-gutter
          </div>
        </div>
      </section>
    </>
  );
}
