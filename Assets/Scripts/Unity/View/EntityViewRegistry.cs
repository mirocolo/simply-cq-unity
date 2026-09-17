using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// EntityId -> GameObject 的唯一映射。
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
            public Vector3 Target;
            public Dir RenderedDir;
        }

        private readonly Dictionary<int, View> _views = new Dictionary<int, View>();
        private readonly Transform _root;
        private readonly Projection _projection;
        private readonly World _world;
        private readonly int _charWidthPx;
        private readonly int _charHeightPx;
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
            _ppu = ppu;
            _tickRate = Mathf.Max(1f, tickRate);

            world.Events.Subscribe<EntitySpawned>(OnSpawned);
            world.Events.Subscribe<EntityRemoved>(OnRemoved);
            world.Events.Subscribe<EntityMoved>(OnMoved);
            world.Events.Subscribe<EntityTeleported>(OnTeleported);

            // 视图层很可能晚于实体出生（启动顺序、存档读取、换地图），
            // 所以不能只依赖 EntitySpawned —— 构造完先跟 World 对齐一次。
            SyncExistingEntities();
        }

        /// <summary>给 World 里已经存在、但还没有视图的实体补上视图。</summary>
        public void SyncExistingEntities()
        {
            foreach (Entity e in _world.Entities)
            {
                if (!_views.ContainsKey(e.Id.Value)) CreateView(e);
            }
        }

        public int ViewCount { get { return _views.Count; } }

        public Transform GetTransform(EntityId id)
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
                v.Transform.position = Vector3.MoveTowards(v.Transform.position, v.Target, unitsPerSecond * dt);

                v.Renderer.sortingOrder = _projection.SortOrderFor(v.Transform.position.y);

                if (v.RenderedDir != e.Facing)
                {
                    v.RenderedDir = e.Facing;
                    v.Renderer.sprite = PlaceholderArt.Character(KeyOf(e), ColorOf(e), e.Facing, _charWidthPx, _charHeightPx, _ppu);
                }
            }
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
            v.Renderer.sprite = PlaceholderArt.Character(KeyOf(e), ColorOf(e), e.Facing, _charWidthPx, _charHeightPx, _ppu);
            v.RenderedDir = e.Facing;
            v.Target = _projection.FootPoint(e.Pos);
            v.Transform.position = v.Target;
            v.Renderer.sortingOrder = _projection.SortOrderFor(v.Target.y);
            _views[e.Id.Value] = v;
        }

        private void OnRemoved(EntityRemoved evt)
        {
            View v;
            if (!_views.TryGetValue(evt.Id.Value, out v)) return;
            if (v.Transform != null) UnityEngine.Object.Destroy(v.Transform.gameObject);
            _views.Remove(evt.Id.Value);
        }

        private void OnMoved(EntityMoved evt)
        {
            View v;
            if (_views.TryGetValue(evt.Id.Value, out v)) v.Target = _projection.FootPoint(evt.To);
        }

        private void OnTeleported(EntityTeleported evt)
        {
            View v;
            if (!_views.TryGetValue(evt.Id.Value, out v)) return;
            v.Target = _projection.FootPoint(evt.To);
            if (v.Transform != null) v.Transform.position = v.Target;
        }
    }
}
