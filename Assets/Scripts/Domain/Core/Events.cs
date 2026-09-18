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

    /// <summary>挥砍动作（普攻）。表现层用它播刀光 + 前冲，让普攻"看得见"。</summary>
    public struct AttackSwing
    {
        public ActorId Actor;
        public Dir Dir;
        public int Range;
    }

    public struct SkillCast
    {
        public ActorId Caster;
        public string SkillId;
        public Dir Dir;
        public int TargetCount;
        public bool Success;
    }

    public struct SkillLearned
    {
        public ActorId Id;
        public string SkillId;
        public string SkillName;
    }

    public struct SkillRefused
    {
        public ActorId Id;
        public string SkillId;
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

    public struct ItemBought
    {
        public ActorId By;
        public string DefId;
        public int Count;
        public int Gold;
    }

    /// <summary>交易没做成（金币不够 / 背包满了 / 附近没商人）—— 必须显示给玩家。</summary>
    public struct ShopRefused
    {
        public ActorId By;
        public string Reason;
    }

    /// <summary>换图成功。表现层收到它要重新绑地表、重算相机边界、清掉上一张图的飘字与特效。</summary>
    public struct MapChanged
    {
        public string FromMapId;
        public string ToMapId;
    }

    /// <summary>传送没做成（目标地图不存在）。和别的「拒绝」一样，必须给玩家可见反馈。</summary>
    public struct PortalRefused
    {
        public ActorId Id;
        public string TargetMap;
        public string Reason;
    }
}
