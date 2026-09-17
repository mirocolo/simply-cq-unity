using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 网格 A*（8 向；直线代价 10、斜线 14；禁止贴角穿过）。
    /// 内部缓冲复用，单线程使用。
    /// </summary>
    public sealed class PathFinder
    {
        private const int Straight = 10;
        private const int Diagonal = 14;

        private readonly GameMap _map;
        private readonly int[] _g;
        private readonly int[] _f;
        private readonly int[] _from;
        private readonly byte[] _state;   // 0=未访问 1=开放列表 2=已关闭
        private readonly List<int> _open;
        private readonly List<TilePos> _reversed = new List<TilePos>();

        public PathFinder(GameMap map)
        {
            if (map == null) throw new ArgumentNullException("map");
            _map = map;
            int n = map.Width * map.Height;
            _g = new int[n];
            _f = new int[n];
            _from = new int[n];
            _state = new byte[n];
            _open = new List<int>(256);
        }

        private int Idx(TilePos p) { return p.Y * _map.Width + p.X; }
        private TilePos Pos(int i) { return new TilePos(i % _map.Width, i / _map.Width); }

        /// <param name="blocked">额外的阻挡判断（一般是实体占位）。
        /// 地图本身的阻挡格永远不可通行，由 PathFinder 自己保证，调用方不需要重复判断。</param>
        /// <param name="outPath">输出路径：不含起点、含终点。</param>
        public bool Find(TilePos start, TilePos goal, Func<TilePos, bool> blocked, List<TilePos> outPath)
        {
            if (blocked == null) throw new ArgumentNullException("blocked");
            if (outPath == null) throw new ArgumentNullException("outPath");

            outPath.Clear();
            if (!_map.InBounds(start) || !_map.InBounds(goal)) return false;
            if (start == goal) return true;

            Array.Clear(_g, 0, _g.Length);
            Array.Clear(_f, 0, _f.Length);
            Array.Clear(_from, 0, _from.Length);
            Array.Clear(_state, 0, _state.Length);
            _open.Clear();

            int s = Idx(start);
            int t = Idx(goal);
            _from[s] = -1;
            _f[s] = Heuristic(start, goal);
            _state[s] = 1;
            _open.Add(s);

            int visited = 0;
            int visitedLimit = _map.Width * _map.Height;

            while (_open.Count > 0)
            {
                if (++visited > visitedLimit) return false;

                int bestSlot = 0;
                for (int i = 1; i < _open.Count; i++)
                {
                    if (_f[_open[i]] < _f[_open[bestSlot]]) bestSlot = i;
                }

                int cur = _open[bestSlot];
                _open.RemoveAt(bestSlot);

                if (cur == t)
                {
                    Reconstruct(s, t, outPath);
                    return true;
                }

                _state[cur] = 2;
                TilePos cp = Pos(cur);

                for (int d = 0; d < DirHelper.Count; d++)
                {
                    int nx = cp.X + DirHelper.Dx((Dir)d);
                    int ny = cp.Y + DirHelper.Dy((Dir)d);
                    TilePos np = new TilePos(nx, ny);
                    if (!_map.InBounds(np)) continue;

                    int ni = Idx(np);
                    if (_state[ni] == 2) continue;
                    if (IsBlocked(np, blocked)) continue;

                    bool diagonal = nx != cp.X && ny != cp.Y;
                    if (diagonal)
                    {
                        // 不许贴着墙角斜穿过去
                        if (IsBlocked(new TilePos(nx, cp.Y), blocked)) continue;
                        if (IsBlocked(new TilePos(cp.X, ny), blocked)) continue;
                    }

                    int tentative = _g[cur] + (diagonal ? Diagonal : Straight);
                    if (_state[ni] == 1 && tentative >= _g[ni]) continue;

                    _g[ni] = tentative;
                    _from[ni] = cur;
                    _f[ni] = tentative + Heuristic(np, goal);
                    if (_state[ni] != 1)
                    {
                        _state[ni] = 1;
                        _open.Add(ni);
                    }
                }
            }

            return false;
        }

        /// <summary>地图墙 + 调用方补充的阻挡（实体占位）。</summary>
        private bool IsBlocked(TilePos p, Func<TilePos, bool> blocked)
        {
            return !_map.IsWalkable(p) || blocked(p);
        }

        private void Reconstruct(int s, int t, List<TilePos> outPath)
        {
            _reversed.Clear();
            int cur = t;
            while (cur != s && cur >= 0)
            {
                _reversed.Add(Pos(cur));
                cur = _from[cur];
            }
            for (int i = _reversed.Count - 1; i >= 0; i--) outPath.Add(_reversed[i]);
        }

        private static int Heuristic(TilePos a, TilePos b)
        {
            int dx = Math.Abs(a.X - b.X);
            int dy = Math.Abs(a.Y - b.Y);
            return Straight * (dx + dy) + (Diagonal - 2 * Straight) * Math.Min(dx, dy);
        }
    }
}
