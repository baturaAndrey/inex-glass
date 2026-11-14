import { Terms, type TermItem } from "@/components/ig/terms";
import { getConditions } from "@/lib/cms/globals";
import { BlockSection, NamedIcon, fill, iconByName } from "./shared";
import type { BlockProps } from "./types";

type TermSource = { text: string; icon?: string | null };

/**
 * Terms strip. The block stores no data in `global` modes: items come from the `conditions`
 * global (`termsBar` / `termsBarShort`), so a change there updates every page.
 */
export async function TermsBlock({ block, ctx, section }: BlockProps<"terms">) {
  let source: TermSource[] = block.items ?? [];
  if (block.mode !== "custom") {
    const conditions = await getConditions();
    const short = block.mode === "globalShort" ? conditions?.termsBarShort : null;
    source = short?.length ? short : (conditions?.termsBar ?? []);
  }
  const items: TermItem[] = source.flatMap((item) => {
    const text = fill(item.text, ctx);
    if (!text) return [];
    // `Terms` falls back to its check mark when no (known) icon is given.
    return iconByName(item.icon) ? [{ text, icon: <NamedIcon name={item.icon} /> }] : [{ text }];
  });
  if (items.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <Terms items={items} variant={block.variant === "plain" ? "plain" : "bar"} />
    </BlockSection>
  );
}
