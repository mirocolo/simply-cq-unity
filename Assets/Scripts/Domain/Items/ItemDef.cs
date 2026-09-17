using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    public enum ItemType
    {
        Consumable = 0,
        Equip = 1,
        Material = 2,
        Book = 3,
        Quest = 4
    }

    /// <summary>装备部位。M3 先做 8 格；设计里的完整版是 12~13 格，加在这里即可。</summary>
    public enum EquipSlot
    {
        None = 0,
        Weapon = 1,
        Armour = 2,
        Helmet = 3,
        Necklace = 4,
        Bracelet = 5,
        Ring = 6,
        Belt = 7,
        Boots = 8
    }

    /// <summary>物品定义（静态数据，来自 items.json）。</summary>
    public sealed class ItemDef
    {
        public string Id;
        public string Name;
        /// <summary>表现层用的图键。换 CC0 素材时只改这里。</summary>
        public string SpriteId;
        public ItemType Type;
        public EquipSlot Slot;

        public int MaxStack = 1;
        public int Price;
        public int LevelReq = 1;
        public string ClassReq;

        // ---- 装备加成 ----
        public int MinDc, MaxDc;
        public int Mc, Sc;
        public int Ac, Mac;
        public int BonusHp, BonusMp;

        // ---- 消耗品 ----
        public int HealHp, HealMp;

        public string Description;

        public bool IsEquip { get { return Type == ItemType.Equip && Slot != EquipSlot.None; } }

        public static int SlotCount { get { return 9; } }
    }

    /// <summary>
    /// 物品表。Domain 只认这个接口 —— 具体从 JSON、数据库还是代码里来，Domain 不关心。
    /// 这样物品定义怎么变，玩法逻辑都不用动。
    /// </summary>
    public interface IItemCatalog
    {
        ItemDef Get(string itemId);
        IEnumerable<ItemDef> All { get; }
    }
}
