import { describe, expect, it } from "vitest";
import { buildBreadcrumbs } from "./breadcrumbs";

describe("buildBreadcrumbs", () => {
  it("home page has no crumbs", () => {
    expect(buildBreadcrumbs("/")).toEqual([]);
    expect(buildBreadcrumbs("")).toEqual([]);
  });

  it("root URL: Главная › section (no link on the current page)", () => {
    expect(buildBreadcrumbs("/tripleks/")).toEqual([
      { label: "Главная", href: "/" },
      { label: "Триплекс" },
    ]);
  });

  it("thickness card: Главная › Закалённое стекло › 10 мм", () => {
    expect(buildBreadcrumbs("/zakalennoe-steklo/10-mm/")).toEqual([
      { label: "Главная", href: "/" },
      { label: "Закалённое стекло", href: "/zakalennoe-steklo/" },
      { label: "10 мм" },
    ]);
  });

  it("section without a page is plain text; the leaf label comes from lastLabel", () => {
    expect(
      buildBreadcrumbs("/instrumenty/kalkulyator-vesa-stekla/", {
        lastLabel: "Калькулятор веса стекла",
      })
    ).toEqual([
      { label: "Главная", href: "/" },
      { label: "Инструменты" },
      { label: "Калькулятор веса стекла" },
    ]);
  });

  it("pagination segments are not crumbs", () => {
    expect(buildBreadcrumbs("/obekty/page/3/")).toEqual([
      { label: "Главная", href: "/" },
      { label: "Объекты" },
    ]);
    expect(buildBreadcrumbs("/blog/page/2/")).toEqual([
      { label: "Главная", href: "/" },
      { label: "Блог" },
    ]);
  });

  it("lastLabel overrides the table for the current page", () => {
    expect(buildBreadcrumbs("/kontakty/", { lastLabel: "Контакты Inex Glass" })).toEqual([
      { label: "Главная", href: "/" },
      { label: "Контакты Inex Glass" },
    ]);
  });

  it("nested pages of 17-meta (sample)", () => {
    expect(
      buildBreadcrumbs("/kak-zakazat/trebovaniya-k-chertezham/", {
        lastLabel: "Требования к чертежам",
      })
    ).toEqual([
      { label: "Главная", href: "/" },
      { label: "Как заказать", href: "/kak-zakazat/" },
      { label: "Требования к чертежам" },
    ]);
    expect(buildBreadcrumbs("/klientam/zastrojshchikam/", { lastLabel: "Застройщикам" })).toEqual([
      { label: "Главная", href: "/" },
      { label: "С кем мы работаем", href: "/klientam/" },
      { label: "Застройщикам" },
    ]);
    expect(
      buildBreadcrumbs("/o-kompanii/sotrudniki/", { lastLabel: "Сотрудники" }).map((c) => c.label)
    ).toEqual(["Главная", "О компании", "Сотрудники"]);
    expect(
      buildBreadcrumbs("/blog/kak-vybrat-tolshchinu-stekla/", { lastLabel: "Статья" })[1]
    ).toEqual({ label: "Блог", href: "/blog/" });
    expect(buildBreadcrumbs("/osteklenie/fasadov/", { lastLabel: "Фасады" })[1]).toEqual({
      label: "Остекление",
      href: "/osteklenie/",
    });
    expect(buildBreadcrumbs("/zerkala/dlya-zalov/", { lastLabel: "Для залов" })[1]).toEqual({
      label: "Зеркала",
      href: "/zerkala/",
    });
    expect(buildBreadcrumbs("/obrabotka-stekla/kromka/", { lastLabel: "Кромка" })[1]).toEqual({
      label: "Обработка стекла",
      href: "/obrabotka-stekla/",
    });
  });

  it("every root URL of the table has its label", () => {
    const roots: Record<string, string> = {
      "/furnitura/": "Зажимной профиль и спайдеры",
      "/steklyannye-peregorodki/": "Стеклянные перегородки",
      "/dushevye-peregorodki/": "Душевые перегородки",
      "/steklyannye-ograzhdeniya/": "Ограждения и перила",
      "/steklyannye-kozyrki/": "Стеклянные козырьки",
      "/torgovye-vitriny/": "Торговые витрины",
      "/proektirovanie/": "Проектирование",
      "/kontakty/": "Контакты",
      "/raschet-stoimosti/": "Расчёт стоимости",
      "/steklyannye-konstrukcii/": "Стеклянные конструкции",
    };
    for (const [path, label] of Object.entries(roots)) {
      expect(buildBreadcrumbs(path)).toEqual([{ label: "Главная", href: "/" }, { label }]);
    }
  });

  it("custom labels by segment or by full path", () => {
    expect(
      buildBreadcrumbs("/zakalennoe-steklo/dlya-mebeli/", {
        labels: { "/zakalennoe-steklo/dlya-mebeli/": "Для мебели" },
      }).at(-1)
    ).toEqual({ label: "Для мебели" });
    expect(
      buildBreadcrumbs("/zakalennoe-steklo/matovoe/", { labels: { matovoe: "Матовое" } }).at(-1)
    ).toEqual({ label: "Матовое" });
  });
});
