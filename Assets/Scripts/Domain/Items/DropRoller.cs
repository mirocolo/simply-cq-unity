using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 摇掉落表。纯函数 + 注入 Rng，所以可复现、可无头测。
    ///
    /// 掉出装备时还会顺手摇一次【品质】：怪越高级越容易出好货。
    /// catalog / tuning 传 null 时退化成"全部白装"，老调用方不受影响。
    /// </summary>
    public static class DropRoller
    {
        public static void Roll(List<ItemDrop> table, Rng rng, List<ItemDropResult> outResults,
                                IItemCatalog catalog = null, LootTuning tuning = null, int monsterLevel = 1)
        {
            if (outResults == null) return;
            outResults.Clear();
            if (table == null || rng == null) return;

            LootTuning loot = tuning != null ? tuning : new LootTuning();

            for (int i = 0; i < table.Count; i++)
            {
                ItemDrop d = table[i];
                if (d == null || string.IsNullOrEmpty(d.ItemId)) continue;
                if (!rng.Chance(d.Chance)) continue;

                int count = rng.Range(d.Min, d.Max);
                if (count <= 0) continue;

                ItemDropResult r = new ItemDropResult();
                r.ItemId = d.ItemId;
                r.Count = count;
                r.Quality = RollQuality(d.ItemId, rng, catalog, loot, monsterLevel);
                outResults.Add(r);
            }
        }

        /// <summary>
        /// 只有装备才摇品质：药水和材料是成堆的，给它们摇品质既没意义、
        /// 又会让背包的堆叠规则变复杂。
        /// </summary>
        private static ItemQuality RollQuality(string itemId, Rng rng, IItemCatalog catalog,
                                               LootTuning tuning, int monsterLevel)
        {
            ItemDef def = catalog != null ? catalog.Get(itemId) : null;
            if (def == null || !def.IsEquip) return ItemQuality.White;

            ItemQuality q = tuning.Roll(rng, monsterLevel);
            return ItemQualityRules.Max(q, def.MinQuality);
        }
    }
}
