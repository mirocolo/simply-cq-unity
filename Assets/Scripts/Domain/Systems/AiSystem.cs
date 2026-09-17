using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 怪物 AI（M1 版本）：巡逻游荡 + 主动怪追玩家。
    /// 只负责「写下想干什么」，真正移动由 MovementSystem 执行。
    /// </summary>
    public sealed class AiSystem : ISystem
    {
        /// <summary>每隔多少 tick 思考一次（不是每 tick，省 CPU）。</summary>
        public int ThinkInterval = 2;

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            foreach (Entity e in world.Entities)
            {
                if (e.Kind != EntityKind.Monster) continue;

                if (e.AiThinkCooldown > 0)
                {
                    // 非思考 tick：保留上一次的移动意图。
                    // 每 tick 都清空的话，怪的移动节奏会被思考间隔拖慢一半。
                    e.AiThinkCooldown--;
                    continue;
                }
                e.AiThinkCooldown = ThinkInterval < 1 ? 1 : ThinkInterval;

                // 只有思考 tick 才重新决策；WantsMove 由 MovementSystem 消费
                e.WantsMove = null;
                e.WantsAttack = false;

                Entity target = ResolveTarget(world, e);
                if (target != null)
                {
                    if (e.Pos.ChebyshevTo(target.Pos) <= e.AttackRange)
                    {
                        e.Facing = DirHelper.FromDelta(target.Pos.X - e.Pos.X, target.Pos.Y - e.Pos.Y, e.Facing);
                        e.WantsAttack = true;   // M2 才会真正结算伤害
                        continue;
                    }

                    TilePos destination = AdjacentFreeTile(world, e, target.Pos);
                    Dir? step = NextStep(world, e, destination);
                    if (step != null) e.WantsMove = step;
                    continue;
                }

                Wander(world, e);
            }
        }

        private static Entity ResolveTarget(World world, Entity e)
        {
            Entity player = world.Player;
            if (e.Aggressive && player != null && player.IsAlive && e.Pos.ChebyshevTo(player.Pos) <= e.Vision)
                e.Target = player.Id;

            if (!e.Target.IsValid) return null;

            Entity target = world.Get(e.Target);
            if (target == null || !target.IsAlive)
            {
                e.Target = ActorId.None;
                return null;
            }

            if (e.Pos.ChebyshevTo(e.HomePos) > e.Leash)
            {
                e.Target = ActorId.None;
                return null;
            }

            return target;
        }

        private void Wander(World world, Entity e)
        {
            if (e.WanderTarget == null)
            {
                TilePos candidate = e.HomePos + new TilePos(world.Rng.Range(-3, 3), world.Rng.Range(-3, 3));
                if (candidate != e.HomePos && world.Map.IsWalkable(candidate))
                {
                    e.WanderTarget = candidate;
                    e.WanderFail = 0;
                }
            }

            if (e.WanderTarget == null) return;

            if (e.Pos == e.WanderTarget.Value)
            {
                e.WanderTarget = null;
                return;
            }

            Dir? step = NextStep(world, e, e.WanderTarget.Value);
            if (step == null)
            {
                e.WanderFail++;
                if (e.WanderFail >= 3) e.WanderTarget = null;
            }
            else
            {
                e.WantsMove = step;
            }
        }

        private static TilePos AdjacentFreeTile(World world, Entity e, TilePos target)
        {
            TilePos best = target;
            int bestDist = int.MaxValue;
            for (int d = 0; d < DirHelper.Count; d++)
            {
                TilePos p = target + DirHelper.Delta((Dir)d);
                if (!world.CanWalk(p, e)) continue;
                int dist = p.ChebyshevTo(e.Pos);
                if (dist < bestDist) { bestDist = dist; best = p; }
            }
            return best;
        }

        private static Dir? NextStep(World world, Entity e, TilePos goal)
        {
            e.RepathCounter--;
            bool stale = e.Path.Count == 0 || e.PathGoal != goal || e.RepathCounter <= 0;

            if (stale)
            {
                e.RepathCounter = 4;
                e.PathGoal = goal;
                bool found = world.Paths.Find(e.Pos, goal, p => !world.CanWalk(p, e), e.Path);
                if (!found || e.Path.Count == 0)
                {
                    e.Path.Clear();
                    return null;
                }
            }

            while (e.Path.Count > 0 && e.Path[0] == e.Pos) e.Path.RemoveAt(0);
            if (e.Path.Count == 0) return null;

            TilePos next = e.Path[0];
            int dx = next.X - e.Pos.X;
            int dy = next.Y - e.Pos.Y;
            if (dx == 0 && dy == 0) return null;
            return DirHelper.FromDelta(dx, dy, e.Facing);
        }
    }
}
