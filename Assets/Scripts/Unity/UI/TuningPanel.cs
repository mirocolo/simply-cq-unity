using System;
using System.Collections.Generic;
using SimplyCQ.Data;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 手感调参面板（F1）：一边玩一边改数值，改完立刻生效，满意了导出回 balance.json。
    ///
    /// 为什么要有它：`balance.json` 本来就能改、改完点 Play 就生效，但调手感要的是
    /// **连续反馈** —— 把攻速从 7 改成 6，得立刻打两下试试，而不是改 JSON、停、Play、跑到怪面前。
    ///
    /// 为什么能立刻生效：`CombatTuning` / `ShopTuning` / `LootTuning` 都是引用类型，
    /// 各个系统每 tick **现读字段**（不是构造时缓存），所以改字段就是改行为。
    /// 玩家自己身上的移速/攻速是直接改活着的实体。怪的整体倍率只能影响**新刷出来的怪**。
    ///
    /// 纯鼠标操作（`-` / `+` 按钮），**不抢键盘** —— 不然调攻速的时候人就站着不动了，
    /// 那还调什么手感。
    /// </summary>
    public sealed class TuningPanel
    {
        private sealed class Row
        {
            public string Label;
            public Func<float> Get;
            public Action<float> Set;
            public float Step;
            /// <summary>整数显示（血、攻击间隔、经验这类没有小数）。</summary>
            public bool AsInt;
        }

        private sealed class Group
        {
            public string Title;
            public readonly List<Row> Rows = new List<Row>();
        }

        private const float PanelX = 24f;
        private const float PanelY = 116f;
        private const float PanelW = 800f;
        private const float PanelH = 664f;
        private const float ColW = 386f;
        private const float RowH = 21f;
        private const float Pad = 8f;

        private static readonly float[] StepScales = { 1f, 5f, 20f };

        private readonly World _world;
        private readonly GameDatabase _db;
        private readonly List<Group> _groups = new List<Group>();

        private readonly PanelDrag _drag = new PanelDrag();
        private bool _open;
        private int _stepIndex;
        private string _status = "";
        private float _statusUntil;

        /// <summary>数值列要右对齐，皮肤那套是左对齐的，所以这里派生一份并缓存（别每帧 new）。</summary>
        private GUIStyle _valueRight;

        public TuningPanel(World world, GameDatabase db)
        {
            _world = world;
            _db = db;
            Build();
        }

        public bool IsOpen { get { return _open; } }
        public bool MouseOver { get; private set; }
        public bool ConsumesMouse { get { return _open && MouseOver; } }

        public void Toggle() { _open = !_open; }
        public void Close() { _open = false; }

        /// <summary>当前步长倍率 —— 冒烟自检用它验证"步长真的会变"。</summary>
        public float StepScale { get { return StepScales[_stepIndex]; } }
        public int RowCount { get { int n = 0; for (int i = 0; i < _groups.Count; i++) n += _groups[i].Rows.Count; return n; } }
        public int GroupCount { get { return _groups.Count; } }

        /// <summary>切换步长倍率（面板上那排 ×1 / ×5 / ×20）。</summary>
        public void SetStep(int index)
        {
            if (index < 0) index = 0;
            if (index >= StepScales.Length) index = StepScales.Length - 1;
            _stepIndex = index;
        }

        /// <summary>
        /// 按标签找一个字段，加/减一步（步长 = 该行的步长 × 当前倍率）。
        /// 鼠标点 +/- 走的就是这条路，所以自检和手点是同一个入口 ——
        /// 自检通过而手点不灵这种事就不会发生。也顺便给以后接快捷键留了口子。
        /// </summary>
        public bool Nudge(string labelContains, int direction)
        {
            if (string.IsNullOrEmpty(labelContains) || direction == 0) return false;

            for (int g = 0; g < _groups.Count; g++)
            {
                for (int r = 0; r < _groups[g].Rows.Count; r++)
                {
                    Row row = _groups[g].Rows[r];
                    if (row.Label.IndexOf(labelContains, StringComparison.Ordinal) < 0) continue;
                    row.Set(row.Get() + row.Step * StepScale * (direction > 0 ? 1f : -1f));
                    return true;
                }
            }
            return false;
        }

        /// <summary>按标签读当前值（自检用；也方便以后做"导出差异对比"）。</summary>
        public bool TryRead(string labelContains, out float value)
        {
            value = 0f;
            if (string.IsNullOrEmpty(labelContains)) return false;

            for (int g = 0; g < _groups.Count; g++)
            {
                for (int r = 0; r < _groups[g].Rows.Count; r++)
                {
                    Row row = _groups[g].Rows[r];
                    if (row.Label.IndexOf(labelContains, StringComparison.Ordinal) < 0) continue;
                    value = row.Get();
                    return true;
                }
            }
            return false;
        }

        // ------------------------------------------------------------------ 面板内容

        private void Build()
        {
            Group combat = new Group();
            combat.Title = "战斗";
            AddFloat(combat, "基础命中", () => _db.Tuning.HitBase, v => _db.Tuning.HitBase = Clamp01(v), 0.05f);
            AddFloat(combat, "每级命中差", () => _db.Tuning.HitPerLevel, v => _db.Tuning.HitPerLevel = v, 0.01f);
            AddFloat(combat, "命中下限", () => _db.Tuning.HitMin, v => _db.Tuning.HitMin = Clamp01(v), 0.05f);
            AddFloat(combat, "暴击率", () => _db.Tuning.CritChance, v => _db.Tuning.CritChance = Clamp01(v), 0.02f);
            AddFloat(combat, "暴击倍率", () => _db.Tuning.CritMultiplier, v => _db.Tuning.CritMultiplier = Mathf.Max(1f, v), 0.1f);
            AddInt(combat, "出手间隔(tick)", () => _db.Tuning.PlayerAttackInterval,
                v => _db.Tuning.PlayerAttackInterval = Mathf.Max(1, Mathf.RoundToInt(v)), 1f);
            AddFloat(combat, "脱战回血/秒", () => _db.Tuning.RegenPctPerTick * 10f,
                v => _db.Tuning.RegenPctPerTick = Mathf.Max(0f, v / 10f), 0.005f, "0.000");
            AddInt(combat, "回血延迟(tick)", () => _db.Tuning.RegenDelayTicks,
                v => _db.Tuning.RegenDelayTicks = Mathf.Max(0, Mathf.RoundToInt(v)), 5f);
            _groups.Add(combat);

            Group growth = new Group();
            growth.Title = "成长";
            AddInt(growth, "经验曲线基数", () => _db.Tuning.ExpCurveBase,
                v => _db.Tuning.ExpCurveBase = Mathf.Max(1, Mathf.RoundToInt(v)), 5f);
            AddFloat(growth, "经验曲线指数", () => _db.Tuning.ExpCurvePow,
                v => _db.Tuning.ExpCurvePow = Mathf.Max(1f, v), 0.05f);
            AddInt(growth, "升级加血", () => _db.Tuning.LevelUpHpGain,
                v => _db.Tuning.LevelUpHpGain = Mathf.Max(0, Mathf.RoundToInt(v)), 5f);
            AddInt(growth, "升级加攻", () => _db.Tuning.LevelUpDcGain,
                v => _db.Tuning.LevelUpDcGain = Mathf.Max(0, Mathf.RoundToInt(v)), 1f);
            AddInt(growth, "升级加防", () => _db.Tuning.LevelUpAcGain,
                v => _db.Tuning.LevelUpAcGain = Mathf.Max(0, Mathf.RoundToInt(v)), 1f);
            _groups.Add(growth);

            Group loot = new Group();
            loot.Title = "掉落与品质";
            AddFloat(loot, "白装权重", () => Weight(0), v => SetWeight(0, v), 5f, "0.#");
            AddFloat(loot, "绿装权重", () => Weight(1), v => SetWeight(1, v), 2f, "0.#");
            AddFloat(loot, "蓝装权重", () => Weight(2), v => SetWeight(2, v), 0.5f, "0.#");
            AddFloat(loot, "紫装权重", () => Weight(3), v => SetWeight(3, v), 0.2f, "0.#");
            AddFloat(loot, "高级怪出货加成", () => _db.Loot.qualityLevelBonus,
                v => _db.Loot.qualityLevelBonus = Clamp01(v), 0.01f, "0.00");
            _groups.Add(loot);

            Group economy = new Group();
            economy.Title = "经济";
            AddFloat(economy, "回收比例", () => _db.Shop.SellRatio, v => _db.Shop.SellRatio = Clamp01(v), 0.05f, "0.00");
            _groups.Add(economy);

            // 玩家身上这些是"直接改活着的实体"，改完这一帧就能感觉到
            Group hero = new Group();
            hero.Title = "玩家（立刻生效）";
            AddInt(hero, "走一格(tick)", () => Player().MoveSpeed, v => Player().MoveSpeed = Mathf.Max(1, Mathf.RoundToInt(v)), 1f);
            AddInt(hero, "攻速(tick)", () => Player().AttackInterval, v => Player().AttackInterval = Mathf.Max(1, Mathf.RoundToInt(v)), 1f);
            AddInt(hero, "基础血上限", () => Player().BaseMaxHp, v => { Player().BaseMaxHp = Mathf.Max(1, Mathf.RoundToInt(v)); Recount(); }, 10f);
            AddInt(hero, "基础攻击下限", () => Player().BaseMinDc, v => { Player().BaseMinDc = Mathf.Max(0, Mathf.RoundToInt(v)); Recount(); }, 1f);
            AddInt(hero, "基础攻击上限", () => Player().BaseMaxDc, v => { Player().BaseMaxDc = Mathf.Max(0, Mathf.RoundToInt(v)); Recount(); }, 1f);
            AddInt(hero, "基础防御", () => Player().BaseAc, v => { Player().BaseAc = Mathf.Max(0, Mathf.RoundToInt(v)); Recount(); }, 1f);
            _groups.Add(hero);

            // 怪的倍率只对新刷出来的怪生效：改了之后走开一会儿让它们重刷
            Group monsters = new Group();
            monsters.Title = "怪的整体倍率（只影响新刷的）";
            AddFloat(monsters, "血量 ×", () => _db.MonsterHpMul, v => _db.MonsterHpMul = ClampMul(v), 0.05f, "0.00");
            AddFloat(monsters, "伤害 ×", () => _db.MonsterDamageMul, v => _db.MonsterDamageMul = ClampMul(v), 0.05f, "0.00");
            AddFloat(monsters, "移速 ×", () => _db.MonsterSpeedMul, v => _db.MonsterSpeedMul = ClampMul(v), 0.05f, "0.00");
            AddFloat(monsters, "经验 ×", () => _db.MonsterExpMul, v => _db.MonsterExpMul = ClampMul(v), 0.05f, "0.00");
            AddFloat(monsters, "金币 ×", () => _db.MonsterGoldMul, v => _db.MonsterGoldMul = ClampMul(v), 0.05f, "0.00");
            _groups.Add(monsters);
        }

        private Entity Player()
        {
            Entity p = _world != null ? _world.Player : null;
            return p ?? new Entity();   // 玩家还没生出来时给个临时对象，别让面板崩
        }

        /// <summary>改了基础属性要重算有效值，不然血条和实际打出来的伤害对不上。</summary>
        private void Recount()
        {
            if (_world == null || _world.Player == null) return;
            StatCalculator.Apply(_world.Player, _db.Items);
        }

        private float Weight(int index)
        {
            if (_db.Loot.qualityWeights == null || index >= _db.Loot.qualityWeights.Length) return 0f;
            return _db.Loot.qualityWeights[index];
        }

        private void SetWeight(int index, float value)
        {
            if (_db.Loot.qualityWeights == null || index >= _db.Loot.qualityWeights.Length) return;
            _db.Loot.qualityWeights[index] = Mathf.Max(0f, value);
        }

        private static float Clamp01(float v) { return v < 0f ? 0f : (v > 1f ? 1f : v); }
        private static float ClampMul(float v) { return Mathf.Clamp(v, 0f, 10f); }

        private void AddFloat(Group g, string label, Func<float> get, Action<float> set, float step,
                              string format = "0.00")
        {
            Row r = new Row();
            r.Label = label + "  (" + format + ")";
            r.Get = get; r.Set = set; r.Step = step;
            g.Rows.Add(r);
        }

        private void AddInt(Group g, string label, Func<float> get, Action<float> set, float step)
        {
            Row r = new Row();
            r.Label = label;
            r.Get = get; r.Set = set; r.Step = step;
            r.AsInt = true;
            g.Rows.Add(r);
        }

        // ------------------------------------------------------------------ 画面

        public void Draw()
        {
            if (!_open) return;
            if (_valueRight == null) _valueRight = UiSkin.RightAligned(UiSkin.Styles.Value);

            Event e = Event.current;
            bool pressed, released;
            Vector2 mouse;
            PanelDrag.ReadMouse(e, out pressed, out released, out mouse);
            _drag.Handle(_drag.Apply(UiScale.R(PanelX, PanelY, PanelW, PanelH)), pressed, released, mouse);

            Rect r = _drag.Apply(UiScale.R(PanelX, PanelY, PanelW, PanelH));
            MouseOver = e != null && r.Contains(e.mousePosition);

            UiSkin.Panel(r, "手感调参   (F1 关闭，改完立刻生效，标题栏可拖动)");
            GUI.Label(UiSkin.LRect(r, Pad, 30f, PanelW, 18f),
                "步长 ×" + StepScale.ToString("0") + "    左键 -/+：整步长    右键 -/+：1/5 步长", UiSkin.Styles.Small);

            DrawStepButtons(r, e);

            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;
            bool rightDown = e != null && e.type == EventType.MouseDown && e.button == 1;

            // 两列：左列 战斗/成长，右列 掉落/经济/玩家/怪
            float y1 = 56f, y2 = 56f;
            for (int i = 0; i < _groups.Count; i++)
            {
                bool leftCol = i < 2;      // 战斗 / 成长 放左列，其余放右列
                float x = leftCol ? Pad : Pad + ColW;
                float used = DrawGroup(r, _groups[i], x, leftCol ? y1 : y2, e, leftDown, rightDown);
                if (leftCol) y1 += used; else y2 += used;
            }

            DrawStatus(r, e);
        }

        private void DrawStepButtons(Rect r, Event e)
        {
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;
            for (int i = 0; i < StepScales.Length; i++)
            {
                Rect b = UiSkin.LRect(r, 360f + i * 54f, 28f, 48f, 18f);
                bool hover = e != null && b.Contains(e.mousePosition);
                UiSkin.Button(b, "×" + StepScales[i].ToString("0"), hover, _stepIndex == i);
                if (hover && leftDown) _stepIndex = i;
            }
        }

        /// <summary>画一组，返回它占了多少高度。</summary>
        private float DrawGroup(Rect panel, Group g, float x, float y, Event e, bool leftDown, bool rightDown)
        {
            GUI.Label(UiSkin.LRect(panel, x, y, ColW - 12f, 18f), "— " + g.Title + " —", UiSkin.Styles.Group);
            y += 20f;

            for (int i = 0; i < g.Rows.Count; i++)
            {
                Row row = g.Rows[i];
                RowRects(panel, x, y, out Rect labelR, out Rect minusR, out Rect valueR, out Rect plusR);

                GUI.Label(labelR, row.Label, UiSkin.Styles.Label);

                float v = row.Get();
                GUI.Label(valueR, row.AsInt ? Mathf.RoundToInt(v).ToString() : v.ToString("0.00"), _valueRight);

                bool hoverMinus = e != null && minusR.Contains(e.mousePosition);
                bool hoverPlus = e != null && plusR.Contains(e.mousePosition);
                UiSkin.Button(minusR, "-", hoverMinus);
                UiSkin.Button(plusR, "+", hoverPlus);

                float step = row.Step * StepScale;
                if (hoverMinus)
                {
                    if (leftDown) row.Set(v - step);
                    else if (rightDown) row.Set(v - step * 0.2f);
                }
                else if (hoverPlus)
                {
                    if (leftDown) row.Set(v + step);
                    else if (rightDown) row.Set(v + step * 0.2f);
                }

                y += RowH;
            }

            return 20f + g.Rows.Count * RowH + 10f;   // 组标题 + 若干行 + 组间距
        }

        private static void RowRects(Rect panel, float x, float y,
                                  out Rect label, out Rect minus, out Rect value, out Rect plus)
        {
            label = UiSkin.LRect(panel, x, y, 176f, RowH - 2f);
            minus = UiSkin.LRect(panel, x + 180f, y, 20f, RowH - 2f);
            value = UiSkin.LRect(panel, x + 202f, y, 64f, RowH - 2f);
            plus = UiSkin.LRect(panel, x + 268f, y, 20f, RowH - 2f);
        }

        private void DrawStatus(Rect r, Event e)
        {
            // 导出 / 重载两个按钮放在底部
            Rect export = UiSkin.LRect(r, Pad, PanelH - 32f, 156f, 22f);
            Rect reload = UiSkin.LRect(r, Pad + 164f, PanelH - 32f, 156f, 22f);

            bool hoverExport = e != null && export.Contains(e.mousePosition);
            bool hoverReload = e != null && reload.Contains(e.mousePosition);
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            UiSkin.Button(export, "导出到 balance.json", hoverExport);
            UiSkin.Button(reload, "重新读表（放弃改动）", hoverReload);

            if (hoverExport && leftDown) Export();
            if (hoverReload && leftDown) Reload();

            if (!string.IsNullOrEmpty(_status) && Time.timeSinceLevelLoad < _statusUntil)
                GUI.Label(UiSkin.LRect(r, Pad + 330f, PanelH - 32f, PanelW - 350f, 22f),
                    _status, UiSkin.Styles.Small);
        }

        // ------------------------------------------------------------------ 导出 / 重载

        /// <summary>
        /// 把当前值写回 balance.json。编辑器里直接写 StreamingAssets（这样才能提交进仓库）；
        /// 打包后 StreamingAssets 是只读的，就写到 persistentDataPath 并把路径打出来。
        /// </summary>
        public bool Export()
        {
            try
            {
                _db.Balance.combat = _db.Tuning;
                _db.Balance.shopSellRatio = _db.Shop.SellRatio;
                _db.Balance.loot = _db.Loot;
                _db.MonsterMulsToBalance();

                string json = JsonUtility.ToJson(_db.Balance, true);

#if UNITY_EDITOR
                string path = System.IO.Path.Combine(Application.streamingAssetsPath, "Data/balance.json");
#else
                string path = System.IO.Path.Combine(Application.persistentDataPath, "balance-tuned.json");
#endif
                System.IO.File.WriteAllText(path, json);
                SetStatus("已导出 -> " + path);
                Debug.Log("[SimplyCQ] 调参导出 -> " + path);
                return true;
            }
            catch (Exception ex)
            {
                SetStatus("导出失败：" + ex.Message);
                Debug.LogError("[SimplyCQ] 调参导出失败：" + ex);
                return false;
            }
        }

        /// <summary>放弃改动：重新从磁盘读一次表，覆盖当前内存里的值。</summary>
        public void Reload()
        {
            GameDatabase fresh = GameDatabase.LoadFromStreamingAssets(
                "Data/maps/map_grassland.json", "Data/monsters.json", "Data/balance.json");
            if (fresh == null || fresh.Tuning == null)
            {
                SetStatus("重读失败");
                return;
            }

            CopyInto(fresh.Tuning, _db.Tuning);
            CopyInto(fresh.Shop, _db.Shop);
            CopyInto(fresh.Loot, _db.Loot);
            _db.ResetMonsterMuls();
            SetStatus("已重新读表");
        }

        /// <summary>把整只怪的倍率也一起导出（它们是调参的一部分，不该只活在这一局里）。</summary>
        private static void CopyInto(CombatTuning from, CombatTuning to)
        {
            to.HitBase = from.HitBase; to.HitPerLevel = from.HitPerLevel; to.HitMin = from.HitMin;
            to.CritChance = from.CritChance; to.CritMultiplier = from.CritMultiplier;
            to.MinDamage = from.MinDamage; to.PlayerAttackInterval = from.PlayerAttackInterval;
            to.RegenPctPerTick = from.RegenPctPerTick; to.RegenDelayTicks = from.RegenDelayTicks;
            to.CorpseTicks = from.CorpseTicks; to.PlayerRespawnTicks = from.PlayerRespawnTicks;
            to.GroundLootTicks = from.GroundLootTicks;
            to.ExpCurveBase = from.ExpCurveBase; to.ExpCurvePow = from.ExpCurvePow;
            to.LevelUpHpGain = from.LevelUpHpGain; to.LevelUpDcGain = from.LevelUpDcGain;
            to.LevelUpAcGain = from.LevelUpAcGain;
        }

        private static void CopyInto(ShopTuning from, ShopTuning to) { to.SellRatio = from.SellRatio; }

        private static void CopyInto(LootTuning from, LootTuning to)
        {
            to.qualityWeights = (float[])from.qualityWeights.Clone();
            to.qualityLevelBonus = from.qualityLevelBonus;
        }

        private void SetStatus(string text)
        {
            _status = text;
            _statusUntil = Time.timeSinceLevelLoad + 6f;
        }

    }
}
