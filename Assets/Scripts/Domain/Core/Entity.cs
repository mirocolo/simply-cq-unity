using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    public enum EntityKind
    {
        Player = 0,
        Monster = 1,
        Npc = 2,
        GroundItem = 3
    }

    public sealed class Entity
    {
        public ActorId Id;
        public EntityKind Kind;
        /// <summary>数据表里的 id（monsterId / npcId / itemId）。逻辑只认它。</summary>
        public string DefId;
        /// <summary>表现层用的精灵键。换成 CC0 素材时，只改数据表里的 sprite 字段，逻辑一行不动。</summary>
        public string SpriteId;
        public string Name;

        // ---- 位置 ----
        public TilePos Pos;
        public TilePos HomePos;
        public Dir Facing = Dir.Down;
        /// <summary>是否占格。地面掉落物不占格，玩家可以踩上去捡。</summary>
        public bool BlocksTile = true;

        // ---- 移动 ----
        /// <summary>走一格需要多少 tick（越小越快）。</summary>
        public int MoveSpeed = 3;
        public int MoveCooldown;

        // ---- 数值 ----
        public int Level = 1;
        public int Hp = 30;
        public int MaxHp = 30;
        /// <summary>有效攻击力（基础 + 装备）。战斗只读这个，由 StatCalculator 重算。</summary>
        public int MinDc = 1;
        public int MaxDc = 3;
        public int Ac;

        public int Mc;      // 魔法
        public int Sc;      // 道术
        public int Mac;     // 魔御
        public int Mp;
        public int MaxMp;

        // ---- 基础属性（不含装备）。升级、换装都改这里，然后重算有效值 ----
        public int BaseMinDc = 1;
        public int BaseMaxDc = 3;
        public int BaseAc;
        public int BaseMc;
        public int BaseSc;
        public int BaseMac;
        public int BaseMaxHp = 30;
        public int BaseMaxMp;

        // ---- 背包与装备 ----
        public Inventory Bag;
        public Equipment Gear;

        // ---- 成长 ----
        /// <summary>当前等级内已积累的经验。</summary>
        public int Exp;
        /// <summary>升到下一级还需要多少经验（由 LevelCurve 算好后写进来）。</summary>
        public int ExpToNextLevel = 40;
        /// <summary>玩家身上的金币。</summary>
        public int Gold;

        // ---- 被击杀后给击杀者的收益 ----
        public int ExpReward;
        public int GoldMin;
        public int GoldMax;
        public float GoldChance = 1f;

        // ---- 死亡状态 ----
        public ActorId Killer;
        /// <summary>死亡发生的 tick；-1 表示还活着。</summary>
        public long DeathTick = -1;
        /// <summary>死亡是否已经结算过（发经验、掉金币）。</summary>
        public bool DeathProcessed;
        /// <summary>玩家复活时刻。</summary>
        public long RespawnTick;
        /// <summary>最近一次挨打的 tick，用于判断脱战回血。</summary>
        public long LastDamagedTick = -100000;

        // ---- 地面掉落物 ----
        /// <summary>剩余存活 tick，到 0 消失（0 = 永不消失）。</summary>
        public int LifetimeTicks;
        /// <summary>地面掉落物的数量（金币用 Gold，物品用这个）。</summary>
        public int Count = 1;
        /// <summary>捡不起来的提示节流，避免站在上面每 tick 刷一次飘字。</summary>
        public int RefuseCooldown;

        // ---- 掉落表（由数据表填好，Domain 只负责摇）----
        public readonly List<ItemDrop> ItemDrops = new List<ItemDrop>();

        // ---- AI ----
        public int Vision = 5;
        public int AttackRange = 1;
        public int AttackInterval = 10;
        public int AttackCooldown;
        public bool Aggressive;
        /// <summary>离出生点超过这个距离就脱战回家。</summary>
        public int Leash = 12;
        public int AiThinkCooldown;
        public ActorId Target;
        public TilePos? WanderTarget;
        public int WanderFail;

        // ---- 本 tick 的决策（由 AiSystem 写入，由 MovementSystem 执行）----
        public Dir? WantsMove;
        public bool WantsAttack;

        // ---- 寻路缓存 ----
        public readonly List<TilePos> Path = new List<TilePos>();
        public TilePos PathGoal;
        public int RepathCounter;

        public bool IsAlive { get { return Hp > 0; } }
    }
}
