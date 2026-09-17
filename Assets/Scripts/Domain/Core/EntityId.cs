using System;

namespace SimplyCQ.Domain
{
    [Serializable]
    public struct EntityId : IEquatable<EntityId>
    {
        public int Value;

        public EntityId(int value) { Value = value; }

        public static readonly EntityId None = new EntityId(0);

        public bool IsValid { get { return Value != 0; } }

        public bool Equals(EntityId other) { return Value == other.Value; }
        public override bool Equals(object obj) { return obj is EntityId && Equals((EntityId)obj); }
        public override int GetHashCode() { return Value; }
        public override string ToString() { return "#" + Value; }
        public static bool operator ==(EntityId a, EntityId b) { return a.Value == b.Value; }
        public static bool operator !=(EntityId a, EntityId b) { return a.Value != b.Value; }
    }
}
