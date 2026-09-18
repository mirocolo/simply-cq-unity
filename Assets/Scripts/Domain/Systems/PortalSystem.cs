using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 传送点：玩家【走进】portals 表里那一格就换图。
    ///
    /// 判定用的是「同一张图里位置刚刚变了」，而不是「站在传送点上」——
    /// 这一点很关键，否则：
    ///   · 切图落地时如果目标格恰好也是传送点，会立刻被弹回去，来回死循环；
    ///   · 读档 / 复活这类外部摆位会被误判成「走进传送点」。
    /// 所以首 tick 只记录不判定，ChangeMap 之后也立刻把记录刷成落地位置。
    ///
    /// 注意：本系统只读 world.Player，【不要】在这里包 foreach (world.SnapshotEntities()) ——
    /// 那个 buffer 是复用的，而 ChangeMap 内部要用它做一次遍历。
    /// </summary>
    public sealed class PortalSystem : ISystem
    {
        private readonly IMapCatalog _maps;

        private string _lastMapId = "";
        private TilePos _lastPos;
        private bool _hasLast;

        public PortalSystem(IMapCatalog maps)
        {
            _maps = maps;
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            Entity p = world.Player;
            if (p == null)
            {
                _hasLast = false;
                return;
            }

            bool sameMap = _hasLast && world.Map.Id == _lastMapId;
            bool entered = sameMap && p.Pos != _lastPos;

            _lastMapId = world.Map.Id;
            _lastPos = p.Pos;
            _hasLast = true;

            // 死了不能传送；也不要把死亡期间的位置变化当成"走进传送点"
            if (!entered || !p.IsAlive) return;
            if (world.Map.Portals.Count == 0) return;

            List<Portal> portals = world.Map.Portals;
            for (int i = 0; i < portals.Count; i++)
            {
                Portal portal = portals[i];
                if (portal.At != p.Pos) continue;

                GameMap target = _maps != null ? _maps.GetMap(portal.TargetMap) : null;
                if (target == null)
                {
                    world.Events.Publish(new PortalRefused
                    {
                        Id = p.Id,
                        TargetMap = portal.TargetMap,
                        Reason = "无法前往：" + portal.TargetMap
                    });
                    return;
                }

                world.ChangeMap(target, portal.TargetPos);

                // 落地那一格如果正好也是传送点，别让它下一 tick 再触发一次
                _lastMapId = world.Map.Id;
                if (world.Player != null) _lastPos = world.Player.Pos;
                return;
            }
        }
    }
}
