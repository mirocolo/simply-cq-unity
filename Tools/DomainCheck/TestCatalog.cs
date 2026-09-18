using System.Collections.Generic;
using SimplyCQ.Domain;

namespace DomainCheck
{
    /// <summary>
    /// 给自检用的最小物品表。
    /// Domain 只认 IItemCatalog 接口，所以这里完全不用碰 Data 层（那边依赖 UnityEngine）。
    /// </summary>
    internal sealed class TestCatalog : IItemCatalog
    {
        private readonly Dictionary<string, ItemDef> _byId = new Dictionary<string, ItemDef>();

        public IEnumerable<ItemDef> All { get { return _byId.Values; } }
        public int Count { get { return _byId.Count; } }

        public ItemDef Get(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return null;
            ItemDef def;
            return _byId.TryGetValue(itemId, out def) ? def : null;
        }

        public ItemDef Equip(string id, EquipSlot slot, int minDc, int maxDc, int ac,
                             int levelReq = 1, int bonusHp = 0, ItemQuality minQuality = ItemQuality.White,
                             int critBonus = 0, int hasteBonus = 0)
        {
            ItemDef d = new ItemDef();
            d.Id = id; d.Name = id; d.SpriteId = id;
            d.Type = ItemType.Equip; d.Slot = slot; d.MaxStack = 1;
            d.MinDc = minDc; d.MaxDc = maxDc; d.Ac = ac;
            d.LevelReq = levelReq; d.BonusHp = bonusHp;
            d.MinQuality = minQuality;
            d.CritBonus = critBonus; d.HasteBonus = hasteBonus;
            _byId[id] = d;
            return d;
        }

        public ItemDef Potion(string id, int healHp)
        {
            ItemDef d = new ItemDef();
            d.Id = id; d.Name = id; d.SpriteId = id;
            d.Type = ItemType.Consumable; d.MaxStack = 99;
            d.HealHp = healHp;
            _byId[id] = d;
            return d;
        }

        public ItemDef Material(string id)
        {
            ItemDef d = new ItemDef();
            d.Id = id; d.Name = id; d.SpriteId = id;
            d.Type = ItemType.Material; d.MaxStack = 99;
            _byId[id] = d;
            return d;
        }
    }
}
