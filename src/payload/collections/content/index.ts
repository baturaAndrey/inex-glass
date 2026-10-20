import { Articles } from "./articles";
import { Media } from "./media";
import { Objects } from "./objects";
import { Pages } from "./pages";
import { Team } from "./team";
import type { CollectionConfig } from "payload";

/** Content collections registry (task 07). */
export const contentCollections: CollectionConfig[] = [Media, Pages, Articles, Objects, Team];
