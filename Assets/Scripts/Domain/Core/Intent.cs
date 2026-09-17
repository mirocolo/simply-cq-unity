namespace SimplyCQ.Domain
{
    public enum IntentKind
    {
        None = 0,
        Move = 1,
        Attack = 2,
        CastSkill = 3,
        UseItem = 4,
        Interact = 5,
        EquipItem = 6,
        UnequipItem = 7,
        DropItem = 8
    }

    /// <summary>玩家（或以后 AI 玩家）每 tick 提出的「意图」。合法性由 Domain 判定，表现层无权直接改世界。</summary>
    public struct Intent
    {
        public ActorId Actor;
        public IntentKind Kind;
        public Dir Dir;
        public ActorId Target;
        public int Slot;

        public static Intent Move(ActorId actor, Dir dir)
        {
            Intent i = default(Intent);
            i.Actor = actor; i.Kind = IntentKind.Move; i.Dir = dir;
            return i;
        }

        public static Intent Attack(ActorId actor, Dir dir)
        {
            Intent i = default(Intent);
            i.Actor = actor; i.Kind = IntentKind.Attack; i.Dir = dir;
            return i;
        }

        /// <summary>Slot：背包格下标；UnequipItem 时是 EquipSlot 的整数值。</summary>
        public static Intent BagAction(ActorId actor, IntentKind kind, int bagSlot)
        {
            Intent i = default(Intent);
            i.Actor = actor; i.Kind = kind; i.Slot = bagSlot;
            return i;
        }
    }
}
