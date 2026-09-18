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

        /// <summary>
        /// 背包放不放得下。只有格子会被限制 —— 负重机制已按需求移除，
        /// 现在唯一的"捡不起来"就是格子满了。
        /// </summary>
        public bool CanAdd(ItemDef def, int count)
        {
            if (def == null || count <= 0) return false;
            return FreeSpaceFor(def) >= count;
        }

        /// <summary>
        /// 加物品，返回真正放进去的数量（可能小于 count）。
        /// quality 只对不可堆叠的装备有意义 —— 能堆叠的东西恒为白色，
        /// 所以不会出现「一堆药水里混进一件紫的」。
        /// </summary>
        public int Add(ItemDef def, int count, ItemQuality quality = ItemQuality.White)
        {
            if (def == null || count <= 0) return 0;
            int stack = def.MaxStack < 1 ? 1 : def.MaxStack;
            int added = 0;

            if (stack > 1)
            {
                for (int i = 0; i < SlotCount && added < count; i++)
                {
                    ItemInstance s = Slots[i];
                    if (s == null || s.DefId != def.Id || s.Quality != quality) continue;
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
                Slots[i] = new ItemInstance(def.Id, put, stack > 1 ? ItemQuality.White : quality);
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
