import { ItemDef } from "../../../types/game";
import { DEFS as equipmentDefs } from "./equipment";
import { DEFS as specialRingDefs } from "./specialRings";
import { DEFS as consumableDefs } from "./consumables";
import { DEFS as materialDefs } from "./materials";

export const ITEM_DEFINITIONS: Record<string, ItemDef> = {
  ...equipmentDefs,
  ...specialRingDefs,
  ...consumableDefs,
  ...materialDefs,
};

export { equipmentDefs, specialRingDefs, consumableDefs, materialDefs };
