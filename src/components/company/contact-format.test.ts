import { describe, expect, it } from "vitest";
import type { Contact } from "@/payload-types";
import {
  locationCards,
  mapPoints,
  mapQuery,
  toLocationCard,
  yandexMapsUrl,
  yandexWidgetUrl,
  type ContactLocation,
} from "./contact-format";

const office: ContactLocation = {
  key: "chelyabinsk-office",
  type: "office",
  title: "Челябинск — офис",
  city: "Челябинск",
  address: "ул. Артиллерийская, 124А",
  phones: [{ number: "+7 (351) 247-05-57" }, { number: "+7 951 489-04-09" }],
  email: "sale@inex.su",
  hours: "Пн–пт, 9:00–18:00",
  localBusiness: true,
};

const warehouse: ContactLocation = {
  key: "chelyabinsk-warehouse",
  type: "warehouse",
  title: "Челябинск — склад и самовывоз",
  city: "Челябинск",
  address: "Свердловский тракт, 7В",
  phones: [],
  hours: "Пн–пт, 9:00–18:00",
  localBusiness: false,
};

const contacts = { locations: [office, warehouse] } as unknown as Contact;

describe("toLocationCard", () => {
  it("builds tel: / mailto: links without spaces or brackets", () => {
    const card = toLocationCard(office);
    expect(card.phones).toEqual([
      { label: "+7 (351) 247-05-57", href: "tel:+73512470557" },
      { label: "+7 951 489-04-09", href: "tel:+79514890409" },
    ]);
    expect(card.email).toEqual({ label: "sale@inex.su", href: "mailto:sale@inex.su" });
  });

  it("drops empty lines (the warehouse has no phone or e-mail)", () => {
    const card = toLocationCard(warehouse, 1);
    expect(card.phones).toEqual([]);
    expect(card.email).toBeNull();
    expect(card.hours).toBe("Пн–пт, 9:00–18:00");
    expect(card.number).toBe(2);
  });
});

describe("locationCards / mapPoints", () => {
  it("number the cards and the map points the same way", () => {
    expect(locationCards(contacts).map((card) => card.number)).toEqual([1, 2]);
    expect(mapPoints(contacts).map((point) => [point.number, point.title])).toEqual([
      [1, "Челябинск — офис"],
      [2, "Челябинск — склад и самовывоз"],
    ]);
  });

  it("return nothing without the global", () => {
    expect(locationCards(null)).toEqual([]);
    expect(mapPoints(undefined)).toEqual([]);
  });
});

describe("map URLs", () => {
  it("search by «city, address», never by invented coordinates", () => {
    expect(mapQuery(office)).toBe("Челябинск, ул. Артиллерийская, 124А");
    expect(mapQuery({ city: "Челябинск", address: "г. Челябинск, Свердловский тракт, 7В" })).toBe(
      "г. Челябинск, Свердловский тракт, 7В"
    );
  });

  it("widget URL has the search text and zoom", () => {
    const url = new URL(yandexWidgetUrl(mapQuery(office)));
    expect(url.origin + url.pathname).toBe("https://yandex.ru/map-widget/v1/");
    expect(url.searchParams.get("text")).toBe("Челябинск, ул. Артиллерийская, 124А");
    expect(url.searchParams.get("z")).toBe("16");
  });

  it("«Открыть в Яндекс.Картах» prefers the editor's https link", () => {
    expect(yandexMapsUrl({ ...office, mapUrl: "https://yandex.ru/maps/-/CDabc" })).toBe(
      "https://yandex.ru/maps/-/CDabc"
    );
    const fallback = new URL(yandexMapsUrl({ ...office, mapUrl: "javascript:alert(1)" }));
    expect(fallback.origin + fallback.pathname).toBe("https://yandex.ru/maps/");
    expect(fallback.searchParams.get("text")).toBe("Челябинск, ул. Артиллерийская, 124А");
  });
});
