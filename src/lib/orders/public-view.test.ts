import { describe, expect, it } from "vitest";
import { buildSteps, isOrderLinkActive, phoneHref, toPublicOrderView } from "./public-view";
import type { PublicOrderSource } from "./public-view";
import type { OrderStatus } from "./status";

const NOW = new Date("2026-11-20T06:00:00.000Z");
const d = (key: string) => `${key}T12:00:00.000Z`;

const PHOTO = (n: number, mimeType = "image/jpeg") => ({
  photo: { id: `p${n}`, filename: `p${n}.jpg`, mimeType, filesize: 1000 },
  caption: null,
});

const DATES: Record<OrderStatus, string> = {
  spec_agreed: d("2026-10-28"),
  in_production: d("2026-10-30"),
  packed: d("2026-11-14"),
  shipped: d("2026-11-15"),
  received: d("2026-11-18"),
};
const ALL: OrderStatus[] = ["spec_agreed", "in_production", "packed", "shipped", "received"];

/** Order whose history runs up to `status`. */
function orderAt(status: OrderStatus, extra: Partial<PublicOrderSource> = {}): PublicOrderSource {
  const history = ALL.slice(0, ALL.indexOf(status) + 1).map((s) => ({ status: s, date: DATES[s] }));
  return {
    number: "2026-0147",
    company: "ООО «Стройстекло»",
    composition: "Закалённое стекло 10 мм, 86 м², 42 позиции",
    currentStatus: status,
    statusHistory: history,
    ...extra,
  };
}

const FULL_ORDER = {
  ...orderAt("shipped"),
  // Fields that must NEVER reach the page:
  clientEmail: "client@buyer.example",
  clientName: "Пётр Клиентов",
  clientPhone: "+79990001122",
  lead: { id: "lead-1", email: "lead@buyer.example", phone: "+79995556677" },
  tokenHash: "f".repeat(64),
  tokenCreatedAt: d("2026-10-28"),
  notifyClient: true,
  clientComment: { text: "Срок перенесён на 14.11.", updatedAt: d("2026-11-01") },
  packPhotos: [PHOTO(1), PHOTO(2), PHOTO(3)],
  shipment: { carrier: "ПЭК", waybill: "ЧЛБ-000123", trackingUrl: "https://pecom.ru/t/1" },
  documents: [
    {
      title: "Паспорт качества",
      file: { id: "doc1", filename: "passport.pdf", mimeType: "application/pdf", filesize: 2048 },
    },
  ],
  manager: {
    id: "m1",
    name: "Анна Менеджерова",
    position: null,
    phone: "+7 (351) 247-05-57",
    email: "anna@inex.example",
    messengerUrl: "https://t.me/anna",
    photo: { id: "media1", url: "/api/media/file/anna.jpg" },
    role: "manager",
    hash: "secret-hash",
  },
};

describe("timeline steps", () => {
  const expected: Record<OrderStatus, string[]> = {
    spec_agreed: ["current", "todo", "todo", "todo", "todo"],
    in_production: ["done", "current", "todo", "todo", "todo"],
    packed: ["done", "done", "current", "todo", "todo"],
    shipped: ["done", "done", "done", "current", "todo"],
    // The last stage reached means the order is complete.
    received: ["done", "done", "done", "done", "done"],
  };

  for (const status of ALL) {
    it(`states for «${status}»`, () => {
      const steps = buildSteps(orderAt(status));
      expect(steps.map((step) => step.state)).toEqual(expected[status]);
      expect(steps.map((step) => step.key)).toEqual(ALL);
      const reached = ALL.indexOf(status);
      steps.forEach((step, index) => {
        if (index <= reached) expect(step.date).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
        else expect(step.date).toBe("—");
      });
    });
  }

  it("titles come from the built-in labels or the CMS", () => {
    const steps = buildSteps(orderAt("packed"), { labels: { packed: "Упакован" } });
    expect(steps.map((s) => s.title)).toEqual([
      "Спецификация согласована",
      "В производстве",
      "Упакован",
      "Отгружено",
      "Получено",
    ]);
  });

  it("shows «план ДД.ММ» on the next stage when the current one has a planned date", () => {
    const order = orderAt("in_production");
    order.statusHistory = [
      { status: "spec_agreed", date: DATES.spec_agreed },
      { status: "in_production", date: DATES.in_production, plannedDate: d("2026-11-14") },
    ];
    const steps = buildSteps(order);
    expect(steps[1]?.date).toBe("30.10.2026");
    expect(steps[2]?.date).toBe("план 14.11");
    expect(steps[3]?.date).toBe("—");
  });

  it("passed stages without a date show «—»; currentStatus falls back to the history", () => {
    const steps = buildSteps({
      statusHistory: [
        { status: "spec_agreed", date: DATES.spec_agreed },
        { status: "packed", date: DATES.packed },
      ],
    });
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(steps[1]?.date).toBe("—");
    expect(steps[2]?.date).toBe("14.11.2026");
  });
});

