using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 刷怪：每个刷怪区维持 Max 只。怪物定义在数据表里，
    /// 所以这里通过工厂委托注入 —— Domain 不认识任何具体怪物。
    /// </summary>
    public sealed class SpawnerSystem : ISystem
    {
        private readonly Func<string, Entity> _factory;

        public SpawnerSystem(Func<string, Entity> factory)
        {
            if (factory == null) throw new ArgumentNullException("factory");
            _factory = factory;
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            List<Spawner> spawners = world.Map.Spawners;
            for (int i = 0; i < spawners.Count; i++)
            {
                Spawner s = spawners[i];
                PruneDead(world, s);

                if (s.Alive.Count >= s.Max) continue;

                if (s.Timer > 0)
                {
                    s.Timer--;
                    continue;
                }
                s.Timer = s.IntervalTicks < 1 ? 1 : s.IntervalTicks;

                Entity e = _factory(s.MonsterId);
                if (e == null) continue;

                TilePos at = world.FindFreeTileNear(s.RandomTile(world.Rng), 10);
                if (!world.Map.IsWalkable(at)) continue;
                if (world.IsOccupied(at)) continue;

                e.Pos = at;
                e.HomePos = at;
                world.Spawn(e);
                s.Alive.Add(e.Id);
            }
        }

        private static void PruneDead(World world, Spawner s)
        {
            for (int k = s.Alive.Count - 1; k >= 0; k--)
            {
                if (world.Get(s.Alive[k]) == null) s.Alive.RemoveAt(k);
            }
        }
    }
}
