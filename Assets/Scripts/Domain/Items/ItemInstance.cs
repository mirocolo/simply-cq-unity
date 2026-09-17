namespace SimplyCQ.Domain
{
    /// <summary>背包/装备上的一件具体物品（定义 id + 数量）。</summary>
    public sealed class ItemInstance
    {
        public string DefId;
        public int Count = 1;

        public ItemInstance() { }

        public ItemInstance(string defId, int count)
        {
            DefId = defId;
            Count = count;
        }

        public ItemInstance Clone() { return new ItemInstance(DefId, Count); }

        public override string ToString() { return DefId + " x" + Count; }
    }
}
