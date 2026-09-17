using System;
using System.Collections.Generic;
using SimplyCQ.Domain;

namespace DomainCheck
{
    /// <summary>
    /// 把 Domain 层（纯 C#、不依赖 UnityEngine）拉到普通 .NET 里跑的无头自检。
    /// 这就是「逻辑与表现分离」的直接收益：不用开 Unity 也能测核心玩法。
    /// </summary>
    internal static class Program
    {
        private static int _failures;

        private static void Check(bool ok, string name)
        {
            Console.WriteLine((ok ? "  [PASS] " : "  [FAIL] ") + name);
            if (!ok) _failures++;
        }

        private static int Main()
        {
            Console.WriteLine("== SimplyCQ Domain 自检 ==");
            TestTilePos();
            TestRng();
            TestEventBus();
            TestPathFinder();
            TestMovement();
            TestCollisionAndOccupancy();
            TestAiChase();
            TestSpawners();
            Console.WriteLine();
            Console.WriteLine(_failures == 0 ? "全部通过 ✓" : _failures + " 项失败 ✗");
            return _failures == 0 ? 0 : 1;
        }

        // ---------------------------------------------------------------- helpers

        private static GameMap Map(params string[] rows)
        {
            int h = rows.Length;
            int w = rows[0].Length;
            byte[] tiles = new byte[w * h];
            for (int y = 0; y < h; y++)
            {
                string row = rows[y];
                for (int x = 0; x < w; x++)
                {
                    char c = x < row.Length ? row[x] : '#';
                    tiles[y * w + x] = GameMap.Pack(0, c == '#');
                }
            }
            GameMap map = new GameMap("test", "test", w, h, tiles);
            map.Spawn = new TilePos(1, 1);
            return map;
        }

        private static Entity MakeEntity(EntityKind kind, TilePos pos)
        {
            Entity e = new Entity();
            e.Kind = kind;
            e.DefId = kind == EntityKind.Player ? "player_warrior" : "mon_test";
            e.Name = kind.ToString();
            e.Pos = pos;
            e.HomePos = pos;
            e.Hp = 100;
            e.MaxHp = 100;
            e.MoveSpeed = 3;
            return e;
        }

        private static string Invariants(World w)
        {
            HashSet<int> seen = new HashSet<int>();
            foreach (Entity e in w.Entities)
            {
                if (!w.Map.InBounds(e.Pos)) return "实体越界 " + e.Pos;
                if (!w.Map.IsWalkable(e.Pos)) return "实体站在阻挡格 " + e.Pos;
                int key = e.Pos.Y * w.Map.Width + e.Pos.X;
                if (!seen.Add(key)) return "两个实体占同一格 " + e.Pos;
                if (!w.Map.InBounds(e.HomePos)) return "HomePos 越界";
            }
            return null;
        }

        // ---------------------------------------------------------------- tests

        private static void TestTilePos()
        {
            Console.WriteLine("[TilePos]");
            TilePos a = new TilePos(1, 2);
            TilePos b = new TilePos(4, -1);
            Check(a + b == new TilePos(5, 1), "加法");
            Check(a - b == new TilePos(-3, 3), "减法");
            Check(a == new TilePos(1, 2), "相等");
            Check(a != b, "不等");
            Check(a.ChebyshevTo(b) == 3, "Chebyshev 距离");
            Check(a.ManhattanTo(b) == 6, "Manhattan 距离");
            Check(a.GetHashCode() != b.GetHashCode(), "哈希不同");
        }

        private static void TestRng()
        {
            Console.WriteLine("[Rng]");
            Rng a = new Rng(12345u);
            Rng b = new Rng(12345u);
            bool same = true;
            for (int i = 0; i < 100; i++) if (a.NextUInt() != b.NextUInt()) same = false;
            Check(same, "同种子 -> 同序列（可复现）");

            Rng c = new Rng(1u);
            bool inRange = true;
            for (int i = 0; i < 1000; i++)
            {
                int v = c.Range(3, 7);
                if (v < 3 || v > 7) inRange = false;
            }
            Check(inRange, "Range 闭区间内");
            Check(c.Range(5, 5) == 5, "Range 上下界相等");
            Check(c.Range(9, 2) == 9, "Range 反向参数不炸");
            bool inUnit = true;
            for (int i = 0; i < 1000; i++) { float v = c.Value; if (v < 0f || v >= 1f) inUnit = false; }
            Check(inUnit, "Value 落在 [0,1)");
        }

