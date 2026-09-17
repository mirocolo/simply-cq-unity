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
            }
        }

        private void Resolve(World world, Entity attacker)
        {
            attacker.AttackCooldown = attacker.AttackInterval < 1 ? 1 : attacker.AttackInterval;

            Entity target = PickTarget(world, attacker);
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

        private static Entity PickTarget(World world, Entity attacker)
        {
            Entity best = null;
            int bestDist = int.MaxValue;
            foreach (Entity candidate in world.Entities)
            {
                if (!IsHostile(attacker, candidate)) continue;
                if (!candidate.IsAlive) continue;
                if (!InAttackArc(attacker, candidate)) continue;

                int dist = attacker.Pos.ChebyshevTo(candidate.Pos);
                if (dist < bestDist) { bestDist = dist; best = candidate; }
            }
            return best;
        }

        /// <summary>近战只打「面向那一侧」的敌人，不做背刺。点积 &gt; 0 就是前方的半平面。</summary>
        public static bool InAttackArc(Entity attacker, Entity target)
        {
            int dx = target.Pos.X - attacker.Pos.X;
            int dy = target.Pos.Y - attacker.Pos.Y;
            int dist = Math.Max(Math.Abs(dx), Math.Abs(dy));
            int range = attacker.AttackRange < 1 ? 1 : attacker.AttackRange;
            if (dist == 0 || dist > range) return false;
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
