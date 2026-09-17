namespace SimplyCQ.Domain
{
    public struct DamageResult
    {
        public bool Hit;
        public bool Crit;
        public int Amount;
    }

    /// <summary>
    /// 伤害结算。公式刻意做得直白，和传奇一样「一眼看得懂」：
    ///   命中 = clamp(HitBase + HitPerLevel * (攻等级 - 防等级), HitMin, 1)
    ///   伤害 = max(MinDamage, RandInt(MinDc, MaxDc) - RandInt(0, AC))
    ///   暴击 = 概率触发，伤害乘 CritMultiplier
    /// 纯函数 + 注入 Rng，所以可以无头单测、可以复现。
    /// </summary>
    public static class DamageCalculator
    {
        public static DamageResult Roll(Entity attacker, Entity target, Rng rng, CombatTuning tuning)
        {
            DamageResult result = default(DamageResult);
            if (attacker == null || target == null || rng == null) return result;

            CombatTuning t = tuning != null ? tuning : new CombatTuning();

            float chance = t.HitBase + t.HitPerLevel * (attacker.Level - target.Level) + attacker.HitBonus * 0.01f;
            if (chance < t.HitMin) chance = t.HitMin;
            if (chance > 1f) chance = 1f;

            if (!rng.Chance(chance)) return result;   // Hit = false

            result.Hit = true;

            int raw = rng.Range(attacker.MinDc, attacker.MaxDc);
            int armor = target.Ac > 0 ? rng.Range(0, target.Ac) : 0;
            int amount = raw - armor;
            if (amount < t.MinDamage) amount = t.MinDamage;

            if (rng.Chance(t.CritChance))
            {
                result.Crit = true;
                amount = (int)(amount * t.CritMultiplier + 0.5f);
                if (amount < t.MinDamage) amount = t.MinDamage;
            }

            result.Amount = amount;
            return result;
        }
    }
}