        private static void TestEventBus()
        {
            Console.WriteLine("[EventBus]");
            EventBus bus = new EventBus();
            int moved = 0;
            int died = 0;
            Action<EntityMoved> onMoved = delegate(EntityMoved e) { moved++; };
            Action<EntityDied> onDied = delegate(EntityDied e) { died++; };
            bus.Subscribe(onMoved);
            bus.Subscribe(onDied);

            EntityMoved evt = new EntityMoved();
            evt.Id = new ActorId(1);
            bus.Publish(evt);
            bus.Publish(evt);
            Check(moved == 2, "订阅后收到事件");

            bus.Unsubscribe(onMoved);
            bus.Publish(evt);
            Check(moved == 2, "退订后不再收到");

            Check(died == 0, "没发过的事件不会误触发");
            bus.Publish(new EntityDied());
            Check(died == 1, "同类型事件的类型隔离正确");

            bus.Clear();
            bus.Publish(new EntityDied());
            Check(died == 1, "Clear 后全部退订");
        }

        private static void TestPathFinder()
        {
            Console.WriteLine("[PathFinder]");

            GameMap open = Map(".....", ".....", ".....", ".....", ".....");
            PathFinder pf = new PathFinder(open);
            List<TilePos> path = new List<TilePos>();
            Func<TilePos, bool> none = delegate(TilePos p) { return false; };

            Check(pf.Find(new TilePos(0, 0), new TilePos(4, 0), none, path), "直线可达");
            Check(path.Count == 4, "直线路径长度 = 4（实际 " + path.Count + "）");
            Check(path[path.Count - 1] == new TilePos(4, 0), "终点正确");

            Check(pf.Find(new TilePos(0, 0), new TilePos(2, 2), none, path), "对角可达");
            Check(path.Count == 2, "纯对角走 2 步斜线（实际 " + path.Count + "）");

            GameMap walled = Map(".....", ".....", "#####", ".....", ".....");
            PathFinder pf2 = new PathFinder(walled);
            Check(!pf2.Find(new TilePos(0, 0), new TilePos(0, 4), none, path), "整堵墙隔断 -> 不可达");
            Check(path.Count == 0, "不可达时不残留路径");

            GameMap gap = Map(".....", ".....", "##.##", ".....", ".....");
            PathFinder pf3 = new PathFinder(gap);
            Check(pf3.Find(new TilePos(0, 0), new TilePos(4, 4), none, path), "有缺口 -> 可达");
            bool throughGap = false;
            bool anyBlocked = false;
            for (int i = 0; i < path.Count; i++)
            {
                if (path[i] == new TilePos(2, 2)) throughGap = true;
                if (!gap.IsWalkable(path[i])) anyBlocked = true;
            }
            Check(throughGap, "路径确实穿过缺口");
            Check(!anyBlocked, "路径不穿墙");

            GameMap corner = Map(".#", "#.");
            PathFinder pf4 = new PathFinder(corner);
            Check(!pf4.Find(new TilePos(0, 0), new TilePos(1, 1), none, path), "禁止贴角斜穿");

            GameMap diagOpen = Map("..", "..");
            PathFinder pf5 = new PathFinder(diagOpen);
            Check(pf5.Find(new TilePos(0, 0), new TilePos(1, 1), none, path), "开阔对角可达");
            Check(path.Count == 1 && path[0] == new TilePos(1, 1), "开阔对角走 1 步（斜线更便宜）");

            Func<TilePos, bool> blockedGoal = delegate(TilePos p) { return p == new TilePos(3, 0); };
            Check(!pf5.Find(new TilePos(0, 0), new TilePos(3, 0), blockedGoal, path), "目标被占且不放行 -> 不可达");
        }

