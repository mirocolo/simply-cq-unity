using System.Collections.Generic;
using SimplyCQ.Data;
using SimplyCQ.Domain;
using UnityEditor;
using UnityEngine;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 数值审计：拿**真实数据表**模拟战斗，把成长曲线算出来并断言它能不能玩。
    ///
    /// 为什么需要它：20 种怪和 60 件装备的数值是按公式推出来的 ——
    /// 公式自洽不等于**曲线能玩**。「Lv1 打不动鸡」或者「Lv15 的洞窟领主被两刀秒」这种问题，
    /// 光看 JSON 看不出来，必须把伤害公式真跑一遍。
    ///
    /// 用的就是游戏里那个 <see cref="DamageCalculator.Roll"/>，不是另写一套近似公式 ——
    /// 另写一套的话，审计通过而游戏里不对，一点意义都没有。
    ///
    /// 跑法：菜单 SimplyCQ / ⑥，或者在批处理里跟冒烟自检一起跑（<see cref="BatchRunner"/>，
    /// 失败项合并计数，所以审计红了批处理也红）。
    /// </summary>
    public static class BalanceAudit
    {
        private const int TicksPerSecond = 10;
        private const int MaxFightTicks = 60 * TicksPerSecond;

        /// <summary>击杀一只怪最多允许多少秒 —— 超过就说明这怪是块石头。</summary>
        private const float MaxKillSeconds = 60f;

        /// <summary>
        /// 同级玩家至少能连打同种怪几只（低于这个数，那片区域就是在劝退）。
        /// 只要求普通怪；精英和头目本来就是"打一只就得撤"，不适用。
        /// </summary>
        private const int MinChainKills = 3;

        /// <summary>精英 / 头目：故意比同级强，所以不套用普通怪那几条严格标准。</summary>
        private static bool OffCurve(MonsterDto md)
        {
            return md != null && (md.tier == "elite" || md.tier == "boss");
        }

        /// <summary>
        /// 同级怪不该被一次普攻打死。1 刀才算病，2 刀是新手区应有的手感
        /// （鸡本来就该一巴掌一只），所以门槛是 2 而不是 3。
        /// </summary>
        private const int MinHitsToKill = 2;

        /// <summary>换装带来的有效攻击提升下限 —— 低于这个，「爆装→换装」这条循环就白转了。</summary>
        private const float MinGearUplift = 1.5f;

        /// <summary>传送费（写死在 npcs.json 里，这里用来量"打怪赚的钱够不够花"）。</summary>
        private const int TeleportFee = 30;

        private static int _pass;
        private static int _fail;
        private static readonly List<string> _failures = new List<string>();

        public static int FailureCount { get { return _fail; } }

        [MenuItem("SimplyCQ/⑥ 数值审计（模拟战斗，看成长曲线能不能玩）", false, 60)]
        public static void Run()
        {
            _pass = 0;
            _fail = 0;
            _failures.Clear();

            GameDatabase db = GameDatabase.LoadFromStreamingAssets(
                "Data/maps/map_grassland.json", "Data/monsters.json", "Data/balance.json");

            int kinds = 0;
            if (db != null) foreach (MonsterDto m in db.AllMonsters) kinds++;

            if (db == null || db.Items == null || kinds == 0)
            {
                Check(false, "能读到 items.json / monsters.json / balance.json");
                Report();
                return;
            }
            Check(true, "数据表加载：装备 " + db.Items.Count + " 件 / 怪 " + kinds + " 种");

            AuditPlayerCurve(db);
            AuditGearTiers(db);
            AuditProgression(db);
            AuditFights(db);

            Report();
        }

        /// <summary>命令行入口（CI / 脚本用），失败时退出码 1。</summary>
        public static void RunBatch()
        {
            Run();
            EditorApplication.Exit(_fail == 0 ? 0 : 1);
        }

        // ------------------------------------------------------------------ 玩家曲线

        /// <summary>
        /// 玩家在同级"一身白装"下的攻/防/血曲线。
        /// 这张表是**给怪定标用的**：怪的数值应该照着玩家同期能到的水平来定，
        /// 而不是反过来（先把怪填死，再回头怪玩家打不动）。所以先把它打出来。
        /// </summary>
        private static void AuditPlayerCurve(GameDatabase db)
        {
            Debug.Log("[SimplyCQ 数值审计] 玩家曲线（同级、一身白装）—— 给怪定标用");
            Debug.Log("Lv   攻      防    血上限   打8下要几秒");
            for (int level = 1; level <= 15; level++)
            {
                Entity p = MakePlayer(db, level, ItemQuality.White, true);
                float dps = Mid(p.MinDc, p.MaxDc);
                float swing = db.Tuning.PlayerAttackInterval / (float)TicksPerSecond;
                Debug.Log(string.Format("Lv{0,-3} {1,4}-{2,-3} {3,4}  {4,6}   {5:0.0}s/刀",
                    level, p.MinDc, p.MaxDc, p.Ac, p.MaxHp, swing));
            }
        }

        // ------------------------------------------------------------------ 装备阶梯

        /// <summary>
        /// 同一个等级段，「空手 / 一身白装 / 一身蓝装」三档的有效攻击差多少。
        /// 这条不成立的话，玩家打怪爆装、换装变强这个循环在数值上就是空转。
        /// </summary>
        private static void AuditGearTiers(GameDatabase db)
        {
            // 覆盖全部五个装备等级段（和 gen_items.BANDS 对应）
            foreach (int level in new[] { 1, 4, 7, 10, 13 })
            {
                // Lv1 根本没有"蓝装"这一档（珍品款从 Lv4 才开始），所以比的是
                // "该等级能拿到的最好一档" —— 不然会拿一身空的假玩家去比，得出的结论毫无意义
                ItemQuality bestTier = BestTierAt(db, level);

                Entity bare = MakePlayer(db, level, ItemQuality.White, false);
                Entity white = MakePlayer(db, level, ItemQuality.White, true);
                Entity top = MakePlayer(db, level, bestTier, true);

                float bareMid = Mid(bare.MinDc, bare.MaxDc);
                float whiteMid = Mid(white.MinDc, white.MaxDc);
                float topMid = Mid(top.MinDc, top.MaxDc);

                float uplift = bareMid <= 0f ? 0f : whiteMid / bareMid;
                Check(uplift >= MinGearUplift,
                    "Lv" + level + " 穿白装比空手强 " + uplift.ToString("0.00") + " 倍（下限 "
                    + MinGearUplift.ToString("0.0") + "）：攻 " + bareMid.ToString("0.0")
                    + " -> " + whiteMid.ToString("0.0"));

                Check(topMid > whiteMid,
                    "Lv" + level + " " + ItemQualityRules.DisplayName(bestTier) + "货比白装强：攻 "
                    + whiteMid.ToString("0.0") + " -> " + topMid.ToString("0.0")
                    + "，防 " + white.Ac + " -> " + top.Ac);
            }
        }

        /// <summary>该等级能拿到的最高品质档（Lv1 只有白/绿，Lv4 起才有蓝）。</summary>
        private static ItemQuality BestTierAt(GameDatabase db, int level)
        {
            ItemQuality best = ItemQuality.White;
            foreach (ItemDef def in db.Items.All)
            {
                if (!def.IsEquip || def.LevelReq > level) continue;
                if ((int)def.MinQuality > (int)best) best = def.MinQuality;
            }
            return best;
        }

        // ------------------------------------------------------------------ 成长曲线

        /// <summary>从 Lv1 一路打到 Lv15，一共要杀多少只怪。太多是折磨，太少是没成长。</summary>
        private static void AuditProgression(GameDatabase db)
        {
            CombatTuning t = db.Tuning;

            long totalExp = 0;
            for (int level = 1; level < 15; level++) totalExp += LevelCurve.ExpToNext(level, t);

            // 拿所有非头目怪的平均经验当"刷怪效率"的参考
            double expPerKill = 0;
            int sampled = 0;
            foreach (MonsterDto m in db.AllMonsters)
            {
                if (m.id == "mon_cave_lord") continue;   // 头目不算进刷怪效率
                expPerKill += m.exp;
                sampled++;
            }
            expPerKill = sampled > 0 ? expPerKill / sampled : 1;

            double kills = totalExp / expPerKill;
            Check(kills >= 50 && kills <= 5000,
                "Lv1 -> Lv15 累计要杀约 " + kills.ToString("0") + " 只怪（合理区间 50~5000，累计经验 "
                + totalExp + "，平均每只 " + expPerKill.ToString("0.#") + " 经验）");

            int prev = 0;
            bool rising = true;
            for (int level = 1; level <= 20; level++)
            {
                int need = LevelCurve.ExpToNext(level, t);
                if (need < prev) rising = false;
                prev = need;
            }
            Check(rising, "升级所需经验随等级单调不减（不会出现「越升级越容易」这种反常）");

            Check(LevelCurve.ExpToNext(1, t) < LevelCurve.ExpToNext(10, t),
                "高等级确实需要更多经验（Lv1 要 " + LevelCurve.ExpToNext(1, t)
                + "，Lv10 要 " + LevelCurve.ExpToNext(10, t) + "）");
        }

        // ------------------------------------------------------------------ 逐只怪模拟

        private static void AuditFights(GameDatabase db)
        {
            CombatTuning t = db.Tuning;

            Debug.Log("[SimplyCQ 数值审计] 玩家等级 = 怪的等级（同级对打），只算普攻、不喝药、不回血");
            Debug.Log("                                   玩家        怪");
            Debug.Log("怪名             档次     Lv   血   TTK秒 刀数 攻  防   攻    每只掉血 能连打 经验/秒 金币/秒");

            int unkillable = 0, playerDied = 0, tooSlow = 0, squishy = 0, unstable = 0;
            string unkillableWhere = "", diedWhere = "";

            foreach (MonsterDto md in db.AllMonsters)
            {
                Entity monster = db.CreateMonster(md.id);
                if (monster == null) continue;

                Entity player = MakePlayer(db, md.level, ItemQuality.White, true);
                FightResult r = Fight(player, monster, md, t);

                Debug.Log(string.Format(
                    "{0,-16} {1,-7} Lv{2,-3} {3,4} {4,6} {5,4} {6,4} {7,4} {8,4}-{9,-3} {10,7} {11,5} {12,7} {13,7}",
                    md.name, md.tier ?? "-", md.level, monster.MaxHp,
                    r.Killed ? r.Seconds.ToString("0.0") : "—",
                    r.Hits, Mid(player.MinDc, player.MaxDc).ToString("0"), player.Ac,
                    md.minDc, md.maxDc,
                    r.PlayerHpLost, r.Killed ? r.ChainKills.ToString() : "—",
                    r.Killed ? r.ExpPerSecond.ToString("0.00") : "—",
                    r.Killed ? r.GoldPerSecond.ToString("0.00") : "—"));

                if (!r.Killed)
                {
                    if (r.PlayerDied) { playerDied++; if (diedWhere.Length < 50) diedWhere += md.name + " "; }
                    else { unkillable++; if (unkillableWhere.Length < 50) unkillableWhere += md.name + " "; }
                    continue;
                }

                if (r.Seconds > MaxKillSeconds) tooSlow++;
                // 下面两条只管普通怪：精英/头目就该"多砍几刀、连打不住"
                if (OffCurve(md)) continue;
                if (r.Hits < MinHitsToKill) squishy++;
                if (r.ChainKills < MinChainKills) unstable++;
            }

            Check(unkillable == 0, "每只怪都打得死（打不死的 "
                + (unkillable == 0 ? "无" : unkillable + " 种：" + unkillableWhere) + "）");
            Check(playerDied == 0, "同级玩家都能打赢（打不过的 "
                + (playerDied == 0 ? "无" : playerDied + " 种：" + diedWhere) + "）");
            Check(tooSlow == 0, "没有一只怪要打超过 " + MaxKillSeconds + " 秒（超时的 " + tooSlow + " 种）");
            Check(squishy == 0, "同级怪不会被一次普攻打死（一刀秒的 " + squishy + " 种）");
            Check(unstable == 0,
                "同级玩家至少能连打 " + MinChainKills + " 只同种怪（连不住的 " + unstable + " 种）");

            // 精英/头目：光"排名靠前"不够，得真的比同级普通怪更耐打
            int eliteTooWeak = 0;
            string eliteWhere = "";
            foreach (MonsterDto md in db.AllMonsters)
            {
                if (!OffCurve(md)) continue;

                float eliteTtk = TtkOf(db, md, md.level);
                float bestNormal = 0f;
                foreach (MonsterDto other in db.AllMonsters)
                {
                    if (OffCurve(other)) continue;
                    if (other.level > md.level) continue;
                    float otherTtk = TtkOf(db, other, other.level);
                    if (otherTtk > bestNormal) bestNormal = otherTtk;
                }
                if (eliteTtk <= bestNormal)
                {
                    eliteTooWeak++;
                    if (eliteWhere.Length < 50) eliteWhere += md.name + " ";
                }
            }
            Check(eliteTooWeak == 0,
                "精英 / 头目比同级普通怪更耐打（不够硬的：" + (eliteTooWeak == 0 ? "无" : eliteWhere) + "）");

            // 等级梯度：越高级的怪打得越久 —— 不然「往深处走」就没有意义
            float low = AverageTtk(db, 1, 3, 0);
            float mid = AverageTtk(db, 4, 6, 0);
            float high = AverageTtk(db, 7, 15, 0);

            Check(low > 0f && mid > 0f && high > 0f,
                "三个等级段都有怪能算出击杀耗时（低 " + low.ToString("0.0") + "s / 中 "
                + mid.ToString("0.0") + "s / 高 " + high.ToString("0.0") + "s）");
            Check(mid > low && high > mid,
                "怪越高级打得越久（低 " + low.ToString("0.0") + "s < 中 " + mid.ToString("0.0")
                + "s < 高 " + high.ToString("0.0") + "s）");

            // 越级惩罚 / 压级收益：这条决定「打不过就先练级」这个决策成不成立
            float same = AverageTtk(db, 4, 6, 0);
            float under = AverageTtk(db, 4, 6, -3);
            float over = AverageTtk(db, 4, 6, 3);

            Check(under > same, "低 3 级去打同样的怪更吃力（" + same.ToString("0.0") + "s -> "
                + under.ToString("0.0") + "s）");
            Check(over < same, "高 3 级去打同样的怪更轻松（" + same.ToString("0.0") + "s -> "
                + over.ToString("0.0") + "s）");

            // 经济：传送费不该是负担，「回城卖东西」要真能攒到钱
            float goldPerBoar = GoldPerKill(db, "mon_boar");
            Check(goldPerBoar > 0f, "打野猪的期望金币 " + goldPerBoar.ToString("0.0") + " 金/只");
            Check(goldPerBoar * 5f >= TeleportFee,
                "打 5 只野猪够 " + TeleportFee + " 金的传送费（实际 "
                + (goldPerBoar * 5f).ToString("0.0") + " 金）");
        }

        /// <summary>一只怪在"玩家与它同级"时的击杀耗时（打不死返回一个很大的数）。</summary>
        private static float TtkOf(GameDatabase db, MonsterDto md, int playerLevel)
        {
            FightResult r = Fight(MakePlayer(db, playerLevel, ItemQuality.White, true),
                                  db.CreateMonster(md.id), md, db.Tuning);
            return r.Killed ? r.Seconds : MaxKillSeconds * 10f;
        }

        /// <summary>某个等级段的怪，在玩家等级偏移 offset 下的平均击杀耗时。</summary>
        private static float AverageTtk(GameDatabase db, int minLevel, int maxLevel, int offset)
        {
            float sum = 0f;
            int n = 0;
            foreach (MonsterDto md in db.AllMonsters)
            {
                if (md.level < minLevel || md.level > maxLevel) continue;
                int playerLevel = Mathf.Max(1, md.level + offset);
                FightResult r = Fight(MakePlayer(db, playerLevel, ItemQuality.White, true),
                                      db.CreateMonster(md.id), md, db.Tuning);
                if (!r.Killed) continue;
                sum += r.Seconds;
                n++;
            }
            return n > 0 ? sum / n : 0f;
        }

        private static float GoldPerKill(GameDatabase db, string monsterId)
        {
            foreach (MonsterDto md in db.AllMonsters)
                if (md.id == monsterId) return GoldExpectation(md);
            return 0f;
        }

        /// <summary>一只怪的金币期望（掉率 × 区间中值）。</summary>
        private static float GoldExpectation(MonsterDto md)
        {
            if (md == null) return 0f;
            return (md.goldMin + md.goldMax) * 0.5f * Mathf.Clamp01(md.goldChance);
        }

        // ------------------------------------------------------------------ 模拟

        private struct FightResult
        {
            public bool Killed;
            public bool PlayerDied;
            public float Seconds;
            public int Hits;
            public int PlayerHpLost;
            public int ChainKills;
            public float ExpPerSecond;
            public float GoldPerSecond;
        }

        /// <summary>
        /// 一个很朴素的模拟：双方按各自的出手间隔互相砍，直到一方倒下。
        ///
        /// 只算普攻，不喝药、不脱战回血 —— 这是玩家最保守的打法，如果连这都打得过，
        /// 实际操作只会更轻松。用的就是游戏里的伤害公式，所以这里算出来的 TTK 就是游戏里的 TTK。
        ///
        /// 固定种子：审计结论要可复现，不然改一次数据结论就飘。
        /// </summary>
        /// <summary>
        /// 打很多遍取平均。单遍的"玩家掉多少血"会随 RNG 对齐方式大幅摆动
        /// （同样的种子，玩家变强一点就可能刚好错开怪的那几次出手），
        /// 只看一遍得出的结论不可信 —— 定标要靠平均，不靠手气。
        /// </summary>
        private static FightResult Fight(Entity player, Entity monster, MonsterDto md, CombatTuning tuning)
        {
            const int samples = 5;

            FightResult sum = default(FightResult);
            int killed = 0;
            bool anyDeath = false;

            for (int i = 0; i < samples; i++)
            {
                FightResult one = FightOnce(player, monster, md, tuning, 20240617u + (uint)i * 7919u);
                if (one.Killed) killed++;
                if (one.PlayerDied) anyDeath = true;

                sum.Seconds += one.Seconds;
                sum.Hits += one.Hits;
                sum.PlayerHpLost += one.PlayerHpLost;
                sum.ExpPerSecond += one.ExpPerSecond;
                sum.GoldPerSecond += one.GoldPerSecond;
            }

            FightResult r = default(FightResult);
            r.Seconds = sum.Seconds / samples;
            r.Hits = Mathf.RoundToInt(sum.Hits / (float)samples);
            r.PlayerHpLost = Mathf.RoundToInt(sum.PlayerHpLost / (float)samples);
            r.ExpPerSecond = sum.ExpPerSecond / samples;
            r.GoldPerSecond = sum.GoldPerSecond / samples;

            // 严格一点：5 遍里有一遍打不死/被打死，就认为这个数值不可靠
            r.PlayerDied = anyDeath;
            r.Killed = killed == samples && !anyDeath;
            r.ChainKills = r.PlayerHpLost <= 0 ? 99
                         : Mathf.Max(0, Mathf.FloorToInt(player.MaxHp / (float)r.PlayerHpLost));
            return r;
        }

        private static FightResult FightOnce(Entity player, Entity monster, MonsterDto md,
                                             CombatTuning tuning, uint seed)
        {
            FightResult r = default(FightResult);
            if (player == null || monster == null) return r;

            Rng rng = new Rng(seed);

            int monsterHp = monster.MaxHp;
            int playerHp = player.MaxHp;
            int playerCd = 0;
            int monsterCd = 0;
            int ticks = MaxFightTicks;

            for (int tick = 1; tick <= MaxFightTicks; tick++)
            {
                if (playerCd-- <= 0)
                {
                    playerCd = Mathf.Max(1, tuning.PlayerAttackInterval);
                    DamageResult d = DamageCalculator.Roll(player, monster, rng, tuning);
                    if (d.Hit)
                    {
                        monsterHp -= d.Amount;
                        r.Hits++;
                        if (monsterHp <= 0) { r.Killed = true; ticks = tick; break; }
                    }
                }

                if (monsterCd-- <= 0)
                {
                    monsterCd = Mathf.Max(1, monster.AttackInterval);
                    DamageResult d = DamageCalculator.Roll(monster, player, rng, tuning);
                    if (d.Hit)
                    {
                        playerHp -= d.Amount;
                        if (playerHp <= 0) { r.PlayerDied = true; ticks = tick; break; }
                    }
                }
            }

            r.Seconds = ticks / (float)TicksPerSecond;
            r.PlayerHpLost = player.MaxHp - Mathf.Max(0, playerHp);

            if (r.Killed && r.Seconds > 0f)
            {
                r.ExpPerSecond = monster.ExpReward / r.Seconds;
                r.GoldPerSecond = GoldExpectation(md) / r.Seconds;
            }
            return r;
        }

        // ------------------------------------------------------------------ 造人 / 造装备

        /// <summary>
        /// 造一个「该等级的正常玩家」：基础属性按升级收益长上去，装备取该等级段里需求最高的货。
        /// equip=false 就是空手（用来量换装到底有没有用）。
        /// </summary>
        private static Entity MakePlayer(GameDatabase db, int level, ItemQuality quality, bool equip)
        {
            CombatTuning t = db.Tuning;
            Entity p = db.CreatePlayer();
            p.Level = level;

            for (int i = 1; i < level; i++)
            {
                p.BaseMaxHp += t.LevelUpHpGain;
                p.BaseMinDc += t.LevelUpDcGain;
                p.BaseMaxDc += t.LevelUpDcGain;
                p.BaseAc += t.LevelUpAcGain;
            }

            if (equip)
            {
                for (int s = 1; s < ItemDef.SlotCount; s++)
                {
                    EquipSlot slot = (EquipSlot)s;
                    ItemDef def = BestForLevel(db.Items, slot, level, quality);
                    if (def == null) continue;
                    p.Gear.Set(slot, new ItemInstance(def.Id, 1, quality));
                }
            }

            StatCalculator.Apply(p, db.Items);
            p.Hp = p.MaxHp;
            p.ExpToNextLevel = LevelCurve.ExpToNext(p.Level, t);
            return p;
        }

        /// <summary>该部位里、需求等级不超过 level 的最高一档货（只看指定品质档）。</summary>
        private static ItemDef BestForLevel(ItemCatalog items, EquipSlot slot, int level, ItemQuality quality)
        {
            ItemDef best = null;
            foreach (ItemDef def in items.All)
            {
                if (!def.IsEquip || def.Slot != slot) continue;
                if (def.LevelReq > level) continue;
                if (def.MinQuality != quality) continue;
                if (best == null || def.LevelReq > best.LevelReq) best = def;
            }
            return best;
        }

        private static float Mid(int min, int max) { return (min + max) * 0.5f; }

        // ------------------------------------------------------------------ 报告

        private static void Check(bool ok, string name)
        {
            if (ok) { _pass++; return; }
            _fail++;
            _failures.Add(name);
            Debug.LogError("[SimplyCQ 数值审计] FAIL: " + name);
        }

        private static void Report()
        {
            if (_fail == 0)
            {
                Debug.Log("[SimplyCQ 数值审计] 全部通过 ✓（" + _pass + " 项）");
                return;
            }
            Debug.LogError("[SimplyCQ 数值审计] " + _fail + " 项失败：\n- "
                + string.Join("\n- ", _failures.ToArray()));
        }
    }
}
