namespace SimplyCQ.Domain
{
    /// <summary>掉落表里的一条：掉什么、多大几率、掉几个。</summary>
    public sealed class ItemDrop
    {
        public string ItemId;
        public float Chance = 1f;
        public int Min = 1;
        public int Max = 1;
    }

    public struct ItemDropResult
    {
        public string ItemId;
        public int Count;
        /// <summary>掉落那一刻摇出来的品质（只有装备会是非白色）。</summary>
        public ItemQuality Quality;

        public ItemDropResult(string itemId, int count, ItemQuality quality)
        {
            ItemId = itemId;
            Count = count;
            Quality = quality;
        }
    }
}