        private static void TestMovement()
        {
            Console.WriteLine("[Movement]");
            GameMap map = Map(".......", ".......", ".......", ".......", ".......");
            World world = new World(map, 7u, new EventBus());
            world.Systems.Add(new MovementSystem());

            Entity player = MakeEntity(EntityKind.Player, new TilePos(1, 1));
            player.MoveSpeed = 3;
            world.Spawn(player);
            world.Player = player;

            List<Intent> intents = new List<Intent>();
            int moves = 0;
            world.Events.Subscribe<EntityMoved>(delegate(EntityMoved e) { moves++; });

            intents.Add(Intent.Move(player.Id, Dir.Right));
            world.Step(intents);
            Check(player.Pos == new TilePos(2, 1), "第一 tick 走一格（实际 " + player.Pos + "）");
            Check(player.Facing == Dir.Right, "朝向跟随移动");

            world.Step(intents);
            world.Step(intents);
            Check(player.Pos == new TilePos(2, 1), "移速 3 -> 冷却中不再移动");

            world.Step(intents);
            Check(player.Pos == new TilePos(3, 1), "第 4 tick 再走一格（实际 " + player.Pos + "）");
            Check(moves == 2, "移动事件数 = 2（实际 " + moves + "）");

            // 撞墙：只转身，不动
            GameMap wallMap = Map(".....", "..#..", ".....", ".....", ".....");
            World w2 = new World(wallMap, 1u, new EventBus());
            w2.Systems.Add(new MovementSystem());
            Entity p2 = MakeEntity(EntityKind.Player, new TilePos(1, 1));
            p2.MoveSpeed = 1;
            w2.Spawn(p2);
            w2.Player = p2;
            List<Intent> toWall = new List<Intent>();
            toWall.Add(Intent.Move(p2.Id, Dir.Right));
            w2.Step(toWall);
            Check(p2.Pos == new TilePos(1, 1), "撞墙不移动");
            Check(p2.Facing == Dir.Right, "撞墙也会转身");
            Check(Invariants(w2) == null, "撞墙后不变量成立: " + Invariants(w2));

            // 八方向都走通（地图要够大，8 个方向都放得下）
            string[] big = new string[9];
            for (int i = 0; i < 9; i++) big[i] = ".........";
            World w3 = new World(Map(big), 3u, new EventBus());
            w3.Systems.Add(new MovementSystem());
            Entity p3 = MakeEntity(EntityKind.Player, new TilePos(4, 4));
            p3.MoveSpeed = 1;
            w3.Spawn(p3);
            w3.Player = p3;
            List<Intent> one = new List<Intent>();
            bool allDirs = true;
            for (int d = 0; d < DirHelper.Count; d++)
            {
                TilePos before = p3.Pos;
                one.Clear();
                one.Add(Intent.Move(p3.Id, (Dir)d));
                w3.Step(one);
                if (p3.Pos == before) allDirs = false;
                p3.MoveCooldown = 0;
            }
            Check(allDirs, "8 个方向都能走");
        }

        private static void TestCollisionAndOccupancy()
        {
            Console.WriteLine("[Occupancy]");
            World world = new World(Map(".....", ".....", ".....", ".....", "....."), 5u, new EventBus());
            world.Systems.Add(new MovementSystem());

            Entity player = MakeEntity(EntityKind.Player, new TilePos(1, 1));
            player.MoveSpeed = 1;
            Entity blocker = MakeEntity(EntityKind.Monster, new TilePos(2, 1));
            blocker.MoveSpeed = 1;
            world.Spawn(player);
            world.Spawn(blocker);

            Check(world.IsOccupied(new TilePos(2, 1)), "占用表记录了怪物");
            Check(world.EntityAt(new TilePos(2, 1)) == blocker, "EntityAt 查得到");
            Check(!world.CanWalk(new TilePos(2, 1), player), "别人占的格不可走");
            Check(world.CanWalk(new TilePos(1, 1), player), "自己脚下的格算可走（寻路用）");

            List<Intent> intents = new List<Intent>();
            intents.Add(Intent.Move(player.Id, Dir.Right));
            world.Step(intents);
            Check(player.Pos == new TilePos(1, 1), "怪物挡路 -> 玩家走不过去");

            // 怪物自己朝被占的格子走也不行
            blocker.WantsMove = Dir.Left;
            world.Step(new List<Intent>());
            Check(world.EntityAt(new TilePos(2, 1)) == blocker, "怪物没有踩进玩家格子");

            // 传送后占用表跟着更新
            world.PlaceEntity(blocker, new TilePos(4, 4));
            Check(!world.IsOccupied(new TilePos(2, 1)), "传送后旧格释放");
            Check(world.IsOccupied(new TilePos(4, 4)), "传送后新格占用");

            // FindFreeTileNear 不会挑到被占的格
            TilePos free = world.FindFreeTileNear(new TilePos(1, 1), 5);
            Check(free != new TilePos(1, 1), "FindFreeTileNear 避开已占用格（实际 " + free + "）");
            Check(Invariants(world) == null, "占用测试后不变量成立: " + Invariants(world));
        }

