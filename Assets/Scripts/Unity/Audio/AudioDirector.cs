using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 音效播放器：订阅 Domain 事件，按 <see cref="SfxTable"/> 播对应的声音。
    ///
    /// 为什么放在表现层：Domain 只发事件、不知道有声音这回事（它连 UnityEngine 都不能 using）。
    /// 音频是纯粹的"表现"，所以和飘字、刀光一样只订阅事件 —— 这条线不破。
    ///
    /// 空间感：这个游戏是 2D 斜俯视，所以不做真正的 3D 衰减，只做两件事：
    ///   · **左右**：按屏幕位置算声像（`panStereo`），右边的怪声音偏右
    ///   · **远近**：按离玩家的格数压音量，远处的打斗声小
    /// 洞窟里踩石地、草原上踩草地也分开 —— 地形变了，脚步声跟着变。
    ///
    /// 场景里不放任何东西：AudioSource 是运行时建的（和地图/怪物一样，运行时按数据生成），
    /// 所以这个项目"打开场景点 Play 就行"这条性质没被破坏。
    /// </summary>
    public sealed class AudioDirector
    {
        private const int VoiceCount = 12;

        private readonly World _world;
        private readonly Projection _projection;
        private readonly Camera _camera;

        private readonly GameObject _root;
        private readonly AudioSource[] _voices;
        private readonly Dictionary<string, AudioClip> _clips = new Dictionary<string, AudioClip>();
        private readonly Dictionary<SfxId, float> _lastPlayed = new Dictionary<SfxId, float>();
        private readonly HashSet<string> _missing = new HashSet<string>();

        /// <summary>总音量 0~1。</summary>
        public float MasterVolume = 0.8f;
        public bool Muted;

        private int _nextVoice;
        private float _now;

        /// <summary>已经播过多少次 —— 冒烟自检用它验证"事件确实接到了音效上"。</summary>
        public int PlayedCount { get; private set; }

        public AudioDirector(World world, Projection projection, Camera camera)
        {
            _world = world;
            _projection = projection;
            _camera = camera;

            _root = new GameObject("CQ.Audio");   // 根物体，不挂到任何东西上
            _voices = new AudioSource[VoiceCount];
            for (int i = 0; i < VoiceCount; i++)
            {
                AudioSource src = _root.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.spatialBlend = 0f;      // 2D：声像/距离自己算，交给 Unity 的 3D 衰减反而更糊
                src.bypassEffects = true;
                src.bypassListenerEffects = true;
                _voices[i] = src;
            }

            Subscribe();
        }

        /// <summary>退出时把运行时建的 GameObject 收掉，别让它跨场景/跨播放留着。</summary>
        public void Dispose()
        {
            if (_root != null) Object.Destroy(_root);
        }

        // ------------------------------------------------------------------ 事件 -> 音效

        private void Subscribe()
        {
            if (_world == null) return;
            IEventBus bus = _world.Events;

            bus.Subscribe<AttackSwing>(delegate(AttackSwing e) { PlayAt(SfxId.Swing, PosOf(e.Actor)); });
            bus.Subscribe<AttackMissed>(delegate(AttackMissed e) { PlayAt(SfxId.Miss, PosOf(e.Source)); });
            bus.Subscribe<DamageDealt>(OnDamage);
            bus.Subscribe<EntityDied>(OnDied);
            bus.Subscribe<PlayerRespawned>(delegate(PlayerRespawned e) { Play(SfxId.Respawn); });
            bus.Subscribe<LevelUp>(delegate(LevelUp e) { Play(SfxId.LevelUp); });
            bus.Subscribe<SkillLearned>(delegate(SkillLearned e) { Play(SfxId.SkillLearn); });
            bus.Subscribe<SkillCast>(OnSkillCast);
            bus.Subscribe<GoldPicked>(delegate(GoldPicked e) { Play(SfxId.Coin); });
            bus.Subscribe<ItemPicked>(OnItemPicked);
            bus.Subscribe<ItemSold>(delegate(ItemSold e) { Play(SfxId.Coin); });
            bus.Subscribe<ItemBought>(delegate(ItemBought e) { Play(SfxId.Coin); });
            bus.Subscribe<ItemUsed>(delegate(ItemUsed e) { Play(SfxId.Drink); });
            bus.Subscribe<EquipmentChanged>(delegate(EquipmentChanged e) { Play(SfxId.Equip); });
            bus.Subscribe<MapChanged>(delegate(MapChanged e) { Play(SfxId.Teleport); });

            // 所有"不行"共用一个音：玩家不需要分辨是哪一种拒绝，只需要知道"没成"
            bus.Subscribe<PickupRefused>(delegate(PickupRefused e) { Play(SfxId.Refuse); });
            bus.Subscribe<ShopRefused>(delegate(ShopRefused e) { Play(SfxId.Refuse); });
            bus.Subscribe<SkillRefused>(delegate(SkillRefused e) { Play(SfxId.Refuse); });
            bus.Subscribe<PortalRefused>(delegate(PortalRefused e) { Play(SfxId.Refuse); });
            bus.Subscribe<PlayerIntentRejected>(delegate(PlayerIntentRejected e) { Play(SfxId.Refuse); });

            bus.Subscribe<EntityMoved>(OnMoved);
        }

        private void OnDamage(DamageDealt e)
        {
            PlayAt(e.Crit ? SfxId.Crit : SfxId.Hit, PosOf(e.Target));
        }

        private void OnDied(EntityDied e)
        {
            World world = _world;
            Entity dead = world != null ? world.Get(e.Id) : null;
            bool isPlayer = dead != null && dead.Kind == EntityKind.Player;
            PlayAt(isPlayer ? SfxId.PlayerDie : SfxId.MonsterDie, PosOf(e.Id), centre: isPlayer);
        }

        private void OnSkillCast(SkillCast e)
        {
            PlayAt(e.Success ? SfxId.SkillCast : SfxId.Refuse, PosOf(e.Caster));
        }

        private void OnItemPicked(ItemPicked e)
        {
            // 品质越高音高越高 —— 捡到史诗那一下听得出"这把是好东西"
            float pitch = 1f + (int)e.Quality * 0.09f;
            PlayAt(SfxId.Loot, PosOf(e.By), pitchScale: pitch);
        }

        /// <summary>脚步只关心玩家自己：满地图怪的脚步会变成噪音。</summary>
        private void OnMoved(EntityMoved e)
        {
            World world = _world;
            if (world == null || world.Player == null || e.Id != world.Player.Id) return;

            // 脚下是草还是石头，问地图（不按地图 id 写死，以后加新图不用回来改这里）
            GameMap map = _world.Map;
            Play(map != null && map.IsHardGround(e.To) ? SfxId.StepStone : SfxId.StepGrass);
        }

        // ------------------------------------------------------------------ 播放

        /// <summary>播一条音效（界面音、主角身上的音，不做声像）。</summary>
        public void Play(SfxId id) { PlayInternal(id, Vector3.zero, 0f, 1f, false); }

        /// <summary>在有世界坐标的地方播 —— 会按屏幕位置做左右声像、按离玩家的距离压音量。</summary>
        public void PlayAt(SfxId id, Vector3 worldPos, float pitchScale = 1f, bool centre = false)
        {
            PlayInternal(id, worldPos, 0f, pitchScale, !centre);
        }

        private void PlayInternal(SfxId id, Vector3 worldPos, float pan, float pitchScale, bool spatial)
        {
            if (Muted) return;

            SfxTable.SfxDef def = SfxTable.Get(id);
            if (def == null || def.Clips == null || def.Clips.Length == 0) return;

            if (def.MinInterval > 0f)
            {
                float last;
                if (_lastPlayed.TryGetValue(id, out last) && _now - last < def.MinInterval) return;
            }
            _lastPlayed[id] = _now;

            AudioClip clip = PickClip(def);
            if (clip == null) return;

            float pan2 = 0f;
            float distanceScale = 1f;
            if (spatial && _camera != null)
            {
                Vector3 vp = _camera.WorldToViewportPoint(worldPos);
                pan2 = Mathf.Clamp((vp.x - 0.5f) * 1.8f, -0.85f, 0.85f);

                // 离玩家越远越轻，但留个下限 —— 远处完全不响会让玩家不知道有人在打
                int dist = DistanceToPlayer(worldPos);
                distanceScale = Mathf.Clamp(1f / (1f + dist * 0.16f), 0.18f, 1f);
            }

            AudioSource src = NextVoice();
            src.clip = clip;
            src.panStereo = pan2;
            src.volume = Mathf.Clamp01(MasterVolume * def.Volume * distanceScale);
            src.pitch = Mathf.Max(0.35f, (def.Pitch + Random.Range(-def.PitchSpread, def.PitchSpread)) * pitchScale);
            src.Play();
            PlayedCount++;
        }

        private AudioClip PickClip(SfxTable.SfxDef def)
        {
            string key = def.Clips[def.Clips.Length == 1 ? 0 : Random.Range(0, def.Clips.Length)];
            AudioClip clip;
            if (_clips.TryGetValue(key, out clip)) return clip;

            clip = Resources.Load<AudioClip>(key);
            if (clip == null)
            {
                // 只报一次：缺文件是数据问题，不该每 tick 刷一屏日志
                if (_missing.Add(key))
                    Debug.LogWarning("[SimplyCQ] 音效文件缺失（Resources/" + key + "），这条音效静音");
                return null;
            }
            _clips[key] = clip;
            return clip;
        }

        private AudioSource NextVoice()
        {
            // 先找空闲的；都忙就轮转抢掉最早那个 —— 宁可吃掉旧音，也不要排队到"延迟半秒才响"
            for (int i = 0; i < _voices.Length; i++)
            {
                int idx = (_nextVoice + i) % _voices.Length;
                if (!_voices[idx].isPlaying)
                {
                    _nextVoice = (idx + 1) % _voices.Length;
                    return _voices[idx];
                }
            }
            AudioSource steal = _voices[_nextVoice];
            _nextVoice = (_nextVoice + 1) % _voices.Length;
            return steal;
        }

        private int DistanceToPlayer(Vector3 worldPos)
        {
            if (_world == null || _world.Player == null || _projection == null) return 0;
            Vector3 me = _projection.FootPoint(_world.Player.Pos);
            return Mathf.RoundToInt(Mathf.Max(Mathf.Abs(worldPos.x - me.x), Mathf.Abs(worldPos.y - me.y)) / Mathf.Max(0.001f, _projection.TileW));
        }

        private Vector3 PosOf(ActorId id)
        {
            if (_world == null) return Vector3.zero;
            Entity e = _world.Get(id);
            if (e == null || _projection == null) return Vector3.zero;
            return _projection.FootPoint(e.Pos);
        }

        // ------------------------------------------------------------------ 开关 / 音量

        /// <summary>每帧调一次，用来推进"最小间隔"的时钟。</summary>
        public void Tick(float dt) { _now += dt; }

        public bool ToggleMute()
        {
            Muted = !Muted;
            if (Muted)
            {
                // 已经排队的音也要掐掉，不然按了静音还剩半秒的挥砍声
                for (int i = 0; i < _voices.Length; i++) _voices[i].Stop();
            }
            return Muted;
        }

        public float AdjustVolume(float delta)
        {
            MasterVolume = Mathf.Clamp01(MasterVolume + delta);
            return MasterVolume;
        }

        public string StatusText
        {
            get { return Muted ? "静音" : "音量 " + Mathf.RoundToInt(MasterVolume * 100f) + "%"; }
        }
    }
}
