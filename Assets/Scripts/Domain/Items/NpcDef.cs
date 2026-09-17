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

        /// <summary>至少 1 金，免得卖一堆垃圾都是 0。</summary>
        public int SellPriceOf(ItemDef def)
        {
            if (def == null) return 0;
            int price = (int)(def.Price * SellRatio);
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
