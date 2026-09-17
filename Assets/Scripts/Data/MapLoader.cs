using System;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Data
{
    /// <summary>
    /// JSON -> Domain 的 GameMap。JSON 里用字符画地图，方便手改也方便 diff：
    ///   .  草地      ,  草地(亮)    =  土路
    ///   #  树林(阻挡) ~  水(阻挡)    ^  山(阻挡)   +  石板
    /// </summary>
    public static class MapLoader
    {
        public static GameMap FromDto(MapDto dto)
        {
            if (dto == null) throw new ArgumentNullException("dto");

            int w = Mathf.Max(1, dto.width);
            int h = Mathf.Max(1, dto.height);
            byte[] tiles = new byte[w * h];
            string[] rows = dto.rows;

            for (int y = 0; y < h; y++)
            {
                string row = (rows != null && y < rows.Length) ? rows[y] : null;
                for (int x = 0; x < w; x++)
                {
                    char c = (row != null && x < row.Length) ? row[x] : '#';
                    int groundId;
                    bool blocked;
                    Parse(c, out groundId, out blocked);
                    tiles[y * w + x] = GameMap.Pack(groundId, blocked);
                }
            }

            GameMap map = new GameMap(
                string.IsNullOrEmpty(dto.id) ? "map_unknown" : dto.id,
                string.IsNullOrEmpty(dto.name) ? dto.id : dto.name,
                w, h, tiles);

            map.Spawn = new TilePos(dto.spawnX, dto.spawnY);

            if (dto.portals != null)
            {
                for (int i = 0; i < dto.portals.Length; i++)
                {
                    PortalDto p = dto.portals[i];
                    if (p == null) continue;
                    Portal portal = new Portal();
                    portal.At = new TilePos(p.x, p.y);
                    portal.TargetMap = p.targetMap;
                    portal.TargetPos = new TilePos(p.targetX, p.targetY);
                    map.Portals.Add(portal);
                }
            }

            if (dto.spawners != null)
            {
                for (int i = 0; i < dto.spawners.Length; i++)
                {
                    SpawnerDto s = dto.spawners[i];
                    if (s == null || string.IsNullOrEmpty(s.monsterId)) continue;
                    Spawner spawner = new Spawner();
                    spawner.X = s.x;
                    spawner.Y = s.y;
                    spawner.W = Mathf.Max(1, s.w);
                    spawner.H = Mathf.Max(1, s.h);
                    spawner.MonsterId = s.monsterId;
                    spawner.Max = s.max > 0 ? s.max : 5;
                    spawner.IntervalTicks = s.intervalTicks > 0 ? s.intervalTicks : 50;
                    map.Spawners.Add(spawner);
                }
            }

            if (dto.npcs != null)
            {
                for (int i = 0; i < dto.npcs.Length; i++)
                {
                    NpcSpawnDto n = dto.npcs[i];
                    if (n == null || string.IsNullOrEmpty(n.npcId)) continue;
                    NpcSpawn spawn = new NpcSpawn();
                    spawn.Pos = new TilePos(n.x, n.y);
                    spawn.NpcId = n.npcId;
                    map.Npcs.Add(spawn);
                }
            }

            map.SealBorders();
            if (!map.IsWalkable(map.Spawn)) map.Spawn = map.FindNearestWalkable(map.Spawn, 16);
            return map;
        }

        /// <summary>数据文件缺失时的兜底地图，保证「按下 Play 一定跑得起来」。</summary>
        public static GameMap CreateFallbackMap(int w, int h)
        {
            byte[] tiles = new byte[w * h];
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    bool blob = ((x * 7 + y * 13) % 29) == 0;
                    tiles[y * w + x] = GameMap.Pack(blob ? 3 : 0, blob);
                }
            }
            GameMap map = new GameMap("map_fallback", "兜底地图", w, h, tiles);
            map.Spawn = new TilePos(w / 2, h / 2);
            map.SealBorders();
            map.Spawn = map.FindNearestWalkable(map.Spawn, 16);

            Spawner spawner = new Spawner();
            spawner.X = 2; spawner.Y = 2; spawner.W = 6; spawner.H = 6;
            spawner.MonsterId = "mon_hen";
            spawner.Max = 4;
            spawner.IntervalTicks = 30;
            map.Spawners.Add(spawner);
            return map;
        }

        private static void Parse(char c, out int groundId, out bool blocked)
        {
            switch (c)
            {
                case ',': groundId = 1; blocked = false; return;
                case '~': groundId = 2; blocked = true; return;
                case '#': groundId = 3; blocked = true; return;
                case '=': groundId = 4; blocked = false; return;
                case '^': groundId = 5; blocked = true; return;
                case '+': groundId = 6; blocked = false; return;
                default: groundId = 0; blocked = false; return;
            }
        }
    }
}
