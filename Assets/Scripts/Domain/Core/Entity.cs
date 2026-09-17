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
        public EntityId Id;
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

        // ---- 移动 ----
        /// <summary>走一格需要多少 tick（越小越快）。</summary>
        public int MoveSpeed = 3;
        public int MoveCooldown;

        // ---- 数值（M2 战斗才会真正用起来）----
        public int Level = 1;
        public int Hp = 30;
        public int MaxHp = 30;
        public int MinDc = 1;
        public int MaxDc = 3;
        public int Ac;
        public int Exp;

        // ---- AI ----
        public int Vision = 5;
        public int AttackRange = 1;
        public int AttackInterval = 10;
        public int AttackCooldown;
        public bool Aggressive;
        /// <summary>离出生点超过这个距离就脱战回家。</summary>
        public int Leash = 12;
        public int AiThinkCooldown;
        public EntityId Target;
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
