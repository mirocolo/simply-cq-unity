using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 地面掉落物：存活倒计时 + 玩家踩上去自动捡。
    /// 金币无条件捡；物品要看背包格子和负重 —— 捡不动就留在原地并给一次提示。
    /// 这正是传奇"捡了一堆东西走不动"的那种感觉，只是门槛从"点击"换成了"自动"。
    /// </summary>
    public sealed class LootSystem : ISystem
    {
        private readonly IItemCatalog _catalog;
        private readonly List<Entity> _expired = new List<Entity>();

        public LootSystem(IItemCatalog catalog)
        {
            _catalog = catalog;
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            _expired.Clear();
            Entity player = world.Player;

            // 拾取会 Despawn，所以遍历快照
            foreach (Entity item in world.SnapshotEntities())
            {
                if (item.Kind != EntityKind.GroundItem) continue;

                if (item.RefuseCooldown > 0) item.RefuseCooldown--;

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

        private void Pickup(World world, Entity player, Entity item)
        {
            if (item.Gold > 0)
            {
                player.Gold += item.Gold;
                world.Events.Publish(new GoldPicked { By = player.Id, Amount = item.Gold, Total = player.Gold });
                world.Despawn(item.Id);
                return;
            }

            ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
            if (def == null)
            {
                Refuse(world, player, item, "数据表里没有这件物品");
                return;
            }
            if (player.Bag == null)
            {
                Refuse(world, player, item, "没有背包");
                return;
            }
            if (!player.Bag.CanAdd(def, item.Count, _catalog))
            {
                bool noRoom = player.Bag.FreeSpaceFor(def) < item.Count;
                Refuse(world, player, item, noRoom ? "背包满了" : "负重不够");
                return;
            }

            int added = player.Bag.Add(def, item.Count);
            if (added <= 0)
            {
                Refuse(world, player, item, "背包满了");
                return;
            }

            world.Events.Publish(new ItemPicked { By = player.Id, DefId = def.Id, Count = added });
            world.Events.Publish(new InventoryChanged { Id = player.Id });
            world.Despawn(item.Id);
        }

        private static void Refuse(World world, Entity player, Entity item, string reason)
        {
            if (item.RefuseCooldown > 0) return;
            item.RefuseCooldown = 20;   // 2 秒提醒一次，别每 tick 刷屏
            world.Events.Publish(new PickupRefused { By = player.Id, DefId = item.DefId, Reason = reason });
        }
    }
}
