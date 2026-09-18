using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// ActorId -> GameObject 的唯一映射。
    /// 表现层只做两件事：订阅 World 的事件、每帧读实体状态做插值。
    /// 永远不反向写 World —— 这是整套架构能存档、能单测、以后能上服务端的前提。
    /// </summary>
    public sealed class EntityViewRegistry
    {
        private sealed class View
        {
            public Entity Entity;
            public Transform Transform;
            public SpriteRenderer Renderer;
            public Vector3 Base;      // 插值出来的位置
            public Vector3 Target;
            public Dir RenderedDir;
            public bool SpriteDirty = true;
            public float Lunge;       // 攻击前冲剩余时间
            public float LungeTotal;  // 本次前冲总时长（随攻速缩放）
            public Vector3 LungeDir;
        }

        private readonly Dictionary<int, View> _views = new Dictionary<int, View>();
        private readonly Dictionary<int, float> _hitFlash = new Dictionary<int, float>();
        private readonly Transform _root;
        private readonly Projection _projection;
        private readonly World _world;
        private readonly int _charWidthPx;
        private readonly int _charHeightPx;
        private readonly int _itemSizePx;
        private readonly float _ppu;
        private readonly float _tickRate;

        public EntityViewRegistry(Transform root, Projection projection, World world,
                                  int charWidthPx, int charHeightPx, float ppu, float tickRate)
        {
            _root = root;
            _projection = projection;
            _world = world;
            _charWidthPx = charWidthPx;
            _charHeightPx = charHeightPx;
            _itemSizePx = Mathf.Max(8, charWidthPx / 2);
            _ppu = ppu;
            _tickRate = Mathf.Max(1f, tickRate);

            world.Events.Subscribe<EntitySpawned>(OnSpawned);
            world.Events.Subscribe<EntityRemoved>(OnRemoved);
            world.Events.Subscribe<EntityMoved>(OnMoved);
            world.Events.Subscribe<EntityTeleported>(OnTeleported);
            world.Events.Subscribe<DamageDealt>(OnDamaged);
            world.Events.Subscribe<AttackSwing>(OnSwing);

            // 视图层很可能晚于实体出生（启动顺序、存档读取、换地图），
            // 所以不能只依赖 EntitySpawned —— 构造完先跟 World 对齐一次。
            SyncExistingEntities();
        }

        public int ViewCount { get { return _views.Count; } }

        /// <summary>给 World 里已经存在、但还没有视图的实体补上视图。</summary>
        public void SyncExistingEntities()
        {
            foreach (Entity e in _world.Entities)
            {
                if (!_views.ContainsKey(e.Id.Value)) CreateView(e);
            }
        }

        public Transform GetTransform(ActorId id)
        {
            View v;
            return _views.TryGetValue(id.Value, out v) ? v.Transform : null;
        }

        /// <summary>每帧把视觉位置往逻辑目标点插值 —— 逻辑是 10Hz 一格一格跳，画面必须补成连续的。</summary>
        public void Tick(float dt)
        {
            foreach (KeyValuePair<int, View> pair in _views)
            {
                View v = pair.Value;
                if (v.Transform == null || v.Entity == null) continue;

                Entity e = v.Entity;
                float tilesPerSecond = _tickRate / Mathf.Max(1, e.MoveSpeed);
                float unitsPerSecond = tilesPerSecond * _projection.TileW;
                v.Base = Vector3.MoveTowards(v.Base, v.Target, unitsPerSecond * dt);

                // 攻击时朝面向方向冲一下再弹回来 —— 普攻的"动作"就靠这个
                Vector3 lunge = Vector3.zero;
                if (v.Lunge > 0f)
                {
                    v.Lunge -= dt;
                    float k = Mathf.Clamp01(v.Lunge / Mathf.Max(0.01f, v.LungeTotal));
                    lunge = v.LungeDir * (Mathf.Sin(k * Mathf.PI) * 0.30f);
                }
                v.Transform.position = v.Base + lunge;

                v.Renderer.sortingOrder = _projection.SortOrderFor(v.Transform.position.y) + SortBias(e);

                if (v.RenderedDir != e.Facing)
                {
                    v.RenderedDir = e.Facing;
                    v.SpriteDirty = true;
                }
                if (v.SpriteDirty)
                {
                    v.Renderer.sprite = SpriteFor(e);
                    v.SpriteDirty = false;
                }

                // 受击闪红 + 轻微弹一下
                float flash;
                if (_hitFlash.TryGetValue(e.Id.Value, out flash))
                {
                    flash -= dt;
                    if (flash <= 0f)
                    {
                        _hitFlash.Remove(e.Id.Value);
                        v.Renderer.color = Color.white;
                        v.Transform.localScale = Vector3.one;
                    }
                    else
                    {
                        _hitFlash[e.Id.Value] = flash;
                        float k = flash / HitFlashSeconds;
                        v.Renderer.color = Color.Lerp(Color.white, new Color(1f, 0.25f, 0.25f), k);
                        float s = 1f + 0.18f * k;
                        v.Transform.localScale = new Vector3(s, s, 1f);
                    }
                }
                else if (!e.IsAlive)
                {
                    v.Renderer.color = new Color(1f, 1f, 1f, 0.4f);   // 死了变半透明
                }
            }
        }

        private const float HitFlashSeconds = 0.18f;
        private const float LungeSeconds = 0.16f;

        private Sprite SpriteFor(Entity e)
        {
            if (e.Kind == EntityKind.GroundItem) return PlaceholderArt.Coin(KeyOf(e), _itemSizePx, _itemSizePx, _ppu);
            return PlaceholderArt.Character(KeyOf(e), ColorOf(e), e.Facing, _charWidthPx, _charHeightPx, _ppu);
        }

        private Vector3 AnchorFor(Entity e)
        {
            return e.Kind == EntityKind.GroundItem ? _projection.TileCenter(e.Pos) : _projection.FootPoint(e.Pos);
        }

        /// <summary>掉落物压在所有角色下面（同一格时不会盖住人）。</summary>
        private static int SortBias(Entity e)
        {
            return e.Kind == EntityKind.GroundItem ? -50 : 0;
        }

        private static string KeyOf(Entity e)
        {
            if (!string.IsNullOrEmpty(e.SpriteId)) return e.SpriteId;
            return string.IsNullOrEmpty(e.DefId) ? e.Kind.ToString() : e.DefId;
        }

        private static Color ColorOf(Entity e)
        {
            // 玩家固定红色，怪按 id 上色：屏幕上一眼分得清
            if (e.Kind == EntityKind.Player) return new Color(0.86f, 0.28f, 0.24f);
            if (e.Kind == EntityKind.Npc) return new Color(0.30f, 0.62f, 0.90f);
            if (e.Kind == EntityKind.GroundItem) return new Color(0.96f, 0.79f, 0.22f);
            return PlaceholderArt.BodyColorFor(e.DefId);
        }

        private void OnSpawned(EntitySpawned evt)
        {
            Entity e = _world.Get(evt.Id);
            if (e == null) return;
            if (_views.ContainsKey(evt.Id.Value)) return;
            CreateView(e);
        }

        private void CreateView(Entity e)
        {
            View v = new View();
            v.Entity = e;
            GameObject go = new GameObject(KeyOf(e) + "#" + e.Id.Value);
            go.transform.SetParent(_root, false);
            v.Transform = go.transform;
            v.Renderer = go.AddComponent<SpriteRenderer>();
            v.Renderer.sprite = SpriteFor(e);
            v.RenderedDir = e.Facing;
            v.Target = AnchorFor(e);
            v.Base = v.Target;
            v.Transform.position = v.Target;
            v.Renderer.sortingOrder = _projection.SortOrderFor(v.Target.y) + SortBias(e);
            _views[e.Id.Value] = v;
        }

        private void OnRemoved(EntityRemoved evt)
        {
            View v;
            if (!_views.TryGetValue(evt.Id.Value, out v)) return;
            _hitFlash.Remove(evt.Id.Value);
            if (v.Transform != null) UnityEngine.Object.Destroy(v.Transform.gameObject);
            _views.Remove(evt.Id.Value);
        }

        private void OnMoved(EntityMoved evt)
        {
            View v;
            if (_views.TryGetValue(evt.Id.Value, out v)) v.Target = AnchorFor(v.Entity);
        }

        private void OnTeleported(EntityTeleported evt)
        {
            View v;
            if (!_views.TryGetValue(evt.Id.Value, out v)) return;
            v.Target = AnchorFor(v.Entity);
            v.Base = v.Target;
            if (v.Transform != null) v.Transform.position = v.Target;
        }

        private void OnSwing(AttackSwing evt)
        {
            View v;
            if (!_views.TryGetValue(evt.Actor.Value, out v)) return;
            // 前冲时长跟着出手间隔走：攻速越快，冲得越快 —— 手感才对得上数值
            Entity attacker = _world != null ? _world.Get(evt.Actor) : null;
            float lunge = LungeSeconds * (attacker != null && attacker.AttackInterval > 7
                ? attacker.AttackInterval / 7f : 1f);
            v.Lunge = lunge;
            v.LungeTotal = lunge;
            v.LungeDir = new Vector3(DirHelper.Dx(evt.Dir), -DirHelper.Dy(evt.Dir), 0f);
        }

        private void OnDamaged(DamageDealt evt)
        {
            if (_views.ContainsKey(evt.Target.Value)) _hitFlash[evt.Target.Value] = HitFlashSeconds;
        }
    }
}
