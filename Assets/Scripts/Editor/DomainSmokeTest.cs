using System.Collections.Generic;
using SimplyCQ.Data;
using SimplyCQ.Domain;
using UnityEditor;
using UnityEngine;

namespace SimplyCQ.EditorTools
{
    /// <summary>
    /// 在 Unity 里直接跑的逻辑 + 数据自检。它会真的读 StreamingAssets 里那几张表，
    /// 所以能同时抓出「逻辑 bug」和「数据填错」。
    /// 更彻底的无头版本在 Tools/DomainCheck（跑 bash Tools/run-domain-check.sh）。
    /// </summary>
    public static class DomainSmokeTest
    {
        private static int _pass;
        private static int _fail;
        private static readonly List<string> _failures = new List<string>();

        [MenuItem("SimplyCQ/④ 运行 Domain 冒烟自检（含数据文件校验）", false, 40)]
        public static void Run()
        {
            _pass = 0;
            _fail = 0;
            _failures.Clear();

            GameDatabase db = GameDatabase.LoadFromStreamingAssets(
                "Data/maps/map_grassland.json", "Data/monsters.json", "Data/balance.json");

            Check(db != null, "能从 StreamingAssets 读到数据表");
            if (db == null)
            {
                Report();
                return;
            }

            GameMap map = db.Map;
            Check(map != null && map.Width > 4 && map.Height > 4, "地图尺寸合理（" + (map != null ? map.Width + "x" + map.Height : "-") + "）");
            Check(map.IsWalkable(map.Spawn), "出生点可站人（" + map.Spawn + "）");
            Check(map.Spawners.Count > 0, "地图配了刷怪区");

            for (int i = 0; i < map.Spawners.Count; i++)
            {
                Spawner s = map.Spawners[i];
                int walkable = 0;
                for (int y = s.Y; y < s.Y + s.H; y++)
                    for (int x = s.X; x < s.X + s.W; x++)
                        if (map.IsWalkable(new TilePos(x, y))) walkable++;
                Check(walkable > 0, "刷怪区 " + i + "（" + s.MonsterId + "）里有可站格：" + walkable + " 格");
                Check(db.CreateMonster(s.MonsterId) != null, "monsters.json 里有 " + s.MonsterId);
            }

            for (int i = 0; i < map.Portals.Count; i++)
            {
                Check(map.InBounds(map.Portals[i].At), "传送点 " + i + " 在地图内");
            }

            // 从出生点随便找一块可走地，必须能寻路过去
            TilePos far = FindFarWalkable(map, map.Spawn);
            List<TilePos> path = new List<TilePos>();
            bool found = new PathFinder(map).Find(map.Spawn, far, AlwaysFalse, path);
            Check(found && path.Count > 0, "从出生点能寻路到 " + far + "（" + path.Count + " 步）");

            // 跑 600 个 tick，每一步都检查不变量
            Simulation sim = new Simulation(map, (uint)db.Balance.worldSeed, db.CreateMonster);
            Entity player = db.CreatePlayer();
            player.Pos = map.Spawn;
            player.HomePos = player.Pos;
            sim.World.Spawn(player);
            sim.World.Player = player;

            List<Intent> intents = new List<Intent>();
            int maxMonsters = 0;
            int maxSpawnerTotal = 0;
            bool moved = false;
            string broken = null;

            for (int tick = 0; tick < 600 && broken == null; tick++)
            {
                intents.Clear();
                if (tick % 6 == 0)
                {
                    // 让玩家绕着走，制造碰撞与追击
                    Dir d = (Dir)((tick / 6) % DirHelper.Count);
                    intents.Add(Intent.Move(player.Id, d));
                }
                TilePos before = player.Pos;
                sim.Step(intents);
                if (player.Pos != before) moved = true;

                broken = CheckInvariants(sim.World);
                int monsters = 0;
                for (int i = 0; i < map.Spawners.Count; i++) monsters += map.Spawners[i].Alive.Count;
                if (monsters > maxMonsters) maxMonsters = monsters;
                if (monsters > maxSpawnerTotal) maxSpawnerTotal = monsters;
            }

            Check(broken == null, "600 tick 内不变量始终成立" + (broken == null ? "" : "： " + broken));
            Check(moved, "玩家确实动起来了");
            Check(sim.World.Tick >= 600, "逻辑 tick 推进到 " + sim.World.Tick);
            Check(maxMonsters > 0, "刷出了怪（峰值 " + maxMonsters + " 只）");

            int cap = 0;
            for (int i = 0; i < map.Spawners.Count; i++) cap += map.Spawners[i].Max;
            Check(maxMonsters <= cap, "怪物总数没超过配置上限 " + cap);

            Report();
        }

        private static bool AlwaysFalse(TilePos p) { return false; }

        private static TilePos FindFarWalkable(GameMap map, TilePos from)
        {
            TilePos best = from;
            int bestDist = 0;
            for (int y = 0; y < map.Height; y++)
            {
                for (int x = 0; x < map.Width; x++)
                {
                    TilePos p = new TilePos(x, y);
                    if (!map.IsWalkable(p)) continue;
                    int d = p.ChebyshevTo(from);
                    if (d > bestDist) { bestDist = d; best = p; }
                }
            }
            return best;
        }

        private static string CheckInvariants(World world)
        {
            HashSet<int> seen = new HashSet<int>();
            foreach (Entity e in world.Entities)
            {
                if (!world.Map.InBounds(e.Pos)) return "实体越界 " + e.Pos;
                if (!world.Map.IsWalkable(e.Pos)) return "实体站在阻挡格 " + e.Pos;
                int key = e.Pos.Y * world.Map.Width + e.Pos.X;
                if (!seen.Add(key)) return "两个实体占同一格 " + e.Pos;
            }
            return null;
        }

        private static void Check(bool ok, string name)
        {
            if (ok) { _pass++; return; }
            _fail++;
            _failures.Add(name);
            Debug.LogError("[SimplyCQ 自检] FAIL: " + name);
        }

        private static void Report()
        {
            if (_fail == 0)
            {
                Debug.Log("[SimplyCQ 自检] 全部通过 ✓（" + _pass + " 项）");
                return;
            }
            Debug.LogError("[SimplyCQ 自检] " + _fail + " 项失败：\n- " + string.Join("\n- ", _failures.ToArray()));
        }
    }
}