describe("toPublicOrderView", () => {
  it("never exposes the client's contacts, the lead or the token", () => {
    const json = JSON.stringify(toPublicOrderView(FULL_ORDER, NOW));
    for (const forbidden of [
      "clientEmail",
      "clientPhone",
      "clientName",
      "client@buyer.example",
      "+79990001122",
      "Пётр Клиентов",
      '"lead"',
      "lead@buyer.example",
      "+79995556677",
      "tokenHash",
      "fffff",
      "secret-hash",
      "notifyClient",
    ]) {
      expect(json).not.toContain(forbidden);
    }
    expect(Object.keys(toPublicOrderView(FULL_ORDER, NOW)).sort()).toEqual(
      [
        "active",
        "clientComment",
        "currentStatus",
        "documents",
        "manager",
        "number",
        "photos",
        "photosCaption",
        "shipment",
        "steps",
        "subtitle",
      ].sort()
    );
  });

  it("maps the shipped order", () => {
    const view = toPublicOrderView(FULL_ORDER, NOW);
    expect(view.active).toBe(true);
    expect(view.number).toBe("2026-0147");
    expect(view.subtitle).toBe("ООО «Стройстекло» · Закалённое стекло 10 мм, 86 м², 42 позиции");
    expect(view.clientComment).toBe("Срок перенесён на 14.11.");
    expect(view.photos).toEqual([
      { id: "p1", alt: "Фото упаковки 1" },
      { id: "p2", alt: "Фото упаковки 2" },
      { id: "p3", alt: "Фото упаковки 3" },
    ]);
    expect(view.photosCaption).toBe("Фото при отгрузке, 15.11.2026");
    expect(view.shipment).toEqual({
      date: "15.11.2026",
      carrier: "ПЭК",
      waybill: "ЧЛБ-000123",
      trackingUrl: "https://pecom.ru/t/1",
    });
    expect(view.documents).toEqual([{ id: "doc1", title: "Паспорт качества", meta: "PDF · 2 КБ" }]);
    expect(view.manager).toEqual({
      name: "Анна Менеджерова",
      position: "Менеджер по заказам",
      phone: "+7 (351) 247-05-57",
      phoneHref: "tel:+73512470557",
      email: "anna@inex.example",
      messengerUrl: "https://t.me/anna",
      photoUrl: "/api/media/file/anna.jpg",
    });
  });

  it("hides shipment and photos while in production", () => {
    const view = toPublicOrderView(orderAt("in_production"), NOW);
    expect(view.shipment).toBeNull();
    expect(view.photos).toEqual([]);
    expect(view.photosCaption).toBeNull();
    expect(view.documents).toEqual([]);
    expect(view.manager).toBeNull();
  });

  it("shows the shipment card when carrier/waybill are filled before «Отгружено»", () => {
    const view = toPublicOrderView(
      orderAt("packed", { shipment: { carrier: "Деловые линии" } }),
      NOW
    );
    expect(view.shipment).toEqual({
      date: null,
      carrier: "Деловые линии",
      waybill: null,
      trackingUrl: null,
    });
  });

  it("dates the photos by packing when not shipped yet; no date → no caption", () => {
    expect(
      toPublicOrderView(orderAt("packed", { packPhotos: [PHOTO(1)] }), NOW).photosCaption
    ).toBe("Фото при отгрузке, 14.11.2026");
    expect(
      toPublicOrderView(orderAt("in_production", { packPhotos: [PHOTO(1)] }), NOW).photosCaption
    ).toBeNull();
  });

  it("drops non-displayable photos and unpopulated files", () => {
    const view = toPublicOrderView(
      orderAt("packed", {
        packPhotos: [PHOTO(1, "image/heic"), { photo: "p9" }, PHOTO(2, "image/png")],
        documents: [{ title: "x", file: "doc9" }],
      }),
      NOW
    );
    expect(view.photos).toEqual([{ id: "p2", alt: "Фото упаковки 1" }]);
    expect(view.documents).toEqual([]);
  });

  it("drops unsafe URLs (tracking: http(s) only; messenger: known schemes)", () => {
    const view = toPublicOrderView(
      {
        ...FULL_ORDER,
        shipment: { carrier: "ТК", trackingUrl: "javascript:alert(1)" },
        manager: { ...FULL_ORDER.manager, messengerUrl: "javascript:alert(1)", photo: null },
      },
      NOW
    );
    expect(view.shipment?.trackingUrl).toBeNull();
    expect(view.manager?.messengerUrl).toBeNull();
    expect(view.manager?.photoUrl).toBeNull();
    expect(
      toPublicOrderView(
        {
          ...FULL_ORDER,
          manager: { ...FULL_ORDER.manager, messengerUrl: "tg://resolve?domain=a" },
        },
        NOW
      ).manager?.messengerUrl
    ).toBe("tg://resolve?domain=a");
  });

  it("omits empty subtitle parts", () => {
    expect(toPublicOrderView(orderAt("packed", { company: "  " }), NOW).subtitle).toBe(
      "Закалённое стекло 10 мм, 86 м², 42 позиции"
    );
    expect(
      toPublicOrderView(orderAt("packed", { company: null, composition: "" }), NOW).subtitle
    ).toBeNull();
  });
});

describe("link activity", () => {
  it("is active without expiry and inactive when revoked", () => {
    expect(isOrderLinkActive({}, NOW)).toBe(true);
    expect(isOrderLinkActive({ revoked: false, expiresAt: null }, NOW)).toBe(true);
    expect(isOrderLinkActive({ revoked: true }, NOW)).toBe(false);
  });

  it("expires exactly at expiresAt", () => {
    const at = NOW.toISOString();
    expect(isOrderLinkActive({ expiresAt: at }, NOW)).toBe(false);
    expect(isOrderLinkActive({ expiresAt: at }, new Date(NOW.getTime() - 1))).toBe(true);
    expect(isOrderLinkActive({ expiresAt: at }, new Date(NOW.getTime() + 1))).toBe(false);
    expect(toPublicOrderView(orderAt("received", { expiresAt: at }), NOW).active).toBe(false);
  });
});

describe("phoneHref", () => {
  it("keeps digits and the leading plus", () => {
    expect(phoneHref("+7 (351) 247-05-57")).toBe("tel:+73512470557");
    expect(phoneHref("8 800 100-00-00")).toBe("tel:88001000000");
    expect(phoneHref("—")).toBeNull();
    expect(phoneHref(null)).toBeNull();
  });
});
