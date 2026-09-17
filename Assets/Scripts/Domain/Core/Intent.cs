namespace SimplyCQ.Domain
{
    public enum IntentKind
    {
        None = 0,
        Move = 1,
        Attack = 2,
        CastSkill = 3,
        UseItem = 4,
        Interact = 5
    }

    /// <summary>玩家（或以后 AI 玩家）每 tick 提出的「意图」。合法性由 Domain 判定，表现层无权直接改世界。</summary>
    public struct Intent
    {
        public EntityId Actor;
        public IntentKind Kind;
        public Dir Dir;
        public EntityId Target;
        public int Slot;

        public static Intent Move(EntityId actor, Dir dir)
        {
            Intent i = default(Intent);
            i.Actor = actor; i.Kind = IntentKind.Move; i.Dir = dir;
            return i;
        }

        public static Intent Attack(EntityId actor, Dir dir)
        {
            Intent i = default(Intent);
            i.Actor = actor; i.Kind = IntentKind.Attack; i.Dir = dir;
            return i;
        }
    }
}
