using System;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 战斗与成长的全部可调数值。默认这一套就是能玩的，Data 层会用 balance.json 里的 combat 覆盖它。
    /// 标 [Serializable] 是为了让 JsonUtility 直接反序列化（Domain 本身仍然不依赖 UnityEngine）。
    /// </summary>
    [Serializable]
    public sealed class CombatTuning
    {
        // ---- 命中 ----
        public float HitBase = 0.80f;
        public float HitPerLevel = 0.03f;
        public float HitMin = 0.35f;

        // ---- 暴击 ----
        public float CritChance = 0.08f;
        public float CritMultiplier = 1.5f;
        public int MinDamage = 1;

        // ---- 玩家攻击节奏 ----
        public int PlayerAttackInterval = 7;

        // ---- 脱战回血 ----
        public float RegenPctPerTick = 0.004f;
        public int RegenDelayTicks = 60;

        // ---- 死亡 / 掉落 / 复活 ----
        public int CorpseTicks = 12;
        public int PlayerRespawnTicks = 40;
        public int GroundLootTicks = 600;

        // ---- 升级曲线 ----
        public int ExpCurveBase = 40;
        public float ExpCurvePow = 1.6f;
        public int LevelUpHpGain = 25;
        public int LevelUpDcGain = 2;
        public int LevelUpAcGain = 1;

        /// <summary>把明显不合理的值夹回安全范围，免得一个手抖让游戏没法玩。</summary>
        public void Clamp()
        {
            HitBase = Clamp01(HitBase);
            HitMin = Clamp01(HitMin);
            CritChance = Clamp01(CritChance);
            if (CritMultiplier < 1f) CritMultiplier = 1f;
            if (MinDamage < 1) MinDamage = 1;
            if (PlayerAttackInterval < 1) PlayerAttackInterval = 1;
            if (RegenPctPerTick < 0f) RegenPctPerTick = 0f;
            if (RegenDelayTicks < 0) RegenDelayTicks = 0;
            if (ExpCurveBase < 1) ExpCurveBase = 1;
            if (ExpCurvePow < 1f) ExpCurvePow = 1f;
            if (LevelUpHpGain < 0) LevelUpHpGain = 0;
            if (CorpseTicks < 0) CorpseTicks = 0;
            if (PlayerRespawnTicks < 1) PlayerRespawnTicks = 1;
            if (GroundLootTicks < 0) GroundLootTicks = 0;
        }

        private static float Clamp01(float v) { return v < 0f ? 0f : (v > 1f ? 1f : v); }
    }
}
