namespace SimplyCQ.Domain
{
    /// <summary>背包/装备上的一件具体物品（定义 id + 数量 + 品质）。</summary>
    public sealed class ItemInstance
    {
        public string DefId;
        public int Count = 1;

        /// <summary>
        /// 品质是**这一件**的属性，不是物品表的属性 —— 掉落那一刻摇出来的。
        /// 药水 / 材料这类可堆叠物永远是 White（不可堆叠的装备才摇品质，所以不会出现「一堆里混着不同品质」）。
        /// </summary>
        public ItemQuality Quality = ItemQuality.White;

        public ItemInstance() { }

        public ItemInstance(string defId, int count, ItemQuality quality = ItemQuality.White)
        {
            DefId = defId;
            Count = count;
            Quality = quality;
        }

        public ItemInstance Clone() { return new ItemInstance(DefId, Count, Quality); }

        public override string ToString() { return DefId + " x" + Count; }
    }
}
