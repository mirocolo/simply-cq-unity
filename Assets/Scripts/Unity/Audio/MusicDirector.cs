using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 背景音乐：按地图换曲，换图时**交叉淡入淡出**（不是硬切，也不是停下来再放）。
    ///
    /// 哪张图放哪首写在 `maps/*.json` 的 `music` 字段里（值就是
    /// `Resources/Audio/Music/` 下的文件名，不带扩展名）—— 换曲子只改数据。
    /// 曲子是 CC0 的（来源见 Assets/Resources/Audio/LICENSE.md）。
    ///
    /// 和音效分开：两条独立音量、独立开关（`N` 关音乐，`M` 全部静音）。
    /// 战斗时切曲、按地图叠环境音这些留给以后 —— 这一版只做"每张图一首循环"。
    /// </summary>
    public sealed class MusicDirector
    {
        /// <summary>交叉淡入淡出用多久（秒）。太短会听出"断了一下"，太长会两首叠在一起很久。</summary>
        private const float FadeSeconds = 1.4f;

        private readonly Transform _root;
        private readonly World _world;

        private AudioSource _current;
        private AudioSource _incoming;
        private float _currentVolume;
        private float _incomingVolume;
        private bool _fading;

        private string _playingId = "";
        private string _incomingId = "";

        /// <summary>音乐音量（0~1）。默认比音效低一截 —— 音乐是背景，不该盖过打击感。</summary>
        public float Volume = 0.34f;
        public bool Muted;

        /// <summary>已经切过多少次曲 —— 冒烟自检用它验证"换图才切、同图不重放"。</summary>
        public int TrackSwitches { get; private set; }

        /// <summary>当前正在放的曲子键（淡入中的算"要放的"）。</summary>
        public string PlayingId { get { return _fading ? _incomingId : _playingId; } }

        public MusicDirector(Transform root, World world)
        {
            _root = root;
            _world = world;
            _current = MakeSource("CQ.Music.A");
            _incoming = MakeSource("CQ.Music.B");

            if (world != null) world.Events.Subscribe<MapChanged>(OnMapChanged);
        }

        private AudioSource MakeSource(string name)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(_root, false);
            AudioSource src = go.AddComponent<AudioSource>();
            src.playOnAwake = false;
            src.loop = true;            // 曲子本身就是无缝循环的
            src.spatialBlend = 0f;
            src.volume = 0f;
            return src;
        }

        /// <summary>按当前地图的 music 字段切曲。没有字段就淡出（静音）。</summary>
        public void SyncToMap() { Play(_world != null && _world.Map != null ? _world.Map.MusicId : ""); }

        private void OnMapChanged(MapChanged evt) { SyncToMap(); }

        /// <summary>换一首。同一首不重放 —— 换图换到同一首曲子时不该从头再来。</summary>
        public void Play(string musicId)
        {
            if (musicId == null) musicId = "";
            if (musicId == PlayingId) return;

            TrackSwitches++;
            _incomingId = musicId;

            if (string.IsNullOrEmpty(musicId))
            {
                // 目标是没有音乐：把当前那首淡出，不安排新曲
                _incoming.Stop();
                _incomingVolume = 0f;
                _fading = true;
                return;
            }

            AudioClip clip = Resources.Load<AudioClip>("Audio/Music/" + musicId);
            if (clip == null)
            {
                Debug.LogWarning("[SimplyCQ] 找不到背景音乐 Resources/Audio/Music/" + musicId + "，这张图静音");
                _incomingId = "";
                _fading = true;
                return;
            }

            // 换手：正在放的变成"淡出方"，新曲用另一路淡入
            AudioSource tmp = _current;
            _current = _incoming;
            _incoming = tmp;

            _incoming.clip = clip;
            _incoming.volume = 0f;
            _incoming.Play();
            _incomingVolume = 0f;
            _currentVolume = _current.isPlaying ? _current.volume : 0f;
            _fading = true;
        }

        public void Tick(float dt)
        {
            if (!_fading)
            {
                ApplyVolume(_current, _currentVolume);
                return;
            }

            float step = dt / FadeSeconds;
            _currentVolume = Mathf.Max(0f, _currentVolume - step);
            _incomingVolume = Mathf.Min(1f, _incomingVolume + step);

            ApplyVolume(_current, _currentVolume);
            ApplyVolume(_incoming, _incomingVolume);

            if (_currentVolume <= 0f && _incomingVolume >= 1f)
            {
                _fading = false;
                _playingId = _incomingId;
                _current.Stop();          // 淡出的那路要停掉，不然它还在后台占着解码
                _currentVolume = 0f;
            }
        }

        private void ApplyVolume(AudioSource src, float scale)
        {
            if (src == null) return;
            src.volume = (Muted ? 0f : Volume) * scale;
        }

        /// <summary>`N`：只开关音乐，音效照常。</summary>
        public bool ToggleMute()
        {
            Muted = !Muted;
            if (Muted) { _current.volume = 0f; _incoming.volume = 0f; }
            else
            {
                // 恢复时要接着放，而不是从头开始
                if (!_current.isPlaying && _current.clip != null) _current.Play();
                if (_fading && !_incoming.isPlaying && _incoming.clip != null) _incoming.Play();
                ApplyVolume(_current, _currentVolume);
                ApplyVolume(_incoming, _incomingVolume);
            }
            return Muted;
        }

        public float AdjustVolume(float delta)
        {
            Volume = Mathf.Clamp01(Volume + delta);
            ApplyVolume(_current, _currentVolume);
            ApplyVolume(_incoming, _incomingVolume);
            return Volume;
        }

        public string StatusText
        {
            get
            {
                if (Muted) return "音乐关";
                if (string.IsNullOrEmpty(PlayingId)) return "音乐无";
                return "音乐 " + PlayingId + "（" + Mathf.RoundToInt(Volume * 100f) + "%）";
            }
        }

        /// <summary>退出时收掉运行时建的两个音频物体。</summary>
        public void Dispose()
        {
            if (_current != null && _current.gameObject != null) Object.Destroy(_current.gameObject);
            if (_incoming != null && _incoming.gameObject != null) Object.Destroy(_incoming.gameObject);
            _current = null;
            _incoming = null;
        }
    }
}
