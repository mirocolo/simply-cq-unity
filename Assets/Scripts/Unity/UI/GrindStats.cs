using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 挂机收益统计：本次挂机杀了多少、赚了多少、爆了几件什么品质。
    ///
    /// 页游挂机每隔一会儿给你一张收益报告，是"愿意继续挂"的心理引擎——
    /// 人得看得见数字在涨，才相信自己在变强。效率一行（击杀/分钟）的口径
    /// 直接来自数值审计（每只怪打几秒是算过的），不自造一套。
    ///
    /// 第一版只做"本次挂机"（内存）；写进存档放到耐久那批（SaveData Version3）。
    /// </summary>
    public sealed class GrindStats
    {
        private readonly World _world;

        public int Kills;
        public long Exp;
        public long Gold;
        public readonly int[] ItemsByQuality = new int[ItemQualityRules.Count];

        private float _startedAt = -1f;

        public GrindStats(World world)
        {
            _world = world;
            if (world != null)
            {
                world.Events.Subscribe<EntityDied>(OnDied);
                world.Events.Subscribe<ExpGained>(OnExp);
                world.Events.Subscribe<GoldPicked>(OnGold);
                world.Events.Subscribe<ItemPicked>(OnItem);
            }
        }

        private bool IsPlayer(ActorId id)
        {
            Entity p = _world != null ? _world.Get(id) : null;
            return p != null && p.Kind == EntityKind.Player;
        }

        private void OnDied(EntityDied e)
        {
            if (e.Killer.IsValid && IsPlayer(e.Killer)) Kills++;
        }

        private void OnExp(ExpGained e)
        {
            if (IsPlayer(e.Id)) Exp += e.Amount;
        }

        private void OnGold(GoldPicked e)
        {
            if (IsPlayer(e.By)) Gold += e.Amount;
        }

        private void OnItem(ItemPicked e)
        {
            if (!IsPlayer(e.By)) return;
            int i = (int)e.Quality;
            if (i >= 0 && i < ItemsByQuality.Length) ItemsByQuality[i] += e.Count;
        }

        /// <summary>开挂机时清零重计。</summary>
        public void StartSession()
        {
            Kills = 0;
            Exp = 0;
            Gold = 0;
            for (int i = 0; i < ItemsByQuality.Length; i++) ItemsByQuality[i] = 0;
            _startedAt = Time.timeSinceLevelLoad;
        }

        public bool HasSession { get { return _startedAt >= 0f; } }

        public float Minutes
        {
            get { return _startedAt < 0f ? 0f : Mathf.Max(0.01f, (Time.timeSinceLevelLoad - _startedAt) / 60f); }
        }

        /// <summary>击杀效率（只/分钟）—— 页游挂机最关心的一行。</summary>
        public float KillsPerMinute { get { return Kills / Minutes; } }

        public string Summary
        {
            get
            {
                return string.Format("挂机 {0:0} 分钟   击杀 {1}（{2:0.0}/分）   经验 +{3}   金币 +{4}\n蓝 {5}   紫 {6}",
                    Minutes, Kills, KillsPerMinute, Exp, Gold,
                    ItemsByQuality[(int)ItemQuality.Blue], ItemsByQuality[(int)ItemQuality.Purple]);
            }
        }
    }
}
