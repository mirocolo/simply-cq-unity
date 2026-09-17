namespace SimplyCQ.Domain
{
    public struct EntitySpawned
    {
        public EntityId Id;
        public EntityKind Kind;
        public string DefId;
        public TilePos Pos;
    }

    public struct EntityRemoved
    {
        public EntityId Id;
        public EntityKind Kind;
    }

    public struct EntityMoved
    {
        public EntityId Id;
        public TilePos From;
        public TilePos To;
        public Dir Facing;
    }

    public struct EntityTeleported
    {
        public EntityId Id;
        public TilePos To;
    }

    public struct DamageDealt
    {
        public EntityId Source;
        public EntityId Target;
        public int Amount;
        public bool Crit;
    }

    public struct EntityDied
    {
        public EntityId Id;
        public EntityId Killer;
    }

    public struct LootDropped
    {
        public EntityId ItemId;
        public TilePos At;
    }

    public struct PlayerIntentRejected
    {
        public IntentKind Kind;
        public string Reason;
    }
}
