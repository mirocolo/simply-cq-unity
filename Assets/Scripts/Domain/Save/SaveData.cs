using System;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 存档数据。刻意只用最朴素的可序列化字段（Domain 不引 UnityEngine，JsonUtility 在 Data 层用）。
    /// 只存"玩家自己的东西" —— 怪物、地面掉落物、刷怪进度都不存，重进按配置重新生成。
    /// </summary>
    [Serializable]
    public sealed class SaveData
    {
        public const int Version1 = 1;

        public int Version = Version1;
        public int Seed;
        public string MapId;
        public string SavedAt;

        public int Level = 1;
        public int Exp;
        public int ExpToNextLevel = 40;
        public int Gold;
        public int Hp;
        public int MaxHp;

        public int BaseMinDc = 1;
        public int BaseMaxDc = 3;
        public int BaseAc;
        public int BaseMaxHp = 30;

        public int X;
        public int Y;

        /// <summary>背包按格子存（48 格），保持摆位；空位用空字符串。</summary>
        public string[] BagIds = new string[Inventory.SlotCount];
        public int[] BagCounts = new int[Inventory.SlotCount];

        /// <summary>装备按部位存（下标就是 EquipSlot）。</summary>
        public string[] GearIds = new string[ItemDef.SlotCount];
        public int[] GearCounts = new int[ItemDef.SlotCount];
    }
}
