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

    /// <summary>
    /// 传送员的一个目的地。写在 npcs.json 的 teleports 里 —— 加一条就多一个可去的地方，不用碰代码。
    /// </summary>
    [Serializable]
    public sealed class NpcTeleport
    {
        /// <summary>目标地图 id。</summary>
        public string TargetMap;
        /// <summary>落点。数据自检会保证它可走、且不是传送点。</summary>
        public TilePos TargetPos;
        /// <summary>菜单上显示的名字（"幽暗石洞"），不填就用地图名。</summary>
        public string Name;
        /// <summary>路费。0 = 免费。</summary>
        public int Cost;
    }

    /// <summary>NPC 定义：名字 + 卖什么 + 能传送到哪。一个 NPC 可以只会一样，也可以两样都会。</summary>
    public sealed class NpcDef
    {
        public string Id;
        public string Name;
        public string SpriteId;
        public string Dialog;
        public readonly List<string> Stock = new List<string>();
        public readonly List<NpcTeleport> Teleports = new List<NpcTeleport>();

        public bool IsMerchant { get { return Stock.Count > 0; } }
        public bool IsTeleporter { get { return Teleports.Count > 0; } }
    }
}
