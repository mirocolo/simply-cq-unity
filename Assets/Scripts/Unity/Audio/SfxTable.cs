using System.Collections.Generic;

namespace SimplyCQ.Unity
{
    /// <summary>一条音效。加音效就往 <see cref="SfxTable"/> 的表里加一行，不用改播放代码。</summary>
    public enum SfxId
    {
        None = 0,
        Swing,          // 挥砍（挥空也用它 —— 挥空就是一次没砍到人的挥砍，不必单独响一声）
        Hit,            // 命中
        Crit,           // 暴击
        MonsterDie,     // 怪死
        PlayerDie,      // 玩家死
        Respawn,        // 复活
        LevelUp,        // 升级
        SkillLearn,     // 学会技能
        SkillCast,      // 放技能
        Coin,           // 金币进出
        Loot,           // 拾取物品
        Equip,          // 穿脱装备
        Drink,          // 喝药
        Refuse,         // 各类"不行"（金币不够 / 背包满 / 冷却中…）
        Click,          // 面板点击
        PanelOpen,      // 开面板
        PanelClose,     // 关面板
        Teleport,       // 换图 / 传送
        StepGrass,      // 草地脚步
        StepStone       // 石地脚步
    }

    /// <summary>
    /// 音效表：每条音效对应哪些音频文件、多重、音高多少。
    ///
    /// 素材是 Kenney 的 CC0 包（见 Assets/Resources/Audio/LICENSE.md），
    /// 仓库里只放了用到的 34 个文件，不是整包 —— 换素材只要改这里的路径。
    /// </summary>
    public static class SfxTable
    {
        public sealed class SfxDef
        {
            public SfxId Id;
            /// <summary>Resources 下的路径（不含扩展名）。多个文件 = 每次随机挑一个。</summary>
            public string[] Clips;
            /// <summary>相对音量。</summary>
            public float Volume = 1f;
            /// <summary>基准音高；1 = 原速。</summary>
            public float Pitch = 1f;
            /// <summary>音高随机范围，避免同一个音重复到像机关枪。</summary>
            public float PitchSpread;
            /// <summary>最小间隔（秒）。0 = 不限制。脚步声和命中音靠它防刷屏。</summary>
            public float MinInterval;
        }

        private static readonly Dictionary<SfxId, SfxDef> _byId = Build();

        public static SfxDef Get(SfxId id)
        {
            SfxDef def;
            return _byId.TryGetValue(id, out def) ? def : null;
        }

        public static IEnumerable<SfxDef> All { get { return _byId.Values; } }
        public static int Count { get { return _byId.Count; } }

        private static Dictionary<SfxId, SfxDef> Build()
        {
            Dictionary<SfxId, SfxDef> t = new Dictionary<SfxId, SfxDef>();

            Add(t, SfxId.Swing, new[] { "Audio/swing/swing_1", "Audio/swing/swing_2" },
                volume: 0.45f, pitchSpread: 0.08f, minInterval: 0.12f);

            Add(t, SfxId.Hit, new[] { "Audio/hit/hit_1", "Audio/hit/hit_2", "Audio/hit/hit_3" },
                volume: 0.55f, pitchSpread: 0.12f, minInterval: 0.06f);
            Add(t, SfxId.Crit, new[] { "Audio/hit/crit_1", "Audio/hit/crit_2" },
                volume: 0.75f, pitchSpread: 0.06f, minInterval: 0.06f);

            Add(t, SfxId.MonsterDie, new[] { "Audio/death/monster_1", "Audio/death/monster_2" },
                volume: 0.55f, pitchSpread: 0.08f);
            Add(t, SfxId.PlayerDie, new[] { "Audio/death/player_1" }, volume: 0.8f);
            Add(t, SfxId.Respawn, new[] { "Audio/death/respawn_1" }, volume: 0.7f);

            Add(t, SfxId.LevelUp, new[] { "Audio/jingle/levelup_1" }, volume: 0.7f);
            Add(t, SfxId.SkillLearn, new[] { "Audio/jingle/skill_1" }, volume: 0.7f);
            Add(t, SfxId.SkillCast, new[] { "Audio/skill/cast_1", "Audio/skill/cast_2" },
                volume: 0.5f, pitchSpread: 0.1f, minInterval: 0.1f);

            Add(t, SfxId.Coin, new[] { "Audio/coin/coin_1", "Audio/coin/coin_2" },
                volume: 0.5f, pitchSpread: 0.08f, minInterval: 0.05f);
            Add(t, SfxId.Loot, new[] { "Audio/loot/loot_1", "Audio/loot/loot_2" },
                volume: 0.5f, pitchSpread: 0.08f, minInterval: 0.06f);
            Add(t, SfxId.Equip, new[] { "Audio/gear/equip_1" }, volume: 0.6f, pitchSpread: 0.05f);
            Add(t, SfxId.Drink, new[] { "Audio/gear/drink_1" }, volume: 0.55f, pitchSpread: 0.05f);

            Add(t, SfxId.Refuse, new[] { "Audio/ui/refuse_1" }, volume: 0.4f, pitchSpread: 0.04f, minInterval: 0.35f);
            Add(t, SfxId.Click, new[] { "Audio/ui/click_1" }, volume: 0.4f, minInterval: 0.05f);
            Add(t, SfxId.PanelOpen, new[] { "Audio/ui/open_1" }, volume: 0.45f, minInterval: 0.08f);
            Add(t, SfxId.PanelClose, new[] { "Audio/ui/close_1" }, volume: 0.45f, minInterval: 0.08f);
            Add(t, SfxId.Teleport, new[] { "Audio/ui/teleport_1" }, volume: 0.6f);

            // 脚步：草地 / 石地各一套。间隔调得比走路略慢，免得连成一串
            Add(t, SfxId.StepGrass, new[] { "Audio/step/grass_1", "Audio/step/grass_2", "Audio/step/grass_3",
                                           "Audio/step/grass_4", "Audio/step/grass_5" },
                volume: 0.3f, pitchSpread: 0.12f, minInterval: 0.24f);
            Add(t, SfxId.StepStone, new[] { "Audio/step/stone_1", "Audio/step/stone_2", "Audio/step/stone_3" },
                volume: 0.32f, pitchSpread: 0.12f, minInterval: 0.24f);

            return t;
        }

        private static void Add(Dictionary<SfxId, SfxDef> t, SfxId id, string[] clips,
                                float volume = 1f, float pitch = 1f, float pitchSpread = 0f,
                                float minInterval = 0f)
        {
            SfxDef d = new SfxDef();
            d.Id = id;
            d.Clips = clips;
            d.Volume = volume;
            d.Pitch = pitch;
            d.PitchSpread = pitchSpread;
            d.MinInterval = minInterval;
            t[id] = d;
        }
    }
}
