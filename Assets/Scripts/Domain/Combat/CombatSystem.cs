using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 战斗结算：谁打了谁、打没打中、掉多少血。
    /// 玩家靠 Attack 意图，怪物靠 AiSystem 置位的 WantsAttack —— 两者走同一套结算。
    /// </summary>
    public sealed class CombatSystem : ISystem
    {
        private readonly CombatTuning _tuning;

        public CombatSystem(CombatTuning tuning)
        {
            _tuning = tuning != null ? tuning : new CombatTuning();
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            // 1) 攻击冷却 + 脱战回血
            foreach (Entity e in world.Entities)
            {
                if (e.AttackCooldown > 0) e.AttackCooldown--;
            }
            Regenerate(world);

            // 2) 玩家的攻击意图
            for (int i = 0; i < intents.Count; i++)
            {
                Intent it = intents[i];
                if (it.Kind != IntentKind.Attack) continue;

                Entity actor = world.Get(it.Actor);
                if (actor == null || !actor.IsAlive) continue;
                actor.Facing = it.Dir;
                if (actor.AttackCooldown > 0) continue;
                Resolve(world, actor);
            }

            // 3) 怪物（AI 已经置位 WantsAttack）
            foreach (Entity e in world.Entities)
            {
                if (e.Kind != EntityKind.Monster) continue;
                if (!e.WantsAttack || !e.IsAlive) continue;
                if (e.AttackCooldown > 0) continue;
                Resolve(world, e);
            }
        }

        private void Regenerate(World world)
        {
            foreach (Entity e in world.Entities)
            {
                if (!e.IsAlive || e.MaxHp <= 0) continue;
                if (e.Hp >= e.MaxHp) continue;
                if (world.Tick - e.LastDamagedTick < _tuning.RegenDelayTicks) continue;

                int gain = (int)(e.MaxHp * _tuning.RegenPctPerTick + 0.5f);
                if (gain < 1) gain = 1;
                e.Hp += gain;
                if (e.Hp > e.MaxHp) e.Hp = e.MaxHp;

                // 蓝也一起回，不然放两个技能就没蓝了
                if (e.MaxMp > 0 && e.Mp < e.MaxMp)
                {
                    int mpGain = (int)(e.MaxMp * _tuning.RegenPctPerTick + 0.5f);
                    if (mpGain < 1) mpGain = 1;
                    e.Mp += mpGain;
                    if (e.Mp > e.MaxMp) e.Mp = e.MaxMp;
                }
            }
        }

        private void Resolve(World world, Entity attacker)
        {
            attacker.AttackCooldown = attacker.AttackInterval < 1 ? 1 : attacker.AttackInterval;

            // 先发"挥砍"事件：表现层靠它播刀光/前冲，普攻才"看得见"
            world.Events.Publish(new AttackSwing
            {
                Actor = attacker.Id,
                Dir = attacker.Facing,
                Range = attacker.AttackRange < 1 ? 1 : attacker.AttackRange
            });

            Entity target = PickTarget(world, attacker, attacker.AttackRange);

            if (target == null)
            {
                // 手上明明贴着怪、只是朝向不对：自动转身砍它。
                // 传奇里玩家也是"面向就是攻击方向"，不转身的话按了没反应，体验像坏了。
                target = PickNearestHostile(world, attacker);
                if (target != null)
                    attacker.Facing = DirHelper.FromDelta(target.Pos.X - attacker.Pos.X, target.Pos.Y - attacker.Pos.Y, attacker.Facing);
            }

            if (target == null)
            {
                world.Events.Publish(new AttackMissed { Source = attacker.Id, Target = ActorId.None });
                return;
            }

            DamageResult result = DamageCalculator.Roll(attacker, target, world.Rng, _tuning);
            if (!result.Hit)
            {
                world.Events.Publish(new AttackMissed { Source = attacker.Id, Target = target.Id });
                return;
            }

            ApplyDamage(world, attacker, target, result);
        }

        /// <summary>攻击弧内最近的一个敌人（射程可覆盖，技能会用到）。</summary>
        public static Entity PickTarget(World world, Entity attacker, int range)
        {
            Entity best = null;
            int bestDist = int.MaxValue;
            foreach (Entity candidate in world.Entities)
            {
                if (!IsHostile(attacker, candidate)) continue;
                if (!candidate.IsAlive) continue;
                if (!InAttackArc(attacker, candidate, range)) continue;

                int dist = attacker.Pos.ChebyshevTo(candidate.Pos);
                if (dist < bestDist) { bestDist = dist; best = candidate; }
            }
            return best;
        }

        /// <summary>攻击弧内最近的目标（技能用；和普攻共用同一套朝向判定）。</summary>
        public static Entity FindTargetInArc(World world, Entity attacker, int range)
        {
            return PickTarget(world, attacker, range);
        }

        /// <summary>攻击范围内最近的敌对目标（不看朝向，用来给"朝向不对"兜底）。</summary>
        private static Entity PickNearestHostile(World world, Entity attacker)
        {
            Entity best = null;
            int bestDist = int.MaxValue;
            int range = attacker.AttackRange < 1 ? 1 : attacker.AttackRange;

            foreach (Entity candidate in world.Entities)
            {
                if (!IsHostile(attacker, candidate)) continue;
                if (!candidate.IsAlive) continue;
                int dist = attacker.Pos.ChebyshevTo(candidate.Pos);
                if (dist == 0 || dist > range) continue;
                if (dist < bestDist) { bestDist = dist; best = candidate; }
            }
            return best;
        }

        /// <summary>近战只打「面向那一侧」的敌人，不做背刺。点积 &gt; 0 就是前方的半平面。</summary>
        public static bool InAttackArc(Entity attacker, Entity target)
        {
            return InAttackArc(attacker, target, attacker.AttackRange);
        }

        public static bool InAttackArc(Entity attacker, Entity target, int range)
        {
            int dx = target.Pos.X - attacker.Pos.X;
            int dy = target.Pos.Y - attacker.Pos.Y;
            int dist = Math.Max(Math.Abs(dx), Math.Abs(dy));
            int r = range < 1 ? 1 : range;
            if (dist == 0 || dist > r) return false;
            return dx * DirHelper.Dx(attacker.Facing) + dy * DirHelper.Dy(attacker.Facing) > 0;
        }

        public static bool IsHostile(Entity a, Entity b)
        {
            if (a == null || b == null || ReferenceEquals(a, b)) return false;
            if (a.Kind == EntityKind.Player) return b.Kind == EntityKind.Monster;
            if (a.Kind == EntityKind.Monster) return b.Kind == EntityKind.Player;
            return false;
        }

        public static void ApplyDamage(World world, Entity source, Entity target, DamageResult result)
        {
            target.Hp -= result.Amount;
            if (target.Hp < 0) target.Hp = 0;
            target.LastDamagedTick = world.Tick;
            if (source != null) target.Killer = source.Id;

            world.Events.Publish(new DamageDealt
            {
                Source = source != null ? source.Id : ActorId.None,
                Target = target.Id,
                Amount = result.Amount,
                Crit = result.Crit
            });

            if (target.Hp <= 0 && target.DeathTick < 0) target.DeathTick = world.Tick;
        }
    }
}
