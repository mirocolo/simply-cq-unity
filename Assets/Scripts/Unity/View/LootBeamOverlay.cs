using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 地面掉落物的品质光柱：**蓝装以上**在掉落点上立一道品质色的光柱，一直到被捡走。
    ///
    /// 传奇里"看光柱就知道爆了什么"，这一版把那个记号补上 —— 名字颜色只有凑近了才看得到，
    /// 光柱是隔着半个屏幕就能看见的。
    ///
    /// 为什么不做成特效池里的一次性特效：光柱的生命周期**跟着掉落物**（掉在地上多久就立多久），
    /// 不是 0.3 秒就散的一次性效果。所以和 <see cref="LootLabelOverlay"/> 一样每帧扫一遍地面物，
    /// 不用自己管生命周期，掉落物没了光柱自然就没了。
    /// </summary>
    public sealed class LootBeamOverlay
    {
        /// <summary>只有蓝装以上才立光柱。白装绿装满地都是，全立就变成光污染了。</summary>
        private const int MinQualityForBeam = (int)ItemQuality.Blue;

        private const float PulseSpeed = 2.4f;

        private readonly Transform _root;
        private readonly World _world;
        private readonly EntityViewRegistry _views;
        private readonly IItemCatalog _catalog;
        private readonly Projection _projection;

        private Sprite _beam;
        private readonly System.Collections.Generic.List<SpriteRenderer> _pool =
            new System.Collections.Generic.List<SpriteRenderer>();
        private int _used;

        public LootBeamOverlay(Transform root, World world, EntityViewRegistry views,
                               IItemCatalog catalog, Projection projection)
        {
            _root = root;
            _world = world;
            _views = views;
            _catalog = catalog;
            _projection = projection;
        }

        /// <summary>换图时把上一张图残留的光柱还回池里（它们绑在旧图的世界坐标上）。</summary>
        public void Clear()
        {
            for (int i = 0; i < _used; i++) _pool[i].enabled = false;
            _used = 0;
        }

        /// <summary>
        /// 每帧重摆一遍：地面掉落物在变（掉了新的、被捡走了、到时间消失了），
        /// 与其增量维护"谁还有光柱"，不如整帧重算 —— 光柱数量很少，重算最不容易出幽灵光柱。
        /// </summary>
        public void Tick(float dt)
        {
            if (_world == null) return;

            int used = 0;
            foreach (Entity e in _world.Entities)
            {
                if (e.Kind != EntityKind.GroundItem) continue;
                if ((int)e.Quality < MinQualityForBeam) continue;     // 白绿装不配立光柱

                ItemDef def = _catalog != null ? _catalog.Get(e.DefId) : null;
                if (def == null || !def.IsEquip) continue;            // 药水材料也不立

                Transform t = _views.GetTransform(e.Id);
                if (t == null) continue;

                SpriteRenderer r = RentAt(used);
                if (r == null) continue;
                used++;

                // 从掉落物底部往上长，带一点呼吸感的脉冲（相位按 id 错开，一排光柱不会同步闪）
                float pulse = 0.85f + Mathf.Sin(Time.timeSinceLevelLoad * PulseSpeed + e.Id.Value * 0.7f) * 0.15f;
                r.transform.position = t.position + new Vector3(0f, _projection.TileH * 0.30f, 0f);
                r.transform.localScale = new Vector3(0.75f * pulse, pulse, 1f);

                Color c = ItemQualityStyle.Srgb((ItemQuality)(int)e.Quality);
                c.a = 0.55f;
                r.color = c;
                r.enabled = true;
            }

            // 这一帧没用到的必须关掉，否则上一帧的光柱会留在原地变成幽灵
            for (int i = used; i < _pool.Count; i++) _pool[i].enabled = false;
            _used = used;
        }

        private SpriteRenderer RentAt(int index)
        {
            if (index < _pool.Count)
            {
                SpriteRenderer r = _pool[index];
                if (r.sprite == null) r.sprite = BeamSprite();
                return r;
            }

            GameObject go = new GameObject("loot_beam");
            go.transform.SetParent(_root, false);
            SpriteRenderer created = go.AddComponent<SpriteRenderer>();
            created.sortingOrder = 20;      // 地表之上、角色之下：它是"地上的东西"，不该盖住人
            created.sprite = BeamSprite();
            _pool.Add(created);
            return created;
        }

        private Sprite BeamSprite()
        {
            return _beam != null ? _beam : (_beam = PlaceholderArt.Beam(30, 110, 32f));
        }

        public int ActiveCount { get { return _used; } }
        public int PoolSize { get { return _pool.Count; } }
    }
}
