"use client";

import {
  BookOpen,
  Building2,
  ChartColumn,
  FileText,
  IdCard,
  Image,
  Inbox,
  Layers,
  LayoutDashboard,
  Package,
  Phone,
  SlidersHorizontal,
  Tag,
  Users,
  Wrench,
} from "lucide-react";
import type { NavIconKey } from "./nav-config";
import type { LucideIcon } from "lucide-react";

/** Icon key of `nav-config.ts` → Lucide icon (the mockup's sidebar icons). */
export const NAV_ICONS: Readonly<Record<NavIconKey, LucideIcon>> = {
  dashboard: LayoutDashboard,
  leads: Inbox,
  orders: Package,
  reports: ChartColumn,
  pages: FileText,
  articles: BookOpen,
  objects: Building2,
  media: Image,
  team: IdCard,
  catalog: Layers,
  prices: Tag,
  conditions: Phone,
  users: Users,
  settings: SlidersHorizontal,
  service: Wrench,
};

/** Size of a sidebar icon (px), 2 px stroke (DESIGN.md: Lucide). */
export const NAV_ICON_SIZE = 18;
