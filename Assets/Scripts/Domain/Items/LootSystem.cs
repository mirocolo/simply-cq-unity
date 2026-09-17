using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 地面掉落物：存活倒计时 + 玩家踩上去自动捡。
    /// M2 只有金币；M3 加了背包/负重之后，装备类掉落会改成「按键/点击才捡」。
    /// </summary>
    public sealed class LootSystem : ISystem
    {
        private readonly List<Entity> _expired = new List<Entity>();

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            _expired.Clear();

            Entity player = world.Player;

            // 拾取会 Despawn，所以遍历快照
            foreach (Entity item in world.SnapshotEntities())
            {
                if (item.Kind != EntityKind.GroundItem) continue;

                if (item.LifetimeTicks > 0)
                {
                    item.LifetimeTicks--;
                    if (item.LifetimeTicks <= 0)
                    {
                        _expired.Add(item);
                        continue;
                    }
                }

                if (player == null || !player.IsAlive) continue;
                if (player.Pos != item.Pos) continue;
                Pickup(world, player, item);
            }

            for (int i = 0; i < _expired.Count; i++) world.Despawn(_expired[i].Id);
        }

        private static void Pickup(World world, Entity player, Entity item)
        {
            if (item.Gold > 0)
            {
                player.Gold += item.Gold;
                world.Events.Publish(new GoldPicked { By = player.Id, Amount = item.Gold, Total = player.Gold });
            }
            world.Despawn(item.Id);
        }
    }
}
