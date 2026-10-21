import { DEFAULT_THANK_YOU_TEXT, DEFAULT_THANK_YOU_TITLE } from "@/components/quiz/options";
import type { DeliveryCityKind, QuizConfig } from "@/components/quiz/types";
import { DEFAULT_DELIVERY_CITIES, FILM_THICKNESSES } from "@/lib/domain";
import { FALLBACK_PHONE, submitErrorMessage } from "@/lib/leads/responses";
import {
  getConditions,
  getContacts,
  getHolidays,
  getPrices,
  getPromo,
  getSiteSettings,
  getTechParams,
  getWorkdays,
  primaryPhone,
  toPricesInput,
  toPromoInput,
  toTechLimits,
} from "./globals";

/**
 * Server loader of the quiz configuration (`QuizConfig`, task-20). Reads only the cached global
 * loaders of task-15; `nowIso` is the time of THIS render and is never cached, so the price
 * freshness and the promo are always evaluated against the current date. Pages that use it set
 * their own `revalidate` (3600) or render dynamically.
 */

/** Placeholder of `site-settings.forms.submitErrorText`. */
const PHONE_PLACEHOLDER = "{телефон}";
const DEFAULT_SUBMIT_ERROR_TEXT = submitErrorMessage(PHONE_PLACEHOLDER);
const DEFAULT_MIN_ORDER_M2 = 50;

/** Fallback kinds of the default city list (the CMS rows carry their own `kind`). */
const OTHER_CITY = "Другой";
const PICKUP_PREFIX = "Самовывоз";

function defaultCityKind(name: string): DeliveryCityKind {
  if (name === OTHER_CITY) return "other";
  if (name.startsWith(PICKUP_PREFIX)) return "pickup";
  return "city";
}

const nonEmpty = (value: string | null | undefined, fallback: string): string =>
  value?.trim() ? value.trim() : fallback;

export async function getQuizConfig(): Promise<QuizConfig> {
  const [prices, promo, tech, conditions, settings, contacts, holidays, workdays] =
    await Promise.all([
      getPrices(),
      getPromo(),
      getTechParams(),
      getConditions(),
      getSiteSettings(),
      getContacts(),
      getHolidays(),
      getWorkdays(),
    ]);

  const cmsCities = (tech?.deliveryCities ?? [])
    .filter((city) => city.name?.trim())
    .map((city) => ({ name: city.name.trim(), kind: city.kind }));
  const cities =
    cmsCities.length > 0
      ? cmsCities
      : DEFAULT_DELIVERY_CITIES.map((name) => ({ name, kind: defaultCityKind(name) }));

  // Only films the lead schema accepts (`FILM_THICKNESSES`) are offered.
  const cmsFilms = (tech?.weight?.filmLayers ?? []).filter((film) =>
    (FILM_THICKNESSES as readonly number[]).includes(film)
  );

  const forms = settings?.forms;
  const minOrder = conditions?.minOrderM2;

  return {
    nowIso: new Date().toISOString(),
    prices: toPricesInput(prices),
    promo: toPromoInput(promo),
    limits: toTechLimits(tech, conditions),
    holidays,
    workdays,
    cities,
    films: cmsFilms.length > 0 ? cmsFilms : [...FILM_THICKNESSES],
    phone: primaryPhone(contacts) || FALLBACK_PHONE,
    minOrderArea:
      typeof minOrder === "number" && Number.isFinite(minOrder) && minOrder > 0
        ? minOrder
        : DEFAULT_MIN_ORDER_M2,
    forms: {
      thankYouTitle: nonEmpty(forms?.thankYouTitle, DEFAULT_THANK_YOU_TITLE),
      thankYouText: nonEmpty(forms?.thankYouText, DEFAULT_THANK_YOU_TEXT),
      submitErrorText: nonEmpty(forms?.submitErrorText, DEFAULT_SUBMIT_ERROR_TEXT),
    },
  };
}
