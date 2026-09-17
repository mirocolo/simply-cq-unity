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

    /// <summary>挥空了 / 被打的人不在攻击弧内。</summary>
    public struct AttackMissed
    {
        public ActorId Source;
        public ActorId Target;
    }

    /// <summary>地面掉出金币（Amount 是这一次掉落的数量，不一定是总量）。</summary>
    public struct GoldDropped
    {
        public ActorId ItemId;
        public TilePos At;
        public int Amount;
    }

    /// <summary>玩家捡到金币，Total 是捡完之后身上的总额。</summary>
    public struct GoldPicked
    {
        public ActorId By;
        public int Amount;
        public int Total;
    }

    public struct ExpGained
    {
        public ActorId Id;
        public int Amount;
        public int Total;
    }

    public struct LevelUp
    {
        public ActorId Id;
        public int Level;
    }

    public struct PlayerRespawned
    {
        public ActorId Id;
        public TilePos At;
    }

    public struct ItemDropped
    {
        public ActorId ItemId;
        public string DefId;
        public int Count;
        public TilePos At;
    }

    public struct ItemPicked
    {
        public ActorId By;
        public string DefId;
        public int Count;
    }

    /// <summary>捡不起来：背包满 / 超重 / 数据表里没这件东西。</summary>
    public struct PickupRefused
    {
        public ActorId By;
        public string DefId;
        public string Reason;
    }

    public struct ItemUsed
    {
        public ActorId By;
        public string DefId;
    }

    public struct InventoryChanged
    {
        public ActorId Id;
    }

    public struct EquipmentChanged
    {
        public ActorId Id;
        public EquipSlot Slot;
        public string DefId;
    }

    public struct ItemSold
    {
        public ActorId By;
        public string DefId;
        public int Count;
        public int Gold;
    }
}
