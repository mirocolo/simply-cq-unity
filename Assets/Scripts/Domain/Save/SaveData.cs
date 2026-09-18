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
        /// <summary>v2：装备带上品质（白/绿/蓝/紫）。v1 旧档读进来品质一律按白色处理。</summary>
        public const int Version2 = 2;

        public int Version = Version2;
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

        /// <summary>背包每格的品质（ItemQuality 的整数形式）。v1 存档里没有这一段 -> null -> 全部当白色。</summary>
        public int[] BagQualities = new int[Inventory.SlotCount];

        /// <summary>每件已穿装备的品质。</summary>
        public int[] GearQualities = new int[ItemDef.SlotCount];

        /// <summary>
        /// 安全地读一格品质：数组缺失（v1 旧档）、越界、或者被手改成了奇怪的数字，
        /// 一律退化成白色 —— 读档永远不该因为品质崩掉。
        /// </summary>
        public static ItemQuality QualityAt(int[] qualities, int index)
        {
            if (qualities == null || index < 0 || index >= qualities.Length) return ItemQuality.White;
            int v = qualities[index];
            if (v < 0 || v >= ItemQualityRules.Count) return ItemQuality.White;
            return (ItemQuality)v;
        }
    }
}
