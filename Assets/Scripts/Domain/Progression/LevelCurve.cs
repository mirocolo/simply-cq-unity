using System;

namespace SimplyCQ.Domain
{
    /// <summary>升级曲线。想改成手填表格，只动这一个类。</summary>
    public static class LevelCurve
    {
        /// <summary>从 level 升到 level+1 需要多少经验。</summary>
        public static int ExpToNext(int level, CombatTuning tuning)
        {
            if (level < 1) level = 1;
            CombatTuning t = tuning != null ? tuning : new CombatTuning();
            double v = t.ExpCurveBase * Math.Pow(level, t.ExpCurvePow);
            int result = (int)(v + 0.5);
            return result < 1 ? 1 : result;
        }
    }
}
