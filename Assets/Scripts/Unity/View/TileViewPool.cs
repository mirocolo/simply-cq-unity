using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 地表渲染：只实例化「相机视野内」的格子，SpriteRenderer 走对象池。
    /// 不依赖 Unity 的 Tilemap 包，也不依赖任何美术资源。
    /// 换真 tileset / 换 Tilemap 时，只替换这个类。
    /// </summary>
    public sealed class TileViewPool
    {
        public const int GroundSortOrder = -30000;

        private readonly Transform _root;
        private GameMap _map;
        private readonly Projection _projection;
        private readonly int _tileWidthPx;
        private readonly int _tileHeightPx;
        private readonly float _ppu;
        private readonly int _maxPool;
        private readonly List<SpriteRenderer> _pool = new List<SpriteRenderer>();

        public TileViewPool(Transform root, GameMap map, Projection projection,
                            int tileWidthPx, int tileHeightPx, float ppu, int maxPool = 4000)
        {
            _root = root;
            _map = map;
            _projection = projection;
            _tileWidthPx = tileWidthPx;
            _tileHeightPx = tileHeightPx;
            _ppu = ppu;
            _maxPool = maxPool;
        }

        public int VisibleCount { get; private set; }
        public int PooledCount { get { return _pool.Count; } }

        /// <summary>
        /// 换一张地表。对象池原样复用，下一次 Refresh 会把视野内的格子重画成新图的地表、
        /// 并把多出来的格子关掉 —— 所以这里只需要换引用 + 先把旧的清干净（避免换图当帧闪一眼旧图）。
        /// </summary>
        public void Rebind(GameMap map)
        {
            _map = map;
            Clear();
        }

        public void Clear()
        {
            for (int i = 0; i < _pool.Count; i++) _pool[i].enabled = false;
            VisibleCount = 0;
        }

        public void Refresh(Vector3 cameraCenter, float halfWidth, float halfHeight)
        {
            int minX = Mathf.FloorToInt((cameraCenter.x - halfWidth) / _projection.TileW) - 1;
            int maxX = Mathf.CeilToInt((cameraCenter.x + halfWidth) / _projection.TileW) + 1;
            int minY = Mathf.FloorToInt(-(cameraCenter.y + halfHeight) / _projection.TileH) - 1;
            int maxY = Mathf.CeilToInt(-(cameraCenter.y - halfHeight) / _projection.TileH) + 1;

            minX = Mathf.Max(minX, 0);
            minY = Mathf.Max(minY, 0);
            maxX = Mathf.Min(maxX, _map.Width - 1);
            maxY = Mathf.Min(maxY, _map.Height - 1);

            int used = 0;
            for (int y = minY; y <= maxY; y++)
            {
                for (int x = minX; x <= maxX; x++)
                {
                    if (used >= _maxPool) break;
                    TilePos p = new TilePos(x, y);
                    SpriteRenderer sr = Get(used);
                    sr.sprite = PlaceholderArt.Tile(_map.GroundId(p), Variant(x, y), _tileWidthPx, _tileHeightPx, _ppu);
                    sr.transform.position = _projection.TileCenter(p);
                    sr.sortingOrder = GroundSortOrder;
                    sr.enabled = true;
                    used++;
                }
            }

            for (int i = used; i < _pool.Count; i++) _pool[i].enabled = false;
            VisibleCount = used;
        }

        private SpriteRenderer Get(int index)
        {
            while (_pool.Count <= index)
            {
                GameObject go = new GameObject("tile");
                go.transform.SetParent(_root, false);
                SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
                sr.sortingOrder = GroundSortOrder;
                _pool.Add(sr);
            }
            return _pool[index];
        }

        private static int Variant(int x, int y)
        {
            return (x * 7 + y * 13) & 3;
        }
    }
}
