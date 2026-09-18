using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>特效种类。每种有自己的缩放曲线和淡出曲线，见 <see cref="CombatFxPool.Animate"/>。</summary>
    public enum FxKind
    {
        /// <summary>普攻/单体技能的斩击：身前一道旋转的刀光。</summary>
        Slash,
        /// <summary>命中爆点：星芒。</summary>
        Blast,
        /// <summary>扩散环：冲击波 / 挨打 / 升级时那一圈。</summary>
        Ring,
        /// <summary>死亡烟尘。</summary>
        Puff,
        /// <summary>光柱：升级、复活。</summary>
        Beam,
        /// <summary>直线斩（刺杀剑术）。</summary>
        Line
    }

    /// <summary>
    /// 战斗特效池：刀光 / 命中爆点 / 暴击 / 死亡烟尘 / 升级光柱 / 三种技能。
    ///
    /// 之前只有普攻刀光 —— 逻辑扣了血、屏幕上却没有"打中了"的那一下。
    /// 现在所有战斗反馈都在这里，而且**仍然一行美术资源都不需要**：
    /// 图形由 <see cref="PlaceholderArt"/> 运行时生成，颜色由这里染色（一张白图复用成各种颜色）。
    ///
    /// 池化复用很重要：命中每刀都有，每次 new GameObject 会一直产生 GC 垃圾。
    /// </summary>
    public sealed class CombatFxPool
    {
        private sealed class Fx
        {
            public GameObject Go;
            public SpriteRenderer Renderer;
            public FxKind Kind;
            public float Age;
            public float Life;
            /// <summary>起始/结束缩放。中间怎么走由种类的曲线决定。</summary>
            public float StartScale;
            public float EndScale;
            /// <summary>上浮高度（格）。烟团往上升，别的都是 0。</summary>
            public float Rise;
            public Vector3 BasePos;
            public Color Tint;
            public bool Active;
        }

        private const int SlashWidthPx = 64;
        private const int SlashHeightPx = 22;
        private const int BlastPx = 48;
        private const int RingPx = 56;
        private const int PuffPx = 52;
        private const int BeamWidthPx = 26;
        private const int BeamHeightPx = 96;
        private const int LineWidthPx = 96;
        private const int LineHeightPx = 18;
        private const float PixelsPerUnit = 32f;

        private static readonly Color HitTint = UiColor.Srgb(0.92f, 0.96f, 1f);
        private static readonly Color CritTint = UiColor.Srgb(1f, 0.80f, 0.28f);
        private static readonly Color HurtTint = UiColor.Srgb(1f, 0.35f, 0.30f);
        private static readonly Color DeathTint = UiColor.Srgb(0.62f, 0.58f, 0.52f);
        private static readonly Color PlayerDeathTint = UiColor.Srgb(0.72f, 0.22f, 0.20f);
        private static readonly Color LevelTint = UiColor.Srgb(1f, 0.88f, 0.42f);
        private static readonly Color RespawnTint = UiColor.Srgb(0.55f, 0.80f, 1f);
        private static readonly Color SkillTint = UiColor.Srgb(0.72f, 0.92f, 1f);
        private static readonly Color FlameTint = UiColor.Srgb(1f, 0.58f, 0.22f);

        private readonly Transform _root;
        private readonly Projection _projection;
        private readonly World _world;
        private readonly EntityViewRegistry _views;
        private readonly CameraRig _camera;
        private readonly List<Fx> _pool = new List<Fx>();

        private Sprite _slash, _blast, _ring, _puff, _beam, _line;

        public CombatFxPool(Transform root, Projection projection, World world, EntityViewRegistry views,
                            CameraRig camera = null)
        {
            _root = root;
            _projection = projection;
            _world = world;
            _views = views;
            _camera = camera;

            world.Events.Subscribe<AttackSwing>(OnSwing);
            world.Events.Subscribe<SkillCast>(OnSkillCast);
            world.Events.Subscribe<DamageDealt>(OnDamage);
            world.Events.Subscribe<EntityDied>(OnDied);
            world.Events.Subscribe<LevelUp>(OnLevelUp);
            world.Events.Subscribe<PlayerRespawned>(OnRespawned);
        }

        // ------------------------------------------------------------------ 什么事件炸什么

        private void OnSwing(AttackSwing evt)
        {
            SpawnSlash(evt.Actor, evt.Dir, 0.16f, 0.85f, 1f);
        }

        /// <summary>三个战士技能给三种不同的样子 —— 不然放了技能只看得出"扣了蓝"。</summary>
        private void OnSkillCast(SkillCast evt)
        {
            if (!evt.Success) return;

            switch (evt.SkillId)
            {
                case "sk_thrust":   // 刺杀剑术：身前两格直线
                    SpawnLine(evt.Caster, evt.Dir);
                    break;

                case "sk_flame":    // 烈火剑法：自身周围一圈火
                    {
                        Vector3 at = ActorPos(evt.Caster);
                        SpawnRing(at, 0.42f, 0.5f, 2.1f, FlameTint);
                        SpawnBeam(at, 0.5f, 0.9f, FlameTint);
                        break;
                    }

                default:            // 攻杀剑术（以及以后新增的单体技能）：更大的斩击
                    SpawnSlash(evt.Caster, evt.Dir, 0.28f, 1.05f, 1.5f);
                    break;
            }
        }

        private void OnDamage(DamageDealt evt)
        {
            Vector3 at = ActorPos(evt.Target);

            // 自己挨打：红环 + 震动。打在玩家身上比打在怪身上更需要被"感觉到"
            if (IsPlayer(evt.Target))
            {
                SpawnRing(at, 0.28f, 0.5f, 1.6f, HurtTint);
                Shake(0.10f, 0.16f);
                return;
            }

            if (evt.Crit)
            {
                SpawnBlast(at, 0.32f, 1.6f, CritTint);
                SpawnRing(at, 0.30f, 0.4f, 2.0f, CritTint);
                Shake(0.13f, 0.18f);
            }
            else
            {
                SpawnBlast(at, 0.16f, 0.95f, HitTint);
            }
        }

        private void OnDied(EntityDied evt)
        {
            bool player = IsPlayer(evt.Id);
            SpawnPuff(ActorPos(evt.Id), player ? 0.70f : 0.45f, player ? 1.7f : 1.1f,
                      player ? PlayerDeathTint : DeathTint);
            if (player) Shake(0.22f, 0.35f);
        }

        private void OnLevelUp(LevelUp evt)
        {
            Vector3 at = ActorPos(evt.Id);
            SpawnBeam(at, 0.9f, 1.0f, LevelTint);
            SpawnRing(at, 0.55f, 0.5f, 2.5f, LevelTint);
        }

        private void OnRespawned(PlayerRespawned evt)
        {
            // 用事件里的落点：这一刻实体可能刚摆好，At 更可靠
            Vector3 at = _projection != null ? _projection.FootPoint(evt.At) : ActorPos(evt.Id);
            SpawnBeam(at, 0.8f, 1.0f, RespawnTint);
            SpawnRing(at, 0.5f, 0.5f, 2.1f, RespawnTint);
        }

        // ------------------------------------------------------------------ 生成

        private void SpawnSlash(ActorId actor, Dir dir, float life, float distanceTiles, float scale)
        {
            Transform t = _views.GetTransform(actor);
            if (t == null) return;

            Vector3 dirWorld = new Vector3(DirHelper.Dx(dir), -DirHelper.Dy(dir), 0f);
            if (dirWorld.sqrMagnitude < 0.01f) return;
            dirWorld.Normalize();

            Vector3 at = t.position + dirWorld * (_projection.TileW * distanceTiles);
            float angle = Mathf.Atan2(dirWorld.y, dirWorld.x) * Mathf.Rad2Deg;

            Fx fx = Rent(FxKind.Slash);
            Begin(fx, at, life, scale, scale * 1.6f, Color.white);
            fx.Go.transform.localRotation = Quaternion.Euler(0f, 0f, angle);
            fx.Renderer.sprite = SlashSprite();
        }

        private void SpawnLine(ActorId caster, Dir dir)
        {
            Transform t = _views.GetTransform(caster);
            if (t == null) return;

            Vector3 dirWorld = new Vector3(DirHelper.Dx(dir), -DirHelper.Dy(dir), 0f);
            if (dirWorld.sqrMagnitude < 0.01f) return;
            dirWorld.Normalize();

            Vector3 at = t.position + dirWorld * (_projection.TileW * 1.5f);
            float angle = Mathf.Atan2(dirWorld.y, dirWorld.x) * Mathf.Rad2Deg;

            Fx fx = Rent(FxKind.Line);
            Begin(fx, at, 0.22f, 0.35f, 1.25f, SkillTint);
            fx.Go.transform.localRotation = Quaternion.Euler(0f, 0f, angle);
            fx.Renderer.sprite = LineSprite();
        }

        private void SpawnBlast(Vector3 at, float life, float scale, Color tint)
        {
            Fx fx = Rent(FxKind.Blast);
            Begin(fx, at, life, scale * 0.55f, scale * 1.35f, tint);
            fx.Renderer.sprite = BlastSprite();
        }

        private void SpawnRing(Vector3 at, float life, float startScale, float endScale, Color tint)
        {
            Fx fx = Rent(FxKind.Ring);
            Begin(fx, at, life, startScale, endScale, tint);
            fx.Renderer.sprite = RingSprite();
        }

        private void SpawnPuff(Vector3 at, float life, float scale, Color tint)
        {
            Fx fx = Rent(FxKind.Puff);
            Begin(fx, at, life, scale * 0.7f, scale * 1.4f, tint);
            fx.Rise = _projection != null ? _projection.TileH * 0.9f : 0.4f;
            fx.Renderer.sprite = PuffSprite();
        }

        private void SpawnBeam(Vector3 at, float life, float scale, Color tint)
        {
            Fx fx = Rent(FxKind.Beam);
            Begin(fx, at, life, scale * 0.35f, scale, tint);
            fx.Renderer.sprite = BeamSprite();
        }

        private void Begin(Fx fx, Vector3 at, float life, float startScale, float endScale, Color tint)
        {
            fx.Age = 0f;
            fx.Life = life;
            fx.StartScale = startScale;
            fx.EndScale = endScale;
            fx.Rise = 0f;
            fx.BasePos = at;
            fx.Tint = tint;
            fx.Active = true;

            fx.Go.transform.position = at;
            fx.Go.transform.localRotation = Quaternion.identity;
            fx.Go.transform.localScale = new Vector3(startScale, startScale, 1f);
            fx.Renderer.enabled = true;
            fx.Renderer.color = tint;
        }

        private Fx Rent(FxKind kind)
        {
            for (int i = 0; i < _pool.Count; i++)
                if (!_pool[i].Active && _pool[i].Kind == kind) return _pool[i];

            Fx created = new Fx();
            created.Kind = kind;
            created.Go = new GameObject("fx_" + kind.ToString().ToLowerInvariant());
            created.Go.transform.SetParent(_root, false);
            created.Renderer = created.Go.AddComponent<SpriteRenderer>();
            created.Renderer.sortingOrder = 30000;   // 永远盖在角色上面
            created.Renderer.enabled = false;
            _pool.Add(created);
            return created;
        }

        private Sprite SlashSprite() { return _slash != null ? _slash : (_slash = PlaceholderArt.Slash(SlashWidthPx, SlashHeightPx, PixelsPerUnit)); }
        private Sprite BlastSprite() { return _blast != null ? _blast : (_blast = PlaceholderArt.Blast(BlastPx, PixelsPerUnit)); }
        private Sprite RingSprite() { return _ring != null ? _ring : (_ring = PlaceholderArt.Ring(RingPx, PixelsPerUnit)); }
        private Sprite PuffSprite() { return _puff != null ? _puff : (_puff = PlaceholderArt.Puff(PuffPx, PixelsPerUnit)); }
        private Sprite BeamSprite() { return _beam != null ? _beam : (_beam = PlaceholderArt.Beam(BeamWidthPx, BeamHeightPx, PixelsPerUnit)); }
        private Sprite LineSprite() { return _line != null ? _line : (_line = PlaceholderArt.Line(LineWidthPx, LineHeightPx, PixelsPerUnit)); }

        private Vector3 ActorPos(ActorId id)
        {
            Transform t = _views.GetTransform(id);
            if (t != null) return t.position;

            Entity e = _world != null ? _world.Get(id) : null;
            return e != null && _projection != null ? _projection.FootPoint(e.Pos) : Vector3.zero;
        }

        private bool IsPlayer(ActorId id)
        {
            Entity e = _world != null ? _world.Get(id) : null;
            return e != null && e.Kind == EntityKind.Player;
        }

        private void Shake(float amount, float seconds)
        {
            if (_camera != null) _camera.Shake(amount, seconds);
        }

        public int ActiveCount
        {
            get
            {
                int n = 0;
                for (int i = 0; i < _pool.Count; i++) if (_pool[i].Active) n++;
                return n;
            }
        }

        /// <summary>池里一共建了几个物体 —— 冒烟自检用它验证"特效是复用的，不是每次 new"。</summary>
        public int PoolSize { get { return _pool.Count; } }

        /// <summary>换图时关掉所有活跃特效 —— 它们停在上一张图的世界坐标上。</summary>
        public void Clear()
        {
            for (int i = 0; i < _pool.Count; i++)
            {
                if (!_pool[i].Active) continue;
                _pool[i].Active = false;
                _pool[i].Renderer.enabled = false;
            }
        }

        public void Tick(float dt)
        {
            for (int i = 0; i < _pool.Count; i++)
            {
                Fx fx = _pool[i];
                if (!fx.Active) continue;

                fx.Age += dt;
                if (fx.Age >= fx.Life)
                {
                    fx.Active = false;
                    fx.Renderer.enabled = false;
                    continue;
                }

                Animate(fx, fx.Age / fx.Life);
            }
        }

        /// <summary>
        /// 每种特效的"动画"其实就三件事：缩放怎么涨、要不要上浮、怎么淡出。
        /// 曲线用 Sqrt 是因为它"起步快、后面慢" —— 打击感要的正是这一下急停。
        /// </summary>
        private void Animate(Fx fx, float k)
        {
            float scale;
            float alpha;

            switch (fx.Kind)
            {
                case FxKind.Slash:
                    scale = Mathf.Lerp(fx.StartScale, fx.EndScale, Mathf.Sqrt(k));
                    alpha = 1f - k;
                    break;

                case FxKind.Line:
                    // 直线斩：横向"刷"地展开，然后很快消失
                    scale = Mathf.Lerp(fx.StartScale, fx.EndScale, Mathf.Sqrt(k));
                    alpha = 1f - k * k;
                    break;

                case FxKind.Blast:
                    // 前 40% 冲出去，之后就淡掉
                    scale = Mathf.Lerp(fx.StartScale, fx.EndScale, Mathf.Sqrt(k));
                    alpha = Mathf.Clamp01(1f - k * 1.15f);
                    break;

                case FxKind.Ring:
                    scale = Mathf.Lerp(fx.StartScale, fx.EndScale, Mathf.Sqrt(k));
                    alpha = Mathf.Clamp01(0.9f - k * 1.1f);
                    break;

                case FxKind.Puff:
                    // 烟：慢慢涨、边升边淡
                    scale = Mathf.Lerp(fx.StartScale, fx.EndScale, k);
                    alpha = Mathf.Clamp01(1f - k * k);
                    break;

                default:   // Beam：先"长出来"，后半段只淡出（别缩回去，光柱缩回去很怪）
                    scale = Mathf.Lerp(fx.StartScale, fx.EndScale, Mathf.Clamp01(k * 4f));
                    alpha = Mathf.Clamp01(1f - Mathf.Max(0f, k - 0.45f) * 1.8f);
                    break;
            }

            fx.Go.transform.localScale = new Vector3(scale, scale, 1f);
            if (fx.Rise > 0f) fx.Go.transform.position = fx.BasePos + new Vector3(0f, fx.Rise * k, 0f);

            Color c = fx.Tint;
            c.a = fx.Tint.a * alpha;
            fx.Renderer.color = c;
        }
    }
}
