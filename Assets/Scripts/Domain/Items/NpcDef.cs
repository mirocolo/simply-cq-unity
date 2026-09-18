using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>商店经济数值。</summary>
    [Serializable]
    public sealed class ShopTuning
    {
        /// <summary>卖给商人能拿回原价的比例（传奇大概三到五成）。</summary>
        public float SellRatio = 0.4f;

        public void Clamp()
        {
            if (SellRatio < 0f) SellRatio = 0f;
            if (SellRatio > 2f) SellRatio = 2f;
        }

        /// <summary>
        /// 买入价 = 物品表里的基础价 × 品质倍率。
        /// 逻辑层和界面都调这一个方法，才不会出现「界面说 100、扣了 260」。
        /// </summary>
        public int BuyPriceOf(ItemDef def, ItemQuality quality)
        {
            if (def == null || def.Price <= 0) return 1;
            int price = (int)(def.Price * ItemQualityRules.PriceMultiplier(quality) + 0.5f);
            return price < 1 ? 1 : price;
        }

        /// <summary>卖价 = 买入价 × 回收比例。至少 1 金，免得卖一堆垃圾都是 0。</summary>
        public int SellPriceOf(ItemDef def, ItemQuality quality)
        {
            if (def == null) return 0;
            int price = (int)(BuyPriceOf(def, quality) * SellRatio);
            return price < 1 ? 1 : price;
        }
    }

    /// <summary>NPC 定义：名字 + 卖什么。</summary>
    public sealed class NpcDef
    {
        public string Id;
        public string Name;
        public string SpriteId;
        public string Dialog;
        public readonly List<string> Stock = new List<string>();

        public bool IsMerchant { get { return Stock.Count > 0; } }
    }
}
