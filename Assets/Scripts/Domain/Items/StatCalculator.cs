namespace SimplyCQ.Domain
{
    /// <summary>
    /// 有效属性 = 基础属性 + 装备加成（装备加成按【每一件自己的品质】放大）。
    /// 装备变动、升级之后重算一次；战斗系统只读 Entity 上的有效值，不用关心装备。
    /// </summary>
    public static class StatCalculator
    {
        public static void Apply(Entity e, IItemCatalog catalog)
        {
            if (e == null) return;

            int minDc = e.BaseMinDc;
            int maxDc = e.BaseMaxDc;
            int ac = e.BaseAc;
            int mc = e.BaseMc;
            int sc = e.BaseSc;
            int mac = e.BaseMac;
            int maxHp = e.BaseMaxHp;
            int maxMp = e.BaseMaxMp;

            if (e.Gear != null && catalog != null)
            {
                foreach (ItemInstance worn in e.Gear.All)
                {
                    ItemDef def = catalog.Get(worn.DefId);
                    if (def == null) continue;

                    // 关键：这里用的必须是"这一件"的品质，不是物品表的默认值 ——
                    // 同样一件短剑，史诗出货就该比白板强。
                    ItemQuality q = worn.Quality;
                    minDc += ItemQualityRules.Scale(def.MinDc, q);
                    maxDc += ItemQualityRules.Scale(def.MaxDc, q);
                    ac += ItemQualityRules.Scale(def.Ac, q);
                    mc += ItemQualityRules.Scale(def.Mc, q);
                    sc += ItemQualityRules.Scale(def.Sc, q);
                    mac += ItemQualityRules.Scale(def.Mac, q);
                    maxHp += ItemQualityRules.Scale(def.BonusHp, q);
                    maxMp += ItemQualityRules.Scale(def.BonusMp, q);
                }
            }

            e.MinDc = minDc;
            e.MaxDc = maxDc < minDc ? minDc : maxDc;
            e.Ac = ac;
            e.Mc = mc;
            e.Sc = sc;
            e.Mac = mac;
            e.MaxHp = maxHp < 1 ? 1 : maxHp;
            e.MaxMp = maxMp < 0 ? 0 : maxMp;

            if (e.Hp > e.MaxHp) e.Hp = e.MaxHp;
            if (e.Mp > e.MaxMp) e.Mp = e.MaxMp;
        }
    }
}
