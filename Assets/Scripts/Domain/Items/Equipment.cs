using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>身上穿着的装备，一个部位一件。</summary>
    public sealed class Equipment
    {
        private readonly ItemInstance[] _worn = new ItemInstance[ItemDef.SlotCount];

        public ItemInstance Get(EquipSlot slot)
        {
            int i = (int)slot;
            if (i < 0 || i >= _worn.Length) return null;
            return _worn[i];
        }

        public bool Has(EquipSlot slot) { return Get(slot) != null; }

        /// <summary>穿上一件，返回被换下来的那件（交给调用方放回背包）。</summary>
        public ItemInstance Set(EquipSlot slot, ItemInstance item)
        {
            int i = (int)slot;
            if (i <= 0 || i >= _worn.Length) return null;
            ItemInstance old = _worn[i];
            _worn[i] = item;
            return old;
        }

        public ItemInstance Clear(EquipSlot slot) { return Set(slot, null); }

        public IEnumerable<ItemInstance> All
        {
            get
            {
                for (int i = 1; i < _worn.Length; i++)
                    if (_worn[i] != null) yield return _worn[i];
            }
        }
    }
}
