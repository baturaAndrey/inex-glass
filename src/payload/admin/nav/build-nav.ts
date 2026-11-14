import type {
  NavCounterKey,
  NavEntityRef,
  NavGroupConfig,
  NavIconKey,
  NavItemConfig,
} from "./nav-config";

/**
 * Builds the admin sidebar for one user (pure, unit-tested in `build-nav.test.ts`).
 *
 * Visibility follows Payload's own nav (`groupNavItems`): an entity is shown when it is in
 * `visibleEntities` (Payload already drops `admin.hidden` ones) AND the user may read it.
 * Every visible entity the static config does not mention ends up under the `catchAll` item
 * («Служебное»), so a collection or global added later is never lost from the menu.
 *
 * When an item's own entity is hidden, the item goes away, but those of its children that are
 * still visible and readable on their own (e.g. «Файлы заказов» without «Заказы») are treated as
 * unlisted and move to «Служебное»: an access rule on the parent never hides a readable child.
 */

export interface NavInput {
  groups: readonly NavGroupConfig[];
  visibleEntities: { collections: readonly string[]; globals: readonly string[] };
  /** Read flags only: `permissions.collections[slug]?.read`, `permissions.globals[slug]?.read`. */
  canRead: (ref: NavEntityRef) => boolean;
  /** Labels from the Payload config (slug → label) for children and the «Служебное» tail. */
  labels: {
    collections: Readonly<Record<string, string>>;
    globals: Readonly<Record<string, string>>;
  };
  isStaff: boolean;
}

export interface NavLink {
  href: string;
  label: string;
  /** Path prefixes that highlight the link (with a trailing slash). */
  activePrefixes: string[];
  /** Highlight only when the path equals `href` (the dashboard). */
  exact: boolean;
}

export interface NavItem extends NavLink {
  id: string;
  icon: NavIconKey;
  counter?: NavCounterKey;
  domId?: string;
  children: NavLink[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const entityKey = (ref: Pick<NavEntityRef, "kind" | "slug">) => `${ref.kind}:${ref.slug}`;

export function entityHref(ref: Pick<NavEntityRef, "kind" | "slug">): string {
  const segment = ref.kind === "collection" ? "collections" : "globals";
  return `/admin/${segment}/${ref.slug}/`;
}

const unique = (values: readonly string[]) => [...new Set(values)];

/** Keys of every entity the config mentions (an item's own entity or one of its children). */
function mentionedEntities(groups: readonly NavGroupConfig[]): Set<string> {
  const keys = new Set<string>();
  for (const config of groups.flatMap((group) => group.items)) {
    if (config.entity) keys.add(entityKey(config.entity));
    for (const child of config.children ?? []) keys.add(entityKey(child));
  }
  return keys;
}

export function buildNav(input: NavInput): NavGroup[] {
  const mentioned = mentionedEntities(input.groups);

  const isVisible = (ref: NavEntityRef): boolean => {
    const visible =
      ref.kind === "collection" ? input.visibleEntities.collections : input.visibleEntities.globals;
    return visible.includes(ref.slug) && input.canRead(ref);
  };

  const labelOf = (ref: NavEntityRef): string => {
    if (ref.label) return ref.label;
    const labels = ref.kind === "collection" ? input.labels.collections : input.labels.globals;
    return labels[ref.slug] ?? ref.slug;
  };

  const link = (ref: NavEntityRef): NavLink => {
    const href = entityHref(ref);
    return { href, label: labelOf(ref), activePrefixes: [href], exact: false };
  };

  /**
   * Keys of the children whose parent item is hidden by its own entity. They are matched against
   * `visibleEntities` below, so the catch-all shows them with their Payload label (an item-local
   * override like «Все заказы» makes no sense outside the parent).
   */
  const orphaned = new Set(
    input.groups
      .flatMap((group) => group.items)
      .filter((config) => config.entity && !isVisible(config.entity))
      .flatMap((config) => (config.children ?? []).map(entityKey))
  );

  /**
   * Visible entities no shown item lists — never mentioned by the config, or orphaned by a hidden
   * parent — sorted by label (Russian collation).
   */
  const unlisted = (): NavEntityRef[] =>
    [
      ...input.visibleEntities.collections.map((slug): NavEntityRef => ({
        kind: "collection",
        slug,
      })),
      ...input.visibleEntities.globals.map((slug): NavEntityRef => ({ kind: "global", slug })),
    ]
      .filter((ref) => {
        const key = entityKey(ref);
        return (!mentioned.has(key) || orphaned.has(key)) && isVisible(ref);
      })
      .sort((a, b) => labelOf(a).localeCompare(labelOf(b), "ru"));

  /** One item, or `null` when the user can see nothing of it. */
  const buildItem = (config: NavItemConfig): NavItem | null => {
    const { entity } = config;
    // Plain staff links (dashboard, report) have no entity behind them.
    const plain = !entity && !config.children && !config.catchAll;
    if (plain && !input.isStaff) return null;
    if (entity && !isVisible(entity)) return null;

    const childRefs = (config.children ?? []).filter(isVisible);
    if (config.catchAll) childRefs.push(...unlisted());
    const children = childRefs.map(link);
    const own = entity ? link(entity) : null;

    // Explicit link, else the item's own entity, else its first visible child.
    const href = config.href ?? own?.href ?? children[0]?.href;
    if (!href) return null;

    const activePrefixes = config.exact
      ? [href]
      : unique([
          ...(own ? own.activePrefixes : []),
          ...(config.href ? [config.href] : []),
          ...children.flatMap((child) => child.activePrefixes),
        ]);

    const item: NavItem = {
      id: config.id,
      icon: config.icon,
      label: config.label,
      href,
      activePrefixes,
      exact: config.exact === true,
      children,
    };
    if (config.counter) item.counter = config.counter;
    if (config.domId) item.domId = config.domId;
    return item;
  };

  return input.groups
    .map((group) => ({
      id: group.id,
      label: group.label,
      items: group.items.map(buildItem).filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}
