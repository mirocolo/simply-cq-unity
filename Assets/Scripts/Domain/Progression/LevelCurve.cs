using System;

namespace SimplyCQ.Domain
{
    /// <summary>升级曲线。想改成手填表格，只动这一个类。</summary>
    public static class LevelCurve
    {
        /// <summary>
        /// 给经验并吃进升级循环（可能连升好几级）。返回升了几级。
        /// 发事件（ExpGained / LevelUp）也在这里 —— 死亡奖励和离线收益都走这条，
        /// 升级规则与事件只该有一份。
        /// </summary>
        public static int ApplyExperience(World world, Entity who, long amount,
                                          CombatTuning tuning, IItemCatalog catalog)
        {
            if (world == null || who == null || amount <= 0) return 0;

            who.Exp += (int)amount;
            world.Events.Publish(new ExpGained { Id = who.Id, Amount = (int)amount, Total = who.Exp });

            int levels = 0;
            int guard = 0;
            while (who.ExpToNextLevel > 0 && who.Exp >= who.ExpToNextLevel && guard < 100)
            {
                guard++;
                who.Exp -= who.ExpToNextLevel;
                who.Level++;

                // 改基础属性再重算，装备加成不会被升级覆盖掉
                who.BaseMaxHp += tuning.LevelUpHpGain;
                who.BaseMinDc += tuning.LevelUpDcGain;
                who.BaseMaxDc += tuning.LevelUpDcGain;
                who.BaseAc += tuning.LevelUpAcGain;
                StatCalculator.Apply(who, catalog);

                who.Hp = who.MaxHp;          // 升级回满血：页游式的"升级=喘口气"
                who.Mp = who.MaxMp;
                who.ExpToNextLevel = ExpToNext(who.Level, tuning);
                levels++;

                world.Events.Publish(new LevelUp { Id = who.Id, Level = who.Level });
            }
            return levels;
        }
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
