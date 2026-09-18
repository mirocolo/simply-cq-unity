using System;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 装备品质。注意这**不是**写在物品表里的固定属性，而是掉落那一刻摇出来的：
    /// 同一件「短剑」，可能白板出货，也可能出到史诗。这就是传奇里「同一件装备有人卖 100、有人卖 1000」的来源。
    /// </summary>
    public enum ItemQuality
    {
        White = 0,
        Green = 1,
        Blue = 2,
        Purple = 3
    }

    /// <summary>
    /// 品质规则：一档品质值多少钱、加多少属性。
    /// 所有倍率只在这里定义一次 —— 战斗（StatCalculator）、商店（ShopTuning）、界面（鼠标提示）
    /// 都调这里，才不会出现「面板显示 +5、实际只加了 +4」这种事。
    /// </summary>
    public static class ItemQualityRules
    {
        public const int Count = 4;

        /// <summary>买入价倍率：越稀有越贵。</summary>
        public static float PriceMultiplier(ItemQuality q)
        {
            switch (q)
            {
                case ItemQuality.Green: return 1.6f;
                case ItemQuality.Blue: return 2.6f;
                case ItemQuality.Purple: return 4.2f;
                default: return 1f;
            }
        }

        /// <summary>装备属性倍率：同等基础值下，品质越高越强。</summary>
        public static float StatMultiplier(ItemQuality q)
        {
            switch (q)
            {
                case ItemQuality.Green: return 1.25f;
                case ItemQuality.Blue: return 1.55f;
                case ItemQuality.Purple: return 1.9f;
                default: return 1f;
            }
        }

        /// <summary>把一条装备属性按品质放大。四舍五入到整数，界面上显示的就等于实际生效的。</summary>
        public static int Scale(int baseValue, ItemQuality q)
        {
            if (baseValue <= 0) return baseValue < 0 ? baseValue : 0;
            return (int)(baseValue * StatMultiplier(q) + 0.5f);
        }

        public static string DisplayName(ItemQuality q)
        {
            switch (q)
            {
                case ItemQuality.Green: return "精良";
                case ItemQuality.Blue: return "稀有";
                case ItemQuality.Purple: return "史诗";
                default: return "普通";
            }
        }

        /// <summary>数据表 / 存档里用的字符串 id。取首个字符也算合法（"g" / "green" 都认）。</summary>
        public static string Id(ItemQuality q)
        {
            switch (q)
            {
                case ItemQuality.Green: return "green";
                case ItemQuality.Blue: return "blue";
                case ItemQuality.Purple: return "purple";
                default: return "white";
            }
        }

        public static ItemQuality Parse(string s)
        {
            if (string.IsNullOrEmpty(s)) return ItemQuality.White;
            switch (s.Trim().ToLowerInvariant())
            {
                case "white":
                case "common":
                case "normal": return ItemQuality.White;
                case "green":
                case "fine": return ItemQuality.Green;
                case "blue":
                case "rare": return ItemQuality.Blue;
                case "purple":
                case "epic":
                case "legend": return ItemQuality.Purple;
                default: return ItemQuality.White;
            }
        }

        public static ItemQuality Max(ItemQuality a, ItemQuality b) { return (int)a >= (int)b ? a : b; }
    }

    /// <summary>
    /// 掉落品质调参。放在 balance.json 的 `loot` 段里，不写一行代码就能调「紫装多稀罕」。
    /// </summary>
    [Serializable]
    public sealed class LootTuning
    {
        /// <summary>白 / 绿 / 蓝 / 紫 的相对权重。</summary>
        public float[] qualityWeights = { 100f, 22f, 6f, 1.2f };

        /// <summary>怪每高 1 级，绿/蓝/紫 的权重各乘 (1 + 系数 × 等级 × 档位)。白装不吃这个加成。</summary>
        public float qualityLevelBonus = 0.05f;

        public void Clamp()
        {
            if (qualityWeights == null || qualityWeights.Length != ItemQualityRules.Count)
                qualityWeights = new float[] { 100f, 22f, 6f, 1.2f };

            bool any = false;
            for (int i = 0; i < qualityWeights.Length; i++)
            {
                if (qualityWeights[i] < 0f) qualityWeights[i] = 0f;
                if (qualityWeights[i] > 0f) any = true;
            }
            // 全是 0 会让 Roll 永远摇不出东西；直接退回默认表
            if (!any) qualityWeights = new float[] { 100f, 22f, 6f, 1.2f };

            if (qualityLevelBonus < 0f) qualityLevelBonus = 0f;
            if (qualityLevelBonus > 1f) qualityLevelBonus = 1f;
        }

        /// <summary>某个品质在指定怪等级下的实际权重。</summary>
        public float WeightOf(ItemQuality q, int monsterLevel)
        {
            float[] w = qualityWeights != null && qualityWeights.Length == ItemQualityRules.Count
                ? qualityWeights : new float[] { 100f, 22f, 6f, 1.2f };

            int tier = (int)q;
            if (tier <= 0) return w[0];

            int level = monsterLevel > 0 ? monsterLevel : 1;
            float boost = 1f + qualityLevelBonus * level * tier;
            return w[tier] * boost;
        }

        /// <summary>摇一次品质。</summary>
        public ItemQuality Roll(Rng rng)
        {
            return Roll(rng, 1);
        }

        public ItemQuality Roll(Rng rng, int monsterLevel)
        {
            float total = 0f;
            for (int i = 0; i < ItemQualityRules.Count; i++)
                total += WeightOf((ItemQuality)i, monsterLevel);
            if (total <= 0f) return ItemQuality.White;

            float pick = (rng != null ? rng.Value : 0f) * total;
            for (int i = 0; i < ItemQualityRules.Count; i++)
            {
                pick -= WeightOf((ItemQuality)i, monsterLevel);
                if (pick <= 0f) return (ItemQuality)i;
            }
            return ItemQuality.Purple;
        }
    }
}
