namespace SimplyCQ.Domain
{
    public struct EntitySpawned
    {
        public ActorId Id;
        public EntityKind Kind;
        public string DefId;
        public TilePos Pos;
    }

    public struct EntityRemoved
    {
        public ActorId Id;
        public EntityKind Kind;
    }

    public struct EntityMoved
    {
        public ActorId Id;
        public TilePos From;
        public TilePos To;
        public Dir Facing;
    }

    public struct EntityTeleported
    {
        public ActorId Id;
        public TilePos To;
    }

    public struct DamageDealt
    {
        public ActorId Source;
        public ActorId Target;
        public int Amount;
        public bool Crit;
    }

    public struct EntityDied
    {
        public ActorId Id;
        public ActorId Killer;
    }

    public struct LootDropped
    {
        public ActorId ItemId;
        public TilePos At;
    }

    public struct PlayerIntentRejected
    {
        public IntentKind Kind;
        public string Reason;
    }
}
