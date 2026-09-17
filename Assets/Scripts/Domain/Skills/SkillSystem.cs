using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 技能：按等级自动学会（技能书留到后面做），按快捷栏释放。
    /// 被动的加成在学习的那一刻加到基础属性上，之后跟着存档走，不会重复加。
    /// </summary>
    public sealed class SkillSystem : ISystem
    {
        /// <summary>快捷栏格数（按键 1..6）。</summary>
        public const int BarSlots = 6;

        private readonly ISkillCatalog _skills;
        private readonly IItemCatalog _items;
        private readonly CombatTuning _tuning;

        public SkillSystem(ISkillCatalog skills, IItemCatalog items, CombatTuning tuning)
        {
            _skills = skills;
            _items = items;
            _tuning = tuning != null ? tuning : new CombatTuning();
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            TickCooldowns(world);

            // 按等级自动学（不依赖升级事件，读档后也能补齐）
            foreach (Entity e in world.Entities)
            {
                if (e.Kind != EntityKind.Player) continue;
                AutoLearn(world, e);
            }

            for (int i = 0; i < intents.Count; i++)
            {
                Intent it = intents[i];
                if (it.Kind != IntentKind.CastSkill) continue;
                Cast(world, world.Get(it.Actor), it.Slot, _skills, _tuning);
            }
        }

        private static void TickCooldowns(World world)
        {
            foreach (Entity e in world.Entities)
            {
                if (e.SkillCooldowns.Count == 0) continue;
                List<string> keys = _scratch;
                keys.Clear();
                foreach (KeyValuePair<string, int> pair in e.SkillCooldowns) keys.Add(pair.Key);
                for (int i = 0; i < keys.Count; i++)
                {
                    string key = keys[i];
                    int left = e.SkillCooldowns[key] - 1;
                    if (left <= 0) e.SkillCooldowns.Remove(key);
                    else e.SkillCooldowns[key] = left;
                }
            }
        }

        private static readonly List<string> _scratch = new List<string>();

        private void AutoLearn(World world, Entity e)
        {
            if (_skills == null) return;

            foreach (SkillDef def in _skills.All)
            {
                if (def == null || def.Kind != SkillKind.Passive && def.Kind != SkillKind.Active) continue;
                if (!string.IsNullOrEmpty(def.ClassId) && def.ClassId != e.ClassId) continue;
                if (def.LearnLevel > e.Level) continue;
                if (e.LearnedSkills.Contains(def.Id)) continue;

                Learn(world, e, def, _items);
            }
        }

        /// <summary>学一个技能：被动立刻加到基础属性上，然后重算有效属性。</summary>
        public static void Learn(World world, Entity e, SkillDef def, IItemCatalog items)
        {
            if (e == null || def == null) return;
            if (e.LearnedSkills.Contains(def.Id)) return;

            e.LearnedSkills.Add(def.Id);

            e.BaseMinDc += def.BonusMinDc;
            e.BaseMaxDc += def.BonusMaxDc;
            e.BaseAc += def.BonusAc;
            e.HitBonus += def.BonusHit;
            StatCalculator.Apply(e, items);   // 必须带着装备重算，否则被动一学就把装备加成算没了

            world.Events.Publish(new SkillLearned { Id = e.Id, SkillId = def.Id, SkillName = def.Name });
        }

        /// <summary>快捷栏第 slot 格对应的技能（按学习顺序）。</summary>
        public static SkillDef BarSkill(Entity e, int slot, ISkillCatalog catalog)
        {
            if (e == null || catalog == null) return null;
            if (slot < 0 || slot >= BarSlots) return null;

            int index = 0;
            for (int i = 0; i < e.LearnedSkills.Count; i++)
            {
                SkillDef def = catalog.Get(e.LearnedSkills[i]);
                if (def == null || def.Kind != SkillKind.Active) continue;
                if (index == slot) return def;
                index++;
            }
            return null;
        }

        public static int CooldownLeft(Entity e, string skillId)
        {
            if (e == null || string.IsNullOrEmpty(skillId)) return 0;
            int left;
            return e.SkillCooldowns.TryGetValue(skillId, out left) ? left : 0;
        }

        // ------------------------------------------------------------------ 释放

        public static bool Cast(World world, Entity caster, int barSlot, ISkillCatalog catalog, CombatTuning tuning)
        {
            if (world == null || caster == null || !caster.IsAlive) return false;

            SkillDef def = BarSkill(caster, barSlot, catalog);
            if (def == null) return false;

            if (def.Kind != SkillKind.Active)
            {
                Refuse(world, caster, def, "这是被动技能");
                return false;
            }
            if (CooldownLeft(caster, def.Id) > 0)
            {
                Refuse(world, caster, def, "还在冷却");
                return false;
            }
            if (caster.Mp < def.Mp)
            {
                Refuse(world, caster, def, "魔法不够（要 " + def.Mp + "）");
                return false;
            }

            caster.Mp -= def.Mp;
            caster.SkillCooldowns[def.Id] = def.CooldownTicks;

            int hits = ApplyEffect(world, caster, def, tuning);

            world.Events.Publish(new SkillCast
            {
                Caster = caster.Id,
                SkillId = def.Id,
                Dir = caster.Facing,
                TargetCount = hits,
                Success = true
            });
            return true;
        }

        private static int ApplyEffect(World world, Entity caster, SkillDef def, CombatTuning tuning)
        {
            int hits = 0;

            if (def.Target == SkillTarget.Around)
            {
                int range = def.Range < 1 ? 1 : def.Range;
                foreach (Entity target in world.SnapshotEntities())
                {
                    if (!CombatSystem.IsHostile(caster, target) || !target.IsAlive) continue;
                    if (caster.Pos.ChebyshevTo(target.Pos) > range) continue;
                    if (Strike(world, caster, target, def, tuning)) hits++;
                }
                return hits;
            }

            if (def.Target == SkillTarget.Line)
            {
                int range = def.Range < 1 ? 1 : def.Range;
                for (int step = 1; step <= range; step++)
                {
                    TilePos at = caster.Pos + new TilePos(DirHelper.Dx(caster.Facing) * step, DirHelper.Dy(caster.Facing) * step);
                    Entity target = world.EntityAt(at);
                    if (target == null || !CombatSystem.IsHostile(caster, target) || !target.IsAlive) continue;
                    if (Strike(world, caster, target, def, tuning)) hits++;
                }
                return hits;
            }

            Entity single = CombatSystem.FindTargetInArc(world, caster, def.Range);
            if (single != null && Strike(world, caster, single, def, tuning)) hits++;
            return hits;
        }

        private static bool Strike(World world, Entity caster, Entity target, SkillDef def, CombatTuning tuning)
        {
            DamageResult result = DamageCalculator.Roll(caster, target, world.Rng, tuning);
            if (!result.Hit)
            {
                world.Events.Publish(new AttackMissed { Source = caster.Id, Target = target.Id });
                return false;
            }

            int amount = (int)(result.Amount * def.DamageCoeff + 0.5f);
            if (amount < 1) amount = 1;
            result.Amount = amount;

            CombatSystem.ApplyDamage(world, caster, target, result);
            return true;
        }

        private static void Refuse(World world, Entity caster, SkillDef def, string reason)
        {
            world.Events.Publish(new SkillRefused { Id = caster.Id, SkillId = def.Id, Reason = reason });
        }
    }
}
