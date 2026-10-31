import { Cities } from "./cities";
import { Constructions } from "./constructions";
import { GlassTypes } from "./glass-types";
import { ObjectTypes } from "./object-types";
import { ProcessingServices } from "./processing-services";
import { Products } from "./products";
import { ShowerConfigs } from "./shower-configs";
import { ThicknessGroups } from "./thickness-groups";
import { Thicknesses } from "./thicknesses";
import type { CollectionConfig } from "payload";

/** Catalog collections registry (task 07). */
export const catalogCollections: CollectionConfig[] = [
  Thicknesses,
  ThicknessGroups,
  GlassTypes,
  ProcessingServices,
  Constructions,
  ShowerConfigs,
  Products,
  ObjectTypes,
  Cities,
];
