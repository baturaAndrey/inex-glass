"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Accordion } from "@/components/ig/accordion";
import { Button } from "@/components/ig/button";
import { CookieBanner } from "@/components/ig/cookie-banner";
import { Drawer, type DrawerSide } from "@/components/ig/drawer";
import { Faq } from "@/components/ig/faq";
import { Lightbox, type LightboxImage } from "@/components/ig/lightbox";
import { Section, SectionHead } from "@/components/ig/section";
import { StickyCta } from "@/components/ig/sticky-cta";
import { clearConsent } from "@/lib/consent";
import { useConsent } from "@/lib/use-consent";

const PHOTOS: LightboxImage[] = [
  {
    src: "/generated/hero-home.webp",
    alt: "Закалённое стекло на объекте",
    caption: "Фото упаковки 1 · Фото при отгрузке, 15.11.2026",
  },
  {
    src: "/generated/hero-thickness.webp",
    alt: "Торцы листов закалённого стекла",
    caption: "Фото упаковки 2 · Фото при отгрузке, 15.11.2026",
  },
  {
    src: "/generated/hero-construction.webp",
    alt: "Стеклянная конструкция в интерьере",
  },
];

const FAQ_ITEMS = [
  {
    question: "Можно ли резать закалённое стекло после закалки?",
    answer: (
      <p>
        Нет. После закалки стекло нельзя резать и сверлить: все отверстия и вырезы делаются до
        закалки по чертежу.
      </p>
    ),
  },
  {
    question: "Какой минимальный объём заказа?",
    answer: <p>Работаем с заказами от 50 м².</p>,
  },
  {
    question: "Какие документы вы передаёте с партией?",
    answer: <p>Паспорт и ГОСТ 30698 на каждую партию.</p>,
  },
];

const ACCORDION_ITEMS = [
  { id: "a", title: "Открыт по умолчанию", content: <p>Содержимое первой панели.</p> },
  { id: "b", title: "Второй пункт", content: <p>Содержимое второй панели.</p> },
  { id: "c", title: "Третий пункт", content: <p>Содержимое третьей панели.</p> },
];

const CONSENT_LABEL = {
  all: "«all» — Метрика разрешена",
  necessary: "«necessary» — только необходимые",
} as const;

function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="ig-label m-0">{label}</p>
      {children}
    </div>
  );
}

/** Interactive part of `/ui-kit/content/`: accordion, lightbox, drawer, consent, sticky CTA. */
export function ContentDemo() {
  const consent = useConsent();
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  // Side is kept after closing so the exit animation slides out the same way.
  const [drawer, setDrawer] = useState<{ open: boolean; side: DrawerSide }>({
    open: false,
    side: "right",
  });
  const openDrawer = (side: DrawerSide) => setDrawer({ open: true, side });
  const closeDrawer = () => setDrawer((state) => ({ ...state, open: false }));

  return (
    <>
      <Section id="kit-faq" aria-labelledby="kit-faq-h">
        <SectionHead title="Аккордеон и FAQ" headingId="kit-faq-h" />
        <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1">
          <Demo label="Faq (multiple)">
            <Faq items={FAQ_ITEMS} />
          </Demo>
          <Demo label="Accordion single, defaultOpen">
            <Accordion items={ACCORDION_ITEMS} defaultOpen={["a"]} />
          </Demo>
        </div>
      </Section>

      <Section id="kit-overlays" variant="sf" aria-labelledby="kit-overlays-h">
        <SectionHead title="Лайтбокс, drawer, cookie, sticky CTA" headingId="kit-overlays-h" />
        <div className="flex flex-col gap-10">
          <Demo label="Lightbox: ← / → / Esc, свайп, счётчик, цикл">
            <ul className="m-0 grid max-w-[720px] list-none grid-cols-3 gap-3 p-0">
              {PHOTOS.map((photo, index) => (
                <li key={photo.src}>
                  <button
                    type="button"
                    className="relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-md border-0 p-0"
                    aria-label={`Открыть фото ${index + 1} из ${PHOTOS.length}`}
                    onClick={() => setLightbox({ open: true, index })}
                  >
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      sizes="(max-width: 599px) 33vw, 240px"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
            <Lightbox
              images={PHOTOS}
              open={lightbox.open}
              index={lightbox.index}
              onOpenChange={(open) => setLightbox((state) => ({ ...state, open }))}
              onIndexChange={(index) => setLightbox((state) => ({ ...state, index }))}
            />
          </Demo>

          <Demo label="Drawer: справа / слева / снизу">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" size="s" onClick={() => openDrawer("right")}>
                Фильтры справа
              </Button>
              <Button variant="secondary" size="s" onClick={() => openDrawer("left")}>
                Меню слева
              </Button>
              <Button variant="secondary" size="s" onClick={() => openDrawer("bottom")}>
                Панель снизу
              </Button>
            </div>
            <Drawer
              open={drawer.open}
              onOpenChange={(open) => {
                if (!open) closeDrawer();
              }}
              side={drawer.side}
              title="Фильтры"
              description="Объекты по типу изделия и городу"
              footer={
                <>
                  <Button variant="primary" size="m" onClick={closeDrawer}>
                    Применить
                  </Button>
                  <Button variant="secondary" size="m" onClick={closeDrawer}>
                    Сбросить
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                {Array.from({ length: 24 }, (_, index) => (
                  <p key={index} className="ig-body m-0">
                    Пункт фильтра {index + 1}
                  </p>
                ))}
              </div>
            </Drawer>
          </Demo>

          <Demo label="CookieBanner + согласие">
            <p className="ig-body m-0" aria-live="polite">
              Текущее согласие:{" "}
              <b>
                {consent === undefined
                  ? "…"
                  : consent === null
                    ? "нет (баннер показан)"
                    : CONSENT_LABEL[consent]}
              </b>
            </p>
            <div>
              <Button variant="secondary" size="s" onClick={clearConsent}>
                Сбросить согласие
              </Button>
            </div>
          </Demo>

          <Demo label="StickyCta — только ≤599 px, внизу экрана">
            <p className="ig-small ig-muted m-0">
              Сузьте окно до 375 px: кнопка «Рассчитать стоимость» закреплена внизу, баннер cookie
              поднимается над ней (--ig-sticky-h).
            </p>
          </Demo>
        </div>
      </Section>

      <CookieBanner />
      <StickyCta />
    </>
  );
}
