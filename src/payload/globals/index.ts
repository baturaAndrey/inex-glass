import { Conditions } from "./conditions";
import { Contacts } from "./contacts";
import { Navigation } from "./navigation";
import { Prices } from "./prices";
import { Promo } from "./promo";
import { Requisites } from "./requisites";
import { SiteSettings } from "./site-settings";
import { Snippets } from "./snippets";
import { TechParams } from "./tech-params";
import type { GlobalConfig } from "payload";

/** Globals registry: references first, then site settings (order defines the admin sidebar). */
export const globals: GlobalConfig[] = [
  Prices,
  Promo,
  Conditions,
  Contacts,
  Requisites,
  TechParams,
  SiteSettings,
  Navigation,
  Snippets,
];
