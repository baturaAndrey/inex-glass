import { fill } from "@/components/blocks/shared";
import type { LayoutBlock } from "@/components/blocks/types";
import {
  HolesRulesPanel,
  LimitTiles,
  limitTilesOf,
} from "@/components/how-to-order/drawing-requirements";
import type { ArticlePiece } from "@/components/how-to-order/subpage-article";
import { HowToOrderSubpage } from "@/components/how-to-order/subpage-template";
import { FILE_KINDS_HEADING, FileKinds } from "@/components/service/file-kinds";
import { getTechLimits } from "@/lib/cms/globals";
import { pickFirst, pickNth } from "@/lib/service/page-compose";
import { servicePageMetadata, type ServicePageData } from "@/lib/service/service-page";
import type { Metadata } from "next";

/**
 * «Требования к чертежам» (teksty 04 §2) on the subpage template, Paper mockup
 * `2560_kak-zakazat_trebovaniya`. On top of the generic article (`HowToOrderSubpage`):
 * - «Какие файлы принимаем» first — the format cards of the template (`FileKinds`);
 * - the 2nd `table` («Технологические ограничения») → value tiles;
 * - the 1st `callout` («Отверстия по ГОСТ 30698-2014») → its own section with the holes drawing
 *   (10 mm, diameter range from the `tech-params` global).
 * The 1st table, the check `steps` + note and the form panel are the generic template's.
 */

const PATH = "/kak-zakazat/trebovaniya-k-chertezham/";

export function generateMetadata(): Promise<Metadata> {
  return servicePageMetadata(PATH);
}

async function compose({ page, placeholders: ctx }: ServicePageData) {
  const layout = page.layout ?? [];
  const limits = pickNth(layout, "table", 1);
  const gost = pickFirst(layout, "callout");
  const { holes } = await getTechLimits();

  const lead: ArticlePiece[] = [{ title: FILE_KINDS_HEADING, content: <FileKinds /> }];
  const override = (block: LayoutBlock): ArticlePiece[] | null => {
    if (block === limits) {
      return [
        {
          title: fill(limits.heading, ctx) || undefined,
          content: <LimitTiles tiles={limitTilesOf(limits, ctx)} />,
        },
      ];
    }
    if (block === gost) {
      return [
        {
          title: fill(gost.title, ctx) || undefined,
          content: <HolesRulesPanel block={gost} ctx={ctx} holes={holes} />,
        },
      ];
    }
    return null;
  };
  return { lead, override };
}

export default function DrawingRequirementsPage() {
  return <HowToOrderSubpage path={PATH} compose={compose} />;
}
