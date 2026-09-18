using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>一张地图：纯数据 + 通行查询。渲染、碰撞体都不在这里。</summary>
    public sealed class GameMap
    {
        /// <summary>tile 字节的第 0 位 = 阻挡；高 7 位 = 地表贴图编号。</summary>
        public const byte BlockedBit = 1;

        // ---- 地表编号。MapLoader 按字符写进来的就是这几个值；表现层（表、音效）也读它 ----
        public const int GroundGrass = 0;
        public const int GroundGrassLight = 1;
        public const int GroundWater = 2;
        public const int GroundTree = 3;
        public const int GroundRoad = 4;
        public const int GroundHill = 5;
        public const int GroundStone = 6;

        public readonly string Id;
        public readonly string Name;
        public readonly int Width;
        public readonly int Height;

        private readonly byte[] _tiles;

        public readonly List<Portal> Portals = new List<Portal>();
        public readonly List<Spawner> Spawners = new List<Spawner>();
        public readonly List<NpcSpawn> Npcs = new List<NpcSpawn>();
        public TilePos Spawn = new TilePos(1, 1);

        public GameMap(string id, string name, int width, int height, byte[] tiles)
        {
            if (tiles == null || tiles.Length != width * height)
                throw new ArgumentException("tiles 长度必须等于 width*height", "tiles");
            Id = id;
            Name = name;
            Width = width;
            Height = height;
            _tiles = tiles;
        }

        public int Index(TilePos p) { return p.Y * Width + p.X; }
        public bool InBounds(TilePos p) { return p.X >= 0 && p.Y >= 0 && p.X < Width && p.Y < Height; }
        public bool IsWalkable(TilePos p) { return InBounds(p) && (_tiles[Index(p)] & BlockedBit) == 0; }
        public int GroundId(TilePos p) { return InBounds(p) ? (_tiles[Index(p)] >> 1) : 0; }

        /// <summary>
        /// 脚下是不是"硬地"（土路 / 石板）。现在只有脚步音效在用：
        /// 草原上踩草、镇子和洞窟里踩石头，听感不一样。
        /// </summary>
        public bool IsHardGround(TilePos p)
        {
            int g = GroundId(p);
            return g == GroundRoad || g == GroundStone;
        }

        public void SetTile(TilePos p, int groundId, bool blocked)
        {
            if (!InBounds(p)) return;
            _tiles[Index(p)] = Pack(groundId, blocked);
        }

        public static byte Pack(int groundId, bool blocked)
        {
            if (groundId < 0) groundId = 0;
            if (groundId > 127) groundId = 127;
            return (byte)((groundId << 1) | (blocked ? 1 : 0));
        }

        public TilePos FindNearestWalkable(TilePos from, int maxRadius)
        {
            if (IsWalkable(from)) return from;
            for (int r = 1; r <= maxRadius; r++)
            {
                for (int dy = -r; dy <= r; dy++)
                {
                    for (int dx = -r; dx <= r; dx++)
                    {
                        if (Math.Abs(dx) != r && Math.Abs(dy) != r) continue;
                        TilePos p = new TilePos(from.X + dx, from.Y + dy);
                        if (IsWalkable(p)) return p;
                    }
                }
            }
            return from;
        }

        /// <summary>把地图外圈一圈强制设为阻挡，防止走出地图。</summary>
        public void SealBorders()
        {
            for (int x = 0; x < Width; x++)
            {
                SetTile(new TilePos(x, 0), GroundId(new TilePos(x, 0)), true);
                SetTile(new TilePos(x, Height - 1), GroundId(new TilePos(x, Height - 1)), true);
            }
            for (int y = 0; y < Height; y++)
            {
                SetTile(new TilePos(0, y), GroundId(new TilePos(0, y)), true);
                SetTile(new TilePos(Width - 1, y), GroundId(new TilePos(Width - 1, y)), true);
            }
        }
    }

    /// <summary>地图上的 NPC 摆点。</summary>
    public sealed class NpcSpawn
    {
        public TilePos Pos;
        public string NpcId;
    }

    public sealed class Portal
    {
        public TilePos At;
        public string TargetMap;
        public TilePos TargetPos;
    }

    /// <summary>刷怪区。M1 只做「区域内维持 N 只怪」。持久化/刷新规则以后再细化。</summary>
    public sealed class Spawner
    {
        public int X;
        public int Y;
        public int W;
        public int H;
        public string MonsterId;
        public int Max = 5;
        public int IntervalTicks = 50;
        public int Timer;
        public readonly List<ActorId> Alive = new List<ActorId>();

        public bool Contains(TilePos p)
        {
            return p.X >= X && p.Y >= Y && p.X < X + W && p.Y < Y + H;
        }

        public TilePos RandomTile(Rng rng)
        {
            return new TilePos(X + rng.Range(0, W - 1), Y + rng.Range(0, H - 1));
        }
    }
}
