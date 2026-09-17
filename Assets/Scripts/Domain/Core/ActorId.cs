using System;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 实体的唯一句柄（玩家 / 怪 / NPC / 地面物品）。
    /// 注意：不叫 EntityId —— Unity 6 自带 UnityEngine.EntityId，
    /// 视图层同时 using UnityEngine 和 SimplyCQ.Domain 时会二义性（CS0104）。
    /// </summary>
    [Serializable]
    public struct ActorId : IEquatable<ActorId>
    {
        public int Value;

        public ActorId(int value) { Value = value; }

        public static readonly ActorId None = new ActorId(0);

        public bool IsValid { get { return Value != 0; } }

        public bool Equals(ActorId other) { return Value == other.Value; }
        public override bool Equals(object obj) { return obj is ActorId && Equals((ActorId)obj); }
        public override int GetHashCode() { return Value; }
        public override string ToString() { return "#" + Value; }
        public static bool operator ==(ActorId a, ActorId b) { return a.Value == b.Value; }
        public static bool operator !=(ActorId a, ActorId b) { return a.Value != b.Value; }
    }
}
