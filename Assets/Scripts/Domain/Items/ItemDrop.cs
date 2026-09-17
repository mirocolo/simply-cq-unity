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
    }
}
