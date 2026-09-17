namespace SimplyCQ.Domain
{
    /// <summary>
    /// 传奇式背包：格子 + 负重上限。
    /// 纯数据 + 纯逻辑（不管 UI 拖拽），所以可以无头测试。
    /// </summary>
    public sealed class Inventory
    {
        public const int Columns = 6;
        public const int Rows = 8;
        public const int SlotCount = Columns * Rows;

        public readonly ItemInstance[] Slots = new ItemInstance[SlotCount];

        /// <summary>负重上限。0 表示不限重。</summary>
        public int MaxWeight = 60;

        public ItemInstance At(int index)
        {
            if (index < 0 || index >= SlotCount) return null;
            return Slots[index];
        }

        public bool IsEmpty(int index) { return At(index) == null; }

        public int UsedSlots
        {
            get
            {
                int n = 0;
                for (int i = 0; i < SlotCount; i++) if (Slots[i] != null) n++;
                return n;
            }
        }

        public int WeightOf(IItemCatalog catalog)
        {
            int weight = 0;
            for (int i = 0; i < SlotCount; i++)
            {
                ItemInstance s = Slots[i];
                if (s == null) continue;
                ItemDef def = catalog != null ? catalog.Get(s.DefId) : null;
                weight += (def != null ? def.Weight : 1) * s.Count;
            }
            return weight;
        }

        /// <summary>还能塞下多少个这种物品（按堆叠上限算）。</summary>
        public int FreeSpaceFor(ItemDef def)
        {
            if (def == null) return 0;
            int space = 0;
            int stack = def.MaxStack < 1 ? 1 : def.MaxStack;
            for (int i = 0; i < SlotCount; i++)
            {
                ItemInstance s = Slots[i];
                if (s == null) space += stack;
                else if (s.DefId == def.Id && stack > 1) space += stack - s.Count;
            }
            return space;
        }

        /// <summary>背包里放不放得下 + 重量够不够。负重是第一道门槛，这正是传奇捡不动东西的原因。</summary>
        public bool CanAdd(ItemDef def, int count, IItemCatalog catalog)
        {
            if (def == null || count <= 0) return false;
            if (FreeSpaceFor(def) < count) return false;
            if (MaxWeight > 0)
            {
                int weight = WeightOf(catalog) + def.Weight * count;
                if (weight > MaxWeight) return false;
            }
            return true;
        }

        /// <summary>加物品，返回真正放进去的数量（可能小于 count）。</summary>
        public int Add(ItemDef def, int count)
        {
            if (def == null || count <= 0) return 0;
            int stack = def.MaxStack < 1 ? 1 : def.MaxStack;
            int added = 0;

            if (stack > 1)
            {
                for (int i = 0; i < SlotCount && added < count; i++)
                {
                    ItemInstance s = Slots[i];
                    if (s == null || s.DefId != def.Id) continue;
                    int can = stack - s.Count;
                    if (can <= 0) continue;
                    int put = count - added < can ? count - added : can;
                    s.Count += put;
                    added += put;
                }
            }

            for (int i = 0; i < SlotCount && added < count; i++)
            {
                if (Slots[i] != null) continue;
                int put = count - added < stack ? count - added : stack;
                Slots[i] = new ItemInstance(def.Id, put);
                added += put;
            }

            return added;
        }

        public bool RemoveAt(int index, int count)
        {
            ItemInstance s = At(index);
            if (s == null || count <= 0 || s.Count < count) return false;
            s.Count -= count;
            if (s.Count <= 0) Slots[index] = null;
            return true;
        }

        public int RemoveById(string defId, int count)
        {
            int removed = 0;
            for (int i = 0; i < SlotCount && removed < count; i++)
            {
                ItemInstance s = Slots[i];
                if (s == null || s.DefId != defId) continue;
                int take = count - removed < s.Count ? count - removed : s.Count;
                s.Count -= take;
                removed += take;
                if (s.Count <= 0) Slots[i] = null;
            }
            return removed;
        }

        public bool Move(int from, int to)
        {
            if (from == to) return false;
            if (from < 0 || from >= SlotCount || to < 0 || to >= SlotCount) return false;
            if (Slots[from] == null) return false;
            ItemInstance tmp = Slots[to];
            Slots[to] = Slots[from];
            Slots[from] = tmp;
            return true;
        }

        public int IndexOf(string defId)
        {
            for (int i = 0; i < SlotCount; i++)
                if (Slots[i] != null && Slots[i].DefId == defId) return i;
            return -1;
        }
    }
}