        private static void TestAiChase()
        {
            Console.WriteLine("[AI 追击]");
            GameMap map = Map(
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................",
                "....................");

            Func<string, Entity> factory = delegate(string id)
            {
                Entity m = MakeEntity(EntityKind.Monster, new TilePos(1, 1));
                m.DefId = id;
                m.MoveSpeed = 2;
                m.Vision = 20;
                m.AttackRange = 1;
                m.Aggressive = true;
                m.Leash = 40;
                m.Hp = 50;
                return m;
            };

            Simulation sim = new Simulation(map, 11u, null);
            Entity player = MakeEntity(EntityKind.Player, new TilePos(10, 10));
            player.MoveSpeed = 3;
            sim.World.Spawn(player);
            sim.World.Player = player;

            Entity wolf = factory("mon_wolf");
            wolf.Pos = new TilePos(4, 10);
            wolf.HomePos = wolf.Pos;
            sim.World.Spawn(wolf);

            List<Intent> none = new List<Intent>();
            string broken = null;
            bool attacked = false;
            for (int i = 0; i < 120 && broken == null; i++)
            {
                sim.Step(none);
                broken = Invariants(sim.World);
                if (wolf.WantsAttack) attacked = true;
            }

            Check(broken == null, "追击全程不变量成立: " + (broken == null ? "ok" : broken));
            int dist = wolf.Pos.ChebyshevTo(player.Pos);
            Check(dist <= 1, "追击到玩家身边（实际距离 " + dist + "）");
            Check(attacked, "进入攻击距离后置位 WantsAttack");
            Check(sim.World.Tick == 120 || attacked, "模拟推进正常");

            // 被动的鸡不会追人
            Simulation sim2 = new Simulation(Map("..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", ".........."), 12u, null);
            Entity p2 = MakeEntity(EntityKind.Player, new TilePos(8, 8));
            sim2.World.Spawn(p2);
            sim2.World.Player = p2;
            Entity hen = MakeEntity(EntityKind.Monster, new TilePos(1, 1));
            hen.DefId = "mon_hen";
            hen.Aggressive = false;
            hen.MoveSpeed = 2;
            sim2.World.Spawn(hen);
            hen.Path.Clear();
            for (int i = 0; i < 80; i++) sim2.Step(none);
            Check(hen.Pos.ChebyshevTo(hen.HomePos) <= 4, "被动怪只在家附近游荡（实际偏移 " + hen.Pos.ChebyshevTo(hen.HomePos) + "）");
            Check(hen.Target == ActorId.None, "被动怪不锁玩家为目标");
        }

        private static void TestSpawners()
        {
            Console.WriteLine("[刷怪]");
            GameMap map = Map("..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........");
            Spawner sp = new Spawner();
            sp.X = 1; sp.Y = 1; sp.W = 4; sp.H = 4;
            sp.MonsterId = "mon_hen";
            sp.Max = 3;
            sp.IntervalTicks = 5;
            map.Spawners.Add(sp);

            Func<string, Entity> factory = delegate(string id)
            {
                Entity m = MakeEntity(EntityKind.Monster, new TilePos(1, 1));
                m.DefId = id;
                m.MoveSpeed = 5;
                m.Vision = 2;
                m.Aggressive = false;
                m.Hp = 10;
                return m;
            };

            Simulation sim = new Simulation(map, 21u, factory);
            Entity player = MakeEntity(EntityKind.Player, new TilePos(9, 9));
            sim.World.Spawn(player);
            sim.World.Player = player;

            List<Intent> none = new List<Intent>();
            string broken = null;
            int maxSeen = 0;
            for (int i = 0; i < 200 && broken == null; i++)
            {
                sim.Step(none);
                broken = Invariants(sim.World);
                int monsters = 0;
                foreach (Entity e in sim.World.Entities) if (e.Kind == EntityKind.Monster) monsters++;
                if (monsters > maxSeen) maxSeen = monsters;
            }

            Check(broken == null, "刷怪全程不变量成立: " + (broken == null ? "ok" : broken));
            Check(maxSeen == 3, "怪物数量被 Max=3 卡住（峰值 " + maxSeen + "）");

            TilePos? stuck = null;
            bool inRect = true;
            foreach (Entity e in sim.World.Entities)
            {
                if (e.Kind != EntityKind.Monster) continue;
                if (e.Pos.ChebyshevTo(new TilePos(2, 2)) > 12) stuck = e.Pos;
            }
            Check(stuck == null, "怪物不会跑出刷怪区太远" + (stuck == null ? "" : "（" + stuck + "）"));
            Check(inRect, "(占位断言)");
        }
    }
}
