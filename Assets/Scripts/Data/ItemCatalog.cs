using System.Collections.Generic;
using SimplyCQ.Domain;

namespace SimplyCQ.Data
{
    /// <summary>
    /// items.json -> Domain 的 IItemCatalog。
    /// 字符串到枚举的转换只在这里做一次，Domain 之后只见强类型 —— 数据表写错了会在加载时报出来。
    /// </summary>
    public sealed class ItemCatalog : IItemCatalog
    {
        private readonly Dictionary<string, ItemDef> _byId = new Dictionary<string, ItemDef>();
        private readonly List<ItemDef> _all = new List<ItemDef>();

        public IEnumerable<ItemDef> All { get { return _all; } }
        public int Count { get { return _all.Count; } }

        public ItemDef Get(string itemId)
        {
            if (string.IsNullOrEmpty(itemId)) return null;
            ItemDef def;
            return _byId.TryGetValue(itemId, out def) ? def : null;
        }

        public bool Add(ItemDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.id)) return false;

            ItemDef def = new ItemDef();
            def.Id = dto.id;
            def.Name = string.IsNullOrEmpty(dto.name) ? dto.id : dto.name;
            def.SpriteId = string.IsNullOrEmpty(dto.sprite) ? dto.id : dto.sprite;
            def.Type = ParseType(dto.type);
            def.Slot = ParseSlot(dto.slot);
            def.MaxStack = dto.maxStack > 0 ? dto.maxStack : (def.Type == ItemType.Equip ? 1 : 99);
            def.Weight = dto.weight > 0 ? dto.weight : 1;
            def.Price = dto.price;
            def.LevelReq = dto.levelReq > 0 ? dto.levelReq : 1;
            def.ClassReq = dto.classReq;

            def.MinDc = dto.minDc;
            def.MaxDc = dto.maxDc;
            def.Mc = dto.mc;
            def.Sc = dto.sc;
            def.Ac = dto.ac;
            def.Mac = dto.mac;
            def.BonusHp = dto.bonusHp;
            def.BonusMp = dto.bonusMp;
            def.HealHp = dto.healHp;
            def.HealMp = dto.healMp;
            def.Description = dto.desc;

            _byId[def.Id] = def;
            _all.Add(def);
            return true;
        }

        public static ItemCatalog FromFile(ItemFile file)
        {
            ItemCatalog catalog = new ItemCatalog();
            if (file == null || file.items == null) return catalog;
            for (int i = 0; i < file.items.Length; i++) catalog.Add(file.items[i]);
            return catalog;
        }

        private static ItemType ParseType(string s)
        {
            if (string.IsNullOrEmpty(s)) return ItemType.Material;
            switch (s.Trim().ToLowerInvariant())
            {
                case "consumable": return ItemType.Consumable;
                case "equip": return ItemType.Equip;
                case "book": return ItemType.Book;
                case "quest": return ItemType.Quest;
                default: return ItemType.Material;
            }
        }

        private static EquipSlot ParseSlot(string s)
        {
            if (string.IsNullOrEmpty(s)) return EquipSlot.None;
            switch (s.Trim().ToLowerInvariant())
            {
                case "weapon": return EquipSlot.Weapon;
                case "armour":
                case "armor": return EquipSlot.Armour;
                case "helmet": return EquipSlot.Helmet;
                case "necklace": return EquipSlot.Necklace;
                case "bracelet": return EquipSlot.Bracelet;
                case "ring": return EquipSlot.Ring;
                case "belt": return EquipSlot.Belt;
                case "boots": return EquipSlot.Boots;
                default: return EquipSlot.None;
            }
        }
    }
}
