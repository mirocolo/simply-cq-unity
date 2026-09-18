using System;
using SimplyCQ.Domain;

namespace SimplyCQ.Data
{
    /// <summary>
    /// 离线收益：读档时按"离开多久"折算一份收获，上线弹"欢迎回来"。
    ///
    /// 口径**复用数值审计的那一套**（同等级带非精英怪的期望收益、按审计的击杀时长折算），
    /// 不另写一套公式 —— 两套口径迟早打架。
    ///
    /// 封顶 8 小时；装备只摇 3 件且品质封顶蓝 —— 离线不白给紫，紫要亲手打，
    /// 不然"上线看光柱"这个动作就没有意义了。
    /// </summary>
    public static class OfflineGains
    {
        public const double MaxSeconds = 8 * 3600;
        /// <summary>离开太短不算（去趟厕所回来弹结算面板就烦了）。</summary>
        public const double MinSeconds = 60;
        private const int TicksPerSecond = 10;
        private const int ItemRolls = 3;

        public sealed class Report
        {
            public bool HasGains;
            public double Seconds;
            public long Kills;
            public long Exp;
            public long Gold;
            public int LevelsGained;
            public System.Collections.Generic.List<ItemInstance> Items = new System.Collections.Generic.List<ItemInstance>();

            public string Summary
            {
                get
                {
                    string time = Seconds >= 3600
                        ? string.Format("{0:0}小时{1:0}分", Seconds / 3600, Seconds % 3600 / 60)
                        : string.Format("{0:0}分钟", Seconds / 60);
                    string items = Items.Count > 0 ? "   装备 +" + Items.Count : "";
                    return string.Format("离开 {0}\n击杀约 {1}   经验 +{2}（升 {3} 级）   金币 +{4}{5}",
                        time, Kills, Exp, LevelsGained, Gold, items);
                }
            }
        }

        public static Report Apply(GameDatabase db, World world, Entity player, SaveData save, DateTime now)
        {
            Report r = new Report();
            if (db == null || player == null || save == null || string.IsNullOrEmpty(save.SavedAt)) return r;

            DateTime savedAt;
            if (!DateTime.TryParse(save.SavedAt, out savedAt)) return r;

            double seconds = (now - savedAt).TotalSeconds;
            if (seconds < MinSeconds) return r;
            r.Seconds = Math.Min(seconds, MaxSeconds);

            // ---- 效率口径：和玩家等级相近（±3 级）的非精英怪，取平均 ----
            double expPerKill = 0, goldPerKill = 0, hpPerKill = 0;
            int sampled = 0;
            foreach (MonsterDto m in db.AllMonsters)
            {
                if (m.tier == "elite" || m.tier == "boss") continue;      // 精英不是挂机对象
                if (Math.Abs(m.level - player.Level) > 3) continue;

                expPerKill += m.exp;
                goldPerKill += (m.goldMin + m.goldMax) * 0.5 * Clamp01(m.goldChance);
                hpPerKill += m.hp;
                sampled++;
            }
            if (sampled == 0)
            {
                foreach (MonsterDto m in db.AllMonsters)
                {
                    if (m.tier == "elite" || m.tier == "boss") continue;
                    expPerKill += m.exp;
                    goldPerKill += (m.goldMin + m.goldMax) * 0.5 * Clamp01(m.goldChance);
                    hpPerKill += m.hp;
                    sampled++;
                }
            }
            if (sampled == 0) return r;

            expPerKill /= sampled;
            goldPerKill /= sampled;
            hpPerKill /= sampled;

            // 击杀一只的耗时（秒）：血量 ÷ 每击伤害 × 出手间隔 —— 和审计同口径的简化式
            float midDc = (player.MinDc + player.MaxDc) * 0.5f;
            double killSeconds = Math.Max(1.0, hpPerKill / Math.Max(1.0, midDc)
                                         * db.Tuning.PlayerAttackInterval / (double)TicksPerSecond);

            long kills = (long)(r.Seconds / killSeconds);
            if (kills <= 0) return r;

            r.Kills = kills;
            r.Exp = (long)(kills * expPerKill);
            r.Gold = (long)(kills * goldPerKill);

            // ---- 发放 ----
            int before = player.Level;
            r.LevelsGained = LevelCurve.ApplyExperience(world, player, r.Exp, db.Tuning, db.Items);
            player.Gold += (int)Math.Min(r.Gold, int.MaxValue);
            r.HasGains = true;

            // 装备：在玩家当前装备段里摇 3 件（品质封顶蓝）
            Rng rng = new Rng(918273645u);
            for (int i = 0; i < ItemRolls; i++)
            {
                ItemDef def = RollEquip(db, player, rng);
                if (def == null) continue;

                // 背包满了就少给 —— 不硬塞（Add 返回实际塞进去的数量）
                ItemQuality q = db.Loot.Roll(rng, player.Level);
                if (q > ItemQuality.Blue) q = ItemQuality.Blue;
                q = ItemQualityRules.Max(q, def.MinQuality);
                if (player.Bag == null || player.Bag.Add(def, 1, q) <= 0) break;

                r.Items.Add(new ItemInstance(def.Id, 1, q));
            }

            if (player.Level > before) r.LevelsGained = player.Level - before;
            return r;
        }

        /// <summary>玩家装备段（需求等级 ≤ 玩家等级里最高的那档）里随机挑一件。</summary>
        private static ItemDef RollEquip(GameDatabase db, Entity player, Rng rng)
        {
            int topBandLevel = 0;
            foreach (ItemDef def in db.Items.All)
            {
                if (!def.IsEquip || def.LevelReq > player.Level) continue;
                if (def.LevelReq > topBandLevel) topBandLevel = def.LevelReq;
            }
            if (topBandLevel <= 0) return null;

            // 最新一档（含降一档）里挑，别让 100 件里完全均匀 —— 挂机该出"当前能穿的最好的"
            System.Collections.Generic.List<ItemDef> pool = new System.Collections.Generic.List<ItemDef>();
            foreach (ItemDef def in db.Items.All)
            {
                if (!def.IsEquip) continue;
                if (def.LevelReq != topBandLevel && def.LevelReq != topBandLevel - 3) continue;
                pool.Add(def);
            }
            if (pool.Count == 0) return null;
            return pool[rng.Range(0, pool.Count)];
        }

        private static double Clamp01(double v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
    }
}
