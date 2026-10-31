import { createElement, type ReactNode } from "react";
import {
  Armchair,
  Building2,
  Hammer,
  PencilRuler,
  PenTool,
  Users,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Icons of the home sections by the `icon` field of the CMS cards (segments). A fixed map keeps
 * the bundle small; the names follow Lucide (`building-2`), any case / separator style.
 * The prototype `Home.dc.html` draws Hammer, Armchair, Building2 and PenTool.
 */
const HOME_ICONS: Readonly<Record<string, LucideIcon>> = {
  hammer: Hammer,
  armchair: Armchair,
  building2: Building2,
  building: Building2,
  pentool: PenTool,
  pencilruler: PencilRuler,
  users: Users,
};

/** Icon by a Lucide name, or `null` for an empty / unknown name. */
export function homeIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  return HOME_ICONS[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;
}

/**
 * Decorative icon element by name, or `null`. `createElement` with a component picked from the
 * static map, so no component is created during render.
 */
export function renderHomeIcon(
  name: string | null | undefined,
  props: LucideProps = {}
): ReactNode {
  const icon = homeIcon(name);
  return icon ? createElement(icon, { "aria-hidden": true, strokeWidth: 2, ...props }) : null;
}
