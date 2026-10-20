import { ArticlesFeedBlock } from "./articles-feed";
import { CalloutBlock } from "./callout";
import { CardsBlock } from "./cards";
import { CollectionCardsBlock } from "./collection-cards";
import { CompareBlock } from "./compare";
import { ContactsMapBlock } from "./contacts-map";
import { CtaBlock } from "./cta";
import { DownloadBlock } from "./download";
import { FaqBlock } from "./faq";
import { FormBlock } from "./form";
import { GalleryBlock } from "./gallery";
import { HeroBlock } from "./hero";
import { HolesCalculatorBlock } from "./holes-calculator";
import { LinkListBlock } from "./link-list";
import { ObjectsFeedBlock } from "./objects-feed";
import { PricesTableBlock } from "./prices-table";
import { QuizCtaBlock } from "./quiz-cta";
import { RequisitesBlock } from "./requisites";
import { RichTextBlock } from "./rich-text";
import { SnippetBlock } from "./snippet";
import { StatsBlock } from "./stats";
import { StepsBlock } from "./steps";
import { SystemsBlock } from "./systems";
import { TableBlock } from "./table";
import { TeamGridBlock } from "./team-grid";
import { TermsBlock } from "./terms";
import { TwoColumnsBlock } from "./two-columns";
import { WeightCalculatorBlock } from "./weight-calculator";
import { WhoDoesWhatBlock } from "./who-does-what";
import type { Block } from "payload";

/** Page-builder blocks registry (29 blocks), rendered by task 16 (`render-blocks.tsx`). */
export const pageBlocks: Block[] = [
  HeroBlock,
  RichTextBlock,
  TableBlock,
  StepsBlock,
  CalloutBlock,
  TermsBlock,
  CardsBlock,
  CollectionCardsBlock,
  PricesTableBlock,
  FaqBlock,
  CtaBlock,
  CompareBlock,
  DownloadBlock,
  HolesCalculatorBlock,
  WeightCalculatorBlock,
  FormBlock,
  SnippetBlock,
  StatsBlock,
  ObjectsFeedBlock,
  ArticlesFeedBlock,
  WhoDoesWhatBlock,
  SystemsBlock,
  GalleryBlock,
  TwoColumnsBlock,
  LinkListBlock,
  ContactsMapBlock,
  RequisitesBlock,
  TeamGridBlock,
  QuizCtaBlock,
];
