using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 传送员：站到 NPC 旁边，从菜单里挑一个目的地就过去（和传奇的传送员一个用法）。
    ///
    /// 和「踩传送点」的区别：踩点是走进某一格，传送员是**交互式选择** ——
    /// 所以两套都留着：镇子外靠走，镇子里靠传送员，洞窟这种远处可以直接买路过去。
    ///
    /// 所有失败路径都发事件给玩家看：附近没人、金币不够、目的地地图不存在。
    /// 换图本身的落地/占位/清怪交给 World.ChangeMap，不在这个系统里重写一遍 ——
    /// 和踩传送点走的是同一条路，不会出现"传送员过去和走过去的规则不一样"。
    /// </summary>
    public sealed class TeleportSystem : ISystem
    {
        /// <summary>和商人一致的交互距离（切比雪夫格）。</summary>
        public const int InteractRange = 2;

        private readonly IMapCatalog _maps;

        public TeleportSystem(IMapCatalog maps) { _maps = maps; }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            for (int i = 0; i < intents.Count; i++)
            {
                Intent it = intents[i];
                if (it.Kind == IntentKind.TeleportTo)
                    Use(world, world.Get(it.Actor), it.Slot, _maps);
            }
        }

        /// <summary>离 actor 最近、且在交互距离内的传送员。</summary>
        public static Entity NearestTeleporter(World world, Entity actor)
        {
            if (world == null || actor == null) return null;

            Entity best = null;
            int bestDist = int.MaxValue;
            foreach (Entity e in world.Entities)
            {
                if (e.Shop == null || !e.Shop.IsTeleporter) continue;
                if (!e.IsAlive) continue;
                int dist = actor.Pos.ChebyshevTo(e.Pos);
                if (dist > InteractRange) continue;
                if (dist < bestDist) { bestDist = dist; best = e; }
            }
            return best;
        }

        public static bool Use(World world, Entity who, int index, IMapCatalog maps)
        {
            if (world == null || who == null || !who.IsAlive) return false;

            Entity npc = NearestTeleporter(world, who);
            if (npc == null)
            {
                Refuse(world, who, "", "附近没有传送员");
                return false;
            }

            List<NpcTeleport> list = npc.Shop.Teleports;
            if (index < 0 || index >= list.Count) return false;

            NpcTeleport spot = list[index];
            if (spot == null || string.IsNullOrEmpty(spot.TargetMap))
            {
                Refuse(world, who, "", "这个目的地没配好");
                return false;
            }

            GameMap target = maps != null ? maps.GetMap(spot.TargetMap) : null;
            if (target == null)
            {
                Refuse(world, who, spot.TargetMap, "无法前往：" + spot.TargetMap);
                return false;
            }

            if (spot.Cost > 0 && who.Gold < spot.Cost)
            {
                Refuse(world, who, spot.TargetMap,
                    "路费不够（要 " + spot.Cost + "，你有 " + who.Gold + "）");
                return false;
            }

            // 先扣钱再走：ChangeMap 不会失败（落点由它与 PlacePlayer 一起兜底），
            // 所以这里不需要"扣了钱没走成"的补偿逻辑。
            // 同图和跨图的区别（要不要清怪）由 ChangeMap 自己分情况，这里不重复判断。
            if (spot.Cost > 0) who.Gold -= spot.Cost;

            world.ChangeMap(target, spot.TargetPos);
            return true;
        }

        private static void Refuse(World world, Entity who, string targetMap, string reason)
        {
            // 复用 PortalRefused：含义就是"传送没做成"，两边界面/飘字只需要一套处理
            world.Events.Publish(new PortalRefused
            {
                Id = who.Id, TargetMap = targetMap ?? "", Reason = reason
            });
        }
    }
}
