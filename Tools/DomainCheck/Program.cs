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
            TestDamage();
            TestAttackArc();
            TestCombatKill();
            TestPlayerDeathAndRespawn();
            TestInventory();
            TestEquipment();
            TestItemPickup();
            TestDropRoller();
            TestItemQuality();
            TestLineOfSight();
            TestPackAggro();
            TestConsumable();
            TestLootLoop();
            TestMapSwitch();
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

        /// <summary>和 Map() 一样，只是能指定 id —— 多地图用例需要靠 id 区分。</summary>
        private static GameMap NamedMap(string id, params string[] rows)
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
            GameMap map = new GameMap(id, id, w, h, tiles);
            map.Spawn = new TilePos(1, 1);
            return map;
        }

        private static void AddPortal(GameMap map, int x, int y, string targetMap, int tx, int ty)
        {
            Portal p = new Portal();
            p.At = new TilePos(x, y);
            p.TargetMap = targetMap;
            p.TargetPos = new TilePos(tx, ty);
            map.Portals.Add(p);
        }

        private static void AddSpawner(GameMap map, int x, int y, int w, int h, string monsterId, int max, int interval)
        {
            Spawner s = new Spawner();
            s.X = x; s.Y = y; s.W = w; s.H = h;
            s.MonsterId = monsterId;
            s.Max = max;
            s.IntervalTicks = interval;
            map.Spawners.Add(s);
        }

        /// <summary>测试用的地图表：注册了哪几张就给哪几张，其余一律 null。</summary>
        private sealed class FakeMapCatalog : IMapCatalog
        {
            private readonly Dictionary<string, GameMap> _maps = new Dictionary<string, GameMap>();

            public void Add(GameMap map) { _maps[map.Id] = map; }

            public GameMap GetMap(string mapId)
            {
                GameMap m;
                return _maps.TryGetValue(mapId, out m) ? m : null;
            }
        }

        private static Entity MakeEntity(EntityKind kind, TilePos pos)        {
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
                if (!w.Map.InBounds(e.HomePos)) return "HomePos 越界";
                if (!e.BlocksTile) continue;   // 掉落物不占格，允许和角色同格
                int key = e.Pos.Y * w.Map.Width + e.Pos.X;
                if (!seen.Add(key)) return "两个实体占同一格 " + e.Pos;
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

            Simulation sim = new Simulation(map, 11u, null, null, null, null, null);
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
            Simulation sim2 = new Simulation(Map("..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", ".........."), 12u, null, null, null, null, null);
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

            Simulation sim = new Simulation(map, 21u, factory, null, null, null, null);
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

        // ---------------------------------------------------------------- M2 战斗

        private static void TestDamage()
        {
            Console.WriteLine("[伤害公式]");
            CombatTuning t = new CombatTuning();
            t.HitBase = 1f; t.CritChance = 0f; t.HitMin = 0f;

            Entity a = MakeEntity(EntityKind.Player, new TilePos(0, 0));
            a.MinDc = 5; a.MaxDc = 5; a.Level = 1;
            Entity d = MakeEntity(EntityKind.Monster, new TilePos(1, 0));
            d.Ac = 0; d.Level = 1;
            Rng rng = new Rng(9u);

            bool flat = true;
            for (int i = 0; i < 200; i++)
            {
                DamageResult r = DamageCalculator.Roll(a, d, rng, t);
                if (!r.Hit || r.Crit || r.Amount != 5) flat = false;
            }
            Check(flat, "必中 + AC=0 -> 伤害恒等于攻击力");

            t.CritChance = 1f; t.CritMultiplier = 2f;
            DamageResult crit = DamageCalculator.Roll(a, d, rng, t);
            Check(crit.Crit && crit.Amount == 10, "暴击倍率生效（5 x2 = 10，实际 " + crit.Amount + "）");

            t.CritChance = 0f;
            d.Ac = 4;
            bool bounded = true;
            for (int i = 0; i < 300; i++)
            {
                DamageResult r = DamageCalculator.Roll(a, d, rng, t);
                if (r.Amount < 1 || r.Amount > 5) bounded = false;
            }
            Check(bounded, "AC 只做减法且伤害有下限 1（实测落在 1..5）");

            t.HitBase = 0f; t.HitMin = 0f; t.HitPerLevel = 0.01f;
            a.Level = 1; d.Level = 100;
            int hits = 0;
            for (int i = 0; i < 400; i++) if (DamageCalculator.Roll(a, d, rng, t).Hit) hits++;
            Check(hits == 0, "命中率被下限夹到 0 时永远打不中");

            t.HitMin = 0.5f;
            hits = 0;
            for (int i = 0; i < 400; i++) if (DamageCalculator.Roll(a, d, rng, t).Hit) hits++;
            float rate = hits / 400f;
            Check(rate > 0.35f && rate < 0.65f, "命中率被 HitMin 抬到 50%（实测 " + rate.ToString("0.00") + "）");
        }

        private static void TestAttackArc()
        {
            Console.WriteLine("[攻击弧]");
            Entity a = MakeEntity(EntityKind.Player, new TilePos(5, 5));
            a.AttackRange = 1;
            a.Facing = Dir.Right;

            Check(CombatSystem.InAttackArc(a, MakeEntity(EntityKind.Monster, new TilePos(6, 5))), "正面 1 格能打到");
            Check(CombatSystem.InAttackArc(a, MakeEntity(EntityKind.Monster, new TilePos(6, 6))), "斜前方 1 格能打到");
            Check(!CombatSystem.InAttackArc(a, MakeEntity(EntityKind.Monster, new TilePos(4, 5))), "背后打不到");
            Check(!CombatSystem.InAttackArc(a, MakeEntity(EntityKind.Monster, new TilePos(7, 5))), "超出距离打不到");
            Check(!CombatSystem.InAttackArc(a, a), "不会打到自己");

            Check(CombatSystem.IsHostile(a, MakeEntity(EntityKind.Monster, new TilePos(9, 9))), "玩家 <-> 怪 互为敌对");
            Check(!CombatSystem.IsHostile(a, MakeEntity(EntityKind.Npc, new TilePos(9, 9))), "NPC 不算敌对");
            Check(!CombatSystem.IsHostile(a, a), "自己不算敌对");
        }

        private static GameMap OpenMap(int size)
        {
            string[] rows = new string[size];
            for (int i = 0; i < size; i++) rows[i] = new string('.', size);
            return Map(rows);
        }

        private static void TestCombatKill()
        {
            Console.WriteLine("[战斗闭环：打死 -> 经验 -> 掉落 -> 拾取]");
            GameMap map = OpenMap(20);

            CombatTuning t = new CombatTuning();
            t.HitBase = 1f; t.HitMin = 1f; t.CritChance = 0f;
            t.CorpseTicks = 3; t.GroundLootTicks = 50; t.RegenDelayTicks = 100000;

            Func<string, Entity> factory = delegate(string id)
            {
                Entity m = MakeEntity(EntityKind.Monster, new TilePos(10, 10));
                m.DefId = id;
                m.Hp = 12; m.MaxHp = 12;
                m.MinDc = 0; m.MaxDc = 0; m.Ac = 0;
                m.MoveSpeed = 100; m.AttackInterval = 100;
                m.AttackRange = 1; m.Vision = 1; m.Aggressive = false; m.Leash = 2;
                m.ExpReward = 20; m.GoldMin = 5; m.GoldMax = 5; m.GoldChance = 1f;
                return m;
            };

            Simulation sim = new Simulation(map, 3u, factory, t, null, null, null);

            Entity player = MakeEntity(EntityKind.Player, new TilePos(9, 10));
            player.Facing = Dir.Right;
            player.Hp = 100; player.MaxHp = 100;
            player.MinDc = 6; player.MaxDc = 6; player.Ac = 0;
            player.AttackInterval = 1; player.AttackRange = 1;
            player.ExpToNextLevel = 1000;
            sim.World.Spawn(player);
            sim.World.Player = player;

            Entity mon = factory("mon_test");
            mon.Pos = new TilePos(10, 10);
            mon.HomePos = mon.Pos;
            sim.World.Spawn(mon);

            int damageEvents = 0, diedEvents = 0, goldEvents = 0, expEvents = 0;
            sim.Bus.Subscribe<DamageDealt>(delegate(DamageDealt e) { damageEvents++; });
            sim.Bus.Subscribe<EntityDied>(delegate(EntityDied e) { diedEvents++; });
            sim.Bus.Subscribe<GoldPicked>(delegate(GoldPicked e) { goldEvents++; });
            sim.Bus.Subscribe<ExpGained>(delegate(ExpGained e) { expEvents++; });

            List<Intent> intents = new List<Intent>();
            string broken = null;
            for (int i = 0; i < 20 && broken == null; i++)
            {
                intents.Clear();
                intents.Add(Intent.Attack(player.Id, Dir.Right));
                sim.Step(intents);
                broken = Invariants(sim.World);
                if (diedEvents == 1) break;      // 刚死，立刻检查尸体状态
            }

            Check(broken == null, "战斗全程不变量成立: " + (broken == null ? "ok" : broken));
            Check(mon.Hp == 0, "怪被打死（HP " + mon.Hp + "）");
            Check(damageEvents == 2, "12 点血 / 每下 6 点 = 2 次伤害（实际 " + damageEvents + "）");
            Check(diedEvents == 1, "死亡事件发了一次（实际 " + diedEvents + "）");
            Check(expEvents == 1 && player.Exp == 20, "击杀拿到 20 经验（实际 " + player.Exp + "）");

            // 怪自己会游荡，所以用「死亡那一刻的真实格子」做断言
            TilePos deathTile = mon.Pos;

            Entity loot = null;
            foreach (Entity e in sim.World.Entities) if (e.Kind == EntityKind.GroundItem) loot = e;
            Check(loot != null, "掉出了地面金币");
            Check(sim.World.Get(mon.Id) != null, "尸体还在，暂时还占着那一格");
            Check(sim.World.IsOccupied(deathTile), "死亡点被尸体占着（" + deathTile + "）");
            Check(loot != null && loot.Pos == deathTile, "金币掉在死亡点上（实际 " + (loot != null ? loot.Pos.ToString() : "-") + "）");

            // 尸体到点被清掉；金币留在原地且不占格
            for (int i = 0; i < 6; i++) sim.Step(new List<Intent>());
            Check(mon.Pos == deathTile, "尸体挂掉之后一直没动过");
            Check(sim.World.Get(mon.Id) == null, "尸体按 CorpseTicks 被清理");
            Check(!sim.World.IsOccupied(deathTile), "尸体清掉后格子释放");
            Check(sim.World.GroundItemAt(deathTile) == loot, "金币还在原地，且不占格");

            // 走过去捡金币
            if (loot != null)
            {
                sim.World.PlaceEntity(player, loot.Pos);
                sim.Step(new List<Intent>());
                Check(goldEvents == 1, "踩上去自动捡金币（事件 " + goldEvents + "）");
                Check(player.Gold == 5, "金币进账 5（实际 " + player.Gold + "）");
                Check(sim.World.Get(loot.Id) == null, "捡完后地面金币消失");
            }

            // 地面物到期自动消失
            Entity loot2 = null;
            foreach (Entity e in sim.World.Entities) if (e.Kind == EntityKind.GroundItem) loot2 = e;
            Check(loot2 == null, "没有残留的地面物");
        }

        private static void TestPlayerDeathAndRespawn()
        {
            Console.WriteLine("[玩家死亡与复活]");
            GameMap map = OpenMap(20);
            map.Spawn = new TilePos(2, 2);

            CombatTuning t = new CombatTuning();
            t.HitBase = 1f; t.HitMin = 1f; t.CritChance = 0f;
            t.PlayerRespawnTicks = 5;
            t.CorpseTicks = 2;
            t.RegenDelayTicks = 100000;

            Func<string, Entity> factory = delegate(string id)
            {
                Entity m = MakeEntity(EntityKind.Monster, new TilePos(11, 10));
                m.DefId = id;
                m.Hp = 1000; m.MaxHp = 1000;
                m.MinDc = 50; m.MaxDc = 50; m.Ac = 0;
                m.AttackInterval = 1; m.AttackRange = 1;
                m.Vision = 1; m.Leash = 3; m.MoveSpeed = 50; m.Aggressive = true;
                m.ExpReward = 0;
                return m;
            };

            Simulation sim = new Simulation(map, 4u, factory, t, null, null, null);

            Entity player = MakeEntity(EntityKind.Player, new TilePos(10, 10));
            player.Hp = 60; player.MaxHp = 60; player.Ac = 0; player.Level = 1;
            player.AttackInterval = 10; player.ExpToNextLevel = 1000;
            sim.World.Spawn(player);
            sim.World.Player = player;

            Entity wolf = factory("mon_wolf");
            wolf.Pos = new TilePos(11, 10);
            wolf.HomePos = wolf.Pos;
            sim.World.Spawn(wolf);

            int deaths = 0, respawns = 0;
            sim.Bus.Subscribe<EntityDied>(delegate(EntityDied e) { if (e.Id == player.Id) deaths++; });
            sim.Bus.Subscribe<PlayerRespawned>(delegate(PlayerRespawned e) { respawns++; });

            List<Intent> intents = new List<Intent>();
            string broken = null;
            bool movedWhileDead = false;

            for (int i = 0; i < 60 && broken == null; i++)
            {
                intents.Clear();
                if (!player.IsAlive) intents.Add(Intent.Move(player.Id, Dir.Left));

                TilePos before = player.Pos;
                sim.Step(intents);
                if (!player.IsAlive && player.Pos != before) movedWhileDead = true;
                broken = Invariants(sim.World);
            }

            Check(broken == null, "死亡/复活全程不变量成立: " + (broken == null ? "ok" : broken));
            Check(deaths == 1, "玩家死亡事件发了一次（实际 " + deaths + "）");
            Check(respawns == 1, "玩家复活了一次（实际 " + respawns + "）");
            Check(player.IsAlive && player.Hp == player.MaxHp, "复活后满血（" + player.Hp + "/" + player.MaxHp + "）");
            Check(player.Pos == new TilePos(2, 2), "复活回出生点（实际 " + player.Pos + "）");
            Check(!movedWhileDead, "死亡期间完全无法移动");
            Check(!sim.World.IsOccupied(new TilePos(10, 10)), "玩家尸体原位置已释放");
        }

        // ---------------------------------------------------------------- M3 物品 / 背包 / 装备

        private static Entity MakeFullPlayer(TestCatalog catalog, TilePos pos)
        {
            Entity e = MakeEntity(EntityKind.Player, pos);
            e.Level = 1;
            e.BaseMinDc = 5; e.BaseMaxDc = 9; e.BaseAc = 2; e.BaseMaxHp = 120;
            e.Bag = new Inventory();
            e.Gear = new Equipment();
            e.ExpToNextLevel = 1000;
            e.AttackInterval = 10;
            StatCalculator.Apply(e, catalog);
            e.Hp = e.MaxHp;
            return e;
        }

        private static Entity MakeGroundItem(TilePos at, string defId, int count)
        {
            Entity e = new Entity();
            e.Kind = EntityKind.GroundItem;
            e.DefId = defId;
            e.SpriteId = defId;
            e.Name = defId;
            e.BlocksTile = false;
            e.Count = count;
            e.LifetimeTicks = 0;
            e.Pos = at;
            e.HomePos = at;
            return e;
        }

        private static void TestInventory()
        {
            Console.WriteLine("[背包]");
            TestCatalog cat = new TestCatalog();
            cat.Material("hide");
            cat.Potion("pot", 30);

            Inventory bag = new Inventory();
            ItemDef hide = cat.Get("hide");

            Check(bag.Add(hide, 5) == 5, "放入 5 个可堆叠物品");
            Check(bag.UsedSlots == 1, "堆叠进同一格（用了 " + bag.UsedSlots + " 格）");
            bag.Add(hide, 10);
            Check(bag.At(0).Count == 15, "继续叠加到 15（实际 " + bag.At(0).Count + "）");
            Check(bag.RemoveById("hide", 5) == 5, "按 id 移除 5 个");
            Check(bag.At(0).Count == 10, "移除后剩 10 个");

            ItemDef pot = cat.Get("pot");
            int added = bag.Add(pot, Inventory.SlotCount * 99);
            Check(added == (Inventory.SlotCount - 1) * 99, "剩余格子全塞满（实际加入 " + added + "）");
            Check(bag.FreeSpaceFor(pot) == 0, "背包已满");
            Check(bag.Add(pot, 1) == 0, "满了之后加不进去");
            Check(bag.UsedSlots == Inventory.SlotCount, "48 格全满（实际 " + bag.UsedSlots + "）");

            Check(bag.Move(0, 1), "交换两格");
            Check(bag.At(0) != null && bag.At(1) != null, "交换后两格都还有东西");
        }

        private static void TestEquipment()
        {
            Console.WriteLine("[装备与属性聚合]");
            TestCatalog cat = new TestCatalog();
            cat.Equip("sword1", EquipSlot.Weapon, 2, 4, 0);
            cat.Equip("sword2", EquipSlot.Weapon, 6, 10, 0);
            cat.Equip("armour1", EquipSlot.Armour, 0, 0, 3, 1, 20);
            cat.Equip("relic", EquipSlot.Weapon, 50, 60, 0, 99);
            cat.Material("junk");

            GameMap map = OpenMap(8);
            World world = new World(map, 1u, new EventBus());
            Entity p = MakeFullPlayer(cat, new TilePos(1, 1));

            Check(p.MinDc == 5 && p.MaxDc == 9 && p.Ac == 2, "初始有效属性 = 基础属性");
            Check(p.MaxHp == 120, "初始最大生命 120");

            p.Bag.Add(cat.Get("sword1"), 1);
            Check(ItemSystem.Equip(world, p, p.Bag.IndexOf("sword1"), cat), "穿上木剑");
            Check(p.Gear.Get(EquipSlot.Weapon) != null, "武器栏有东西了");
            Check(p.Bag.IndexOf("sword1") == -1, "背包里的木剑没了");
            Check(p.MinDc == 7 && p.MaxDc == 13, "攻击力 5+2 / 9+4（实际 " + p.MinDc + "-" + p.MaxDc + "）");

            Check(p.Gear.Get(EquipSlot.Weapon).Count == 1, "身上的装备数量是 1（不能被背包的 RemoveAt 减成 0）");

            p.Bag.Add(cat.Get("sword2"), 1);
            Check(ItemSystem.Equip(world, p, p.Bag.IndexOf("sword2"), cat), "换上短剑");
            Check(p.Gear.Get(EquipSlot.Weapon).DefId == "sword2", "武器栏是短剑");
            Check(p.Bag.IndexOf("sword1") >= 0, "换下来的木剑回到背包");
            Check(p.MinDc == 11 && p.MaxDc == 19, "攻击力 5+6 / 9+10（实际 " + p.MinDc + "-" + p.MaxDc + "）");

            p.Bag.Add(cat.Get("relic"), 1);
            Check(!ItemSystem.Equip(world, p, p.Bag.IndexOf("relic"), cat), "等级不够穿不上");
            Check(p.Gear.Get(EquipSlot.Weapon).DefId == "sword2", "装备没被换掉");
            Check(p.Bag.IndexOf("relic") >= 0, "那件装备还在背包里");

            Check(ItemSystem.Unequip(world, p, EquipSlot.Weapon, cat), "卸下武器");
            Check(p.Gear.Get(EquipSlot.Weapon) == null, "武器栏空了");
            Check(p.MinDc == 5 && p.MaxDc == 9, "属性回到基础值");
            Check(p.Bag.IndexOf("sword2") >= 0, "短剑回到背包");

            p.Bag.Add(cat.Get("armour1"), 1);
            ItemSystem.Equip(world, p, p.Bag.IndexOf("armour1"), cat);
            Check(p.MaxHp == 140, "皮甲 +20 生命（实际 " + p.MaxHp + "）");
            Check(p.Ac == 5, "防御 2+3=5（实际 " + p.Ac + "）");

            // 背包塞满时换装必须失败，而且不能把身上的装备弄丢
            Entity p3 = MakeFullPlayer(cat, new TilePos(3, 3));
            p3.Bag.Add(cat.Get("sword1"), 1);
            ItemSystem.Equip(world, p3, p3.Bag.IndexOf("sword1"), cat);
            p3.Bag.Add(cat.Get("sword2"), 1);
            int sword2Index = p3.Bag.IndexOf("sword2");
            p3.Bag.Add(cat.Get("junk"), Inventory.SlotCount * 99);
            Check(p3.Bag.UsedSlots == Inventory.SlotCount, "背包已满（" + p3.Bag.UsedSlots + " 格）");
            Check(!ItemSystem.Equip(world, p3, sword2Index, cat), "背包满时换装失败");
            Check(p3.Gear.Get(EquipSlot.Weapon).DefId == "sword1", "身上还是原来那把，没丢");
            Check(p3.Bag.IndexOf("sword2") == sword2Index, "背包里的那把也没被吞");
        }

        private static void TestItemPickup()
        {
            Console.WriteLine("[物品拾取]");
            TestCatalog cat = new TestCatalog();
            cat.Material("rock");
            cat.Material("heavy");

            GameMap map = OpenMap(12);
            World world = new World(map, 7u, new EventBus());
            world.Systems.Add(new LootSystem(cat));

            Entity p = MakeFullPlayer(cat, new TilePos(5, 5));
            world.Spawn(p);
            world.Player = p;

            world.Spawn(MakeGroundItem(new TilePos(6, 5), "rock", 2));
            world.PlaceEntity(p, new TilePos(6, 5));
            world.Step(new List<Intent>());
            Check(p.Bag.IndexOf("rock") >= 0, "踩上去自动捡起物品");
            Check(world.GroundItemAt(new TilePos(6, 5)) == null, "地面上的东西消失了");
            Check(world.GroundItemCount == 0, "地面物计数归零");

            // 已经没有负重机制：多重都捡得起来
            world.Spawn(MakeGroundItem(new TilePos(7, 5), "heavy", 2));
            world.PlaceEntity(p, new TilePos(7, 5));
            world.Step(new List<Intent>());
            Check(p.Bag.IndexOf("heavy") >= 0, "没有负重限制，再重也捡得起来");

            world.Spawn(MakeGroundItem(new TilePos(9, 5), "not_in_table", 1));
            world.PlaceEntity(p, new TilePos(9, 5));
            world.Step(new List<Intent>());
            Check(world.GroundItemAt(new TilePos(9, 5)) != null, "表里没有的物品不会被吞掉");

            // 唯一的拾取门槛：背包满了
            World fullWorld = new World(OpenMap(12), 8u, new EventBus());
            fullWorld.Systems.Add(new LootSystem(cat));
            Entity filler = MakeFullPlayer(cat, new TilePos(5, 5));
            fullWorld.Spawn(filler);
            fullWorld.Player = filler;

            ItemDef rock = cat.Get("rock");
            filler.Bag.Add(rock, Inventory.SlotCount * 99);
            Check(filler.Bag.FreeSpaceFor(rock) == 0, "把背包彻底塞满（" + filler.Bag.UsedSlots + " 格）");

            int refused = 0;
            fullWorld.Events.Subscribe<PickupRefused>(delegate(PickupRefused e) { refused++; });
            Entity overflow = MakeGroundItem(new TilePos(5, 5), "rock", 1);
            fullWorld.Spawn(overflow);
            fullWorld.Step(new List<Intent>());

            Check(refused == 1, "背包满时拒绝拾取并给出提示（实际 " + refused + "）");
            Check(fullWorld.GroundItemAt(new TilePos(5, 5)) != null, "背包满时东西留在原地，不会被吞");
            for (int i = 0; i < 8; i++) fullWorld.Step(new List<Intent>());
            Check(refused == 1, "提示有节流，不会每 tick 刷屏（实际 " + refused + "）");
        }

        private static void TestDropRoller()
        {
            Console.WriteLine("[掉落表]");
            List<ItemDrop> table = new List<ItemDrop>();
            ItemDrop always = new ItemDrop(); always.ItemId = "a"; always.Chance = 1f; always.Min = 2; always.Max = 2;
            ItemDrop never = new ItemDrop(); never.ItemId = "b"; never.Chance = 0f;
            table.Add(always); table.Add(never);

            Rng rng = new Rng(5u);
            List<ItemDropResult> results = new List<ItemDropResult>();
            DropRoller.Roll(table, rng, results);
            Check(results.Count == 1 && results[0].ItemId == "a" && results[0].Count == 2,
                "100% 的必掉 2 个，0% 的绝不掉");

            List<ItemDrop> half = new List<ItemDrop>();
            ItemDrop h = new ItemDrop(); h.ItemId = "c"; h.Chance = 0.5f; h.Min = 1; h.Max = 1;
            half.Add(h);
            int hits = 0;
            for (int i = 0; i < 2000; i++)
            {
                DropRoller.Roll(half, rng, results);
                if (results.Count > 0) hits++;
            }
            float rate = hits / 2000f;
            Check(rate > 0.44f && rate < 0.56f, "50% 概率实测 " + rate.ToString("0.00"));

            ItemDrop range = new ItemDrop(); range.ItemId = "d"; range.Chance = 1f; range.Min = 2; range.Max = 5;
            List<ItemDrop> one = new List<ItemDrop>(); one.Add(range);
            bool inRange = true;
            for (int i = 0; i < 300; i++)
            {
                DropRoller.Roll(one, rng, results);
                if (results[0].Count < 2 || results[0].Count > 5) inRange = false;
            }
            Check(inRange, "数量落在 min..max 区间内");
        }

        // ---------------------------------------------------------------- M5d 怪物的 AI

        private static void TestLineOfSight()
        {
            Console.WriteLine("[视线（远程怪不隔墙打人）]");

            GameMap open = OpenMap(10);
            Check(LineOfSight.Clear(open, new TilePos(1, 1), new TilePos(8, 1)), "空旷直线上看得见");
            Check(LineOfSight.Clear(open, new TilePos(1, 1), new TilePos(8, 8)), "空旷斜线上看得见");
            Check(LineOfSight.Clear(open, new TilePos(3, 3), new TilePos(3, 3)), "同格永远看得见");

            // 一堵竖墙，中间留个缺口
            GameMap wall = Map(
                "..........",
                "..........",
                "..#.......",
                "..#.......",
                "....#.....",
                "..........",
                "..........",
                "..........",
                "..........",
                "..........");
            Check(!LineOfSight.Clear(wall, new TilePos(0, 3), new TilePos(5, 3)),
                "墙后面的看不见（不穿墙）");
            Check(LineOfSight.Clear(wall, new TilePos(0, 4), new TilePos(3, 4)),
                "绕过缺口那一条看得见");

            // 起点和终点自己不算遮挡：怪站在墙边、目标贴着另一面墙，也不能因此判成"被挡住"
            GameMap edge = Map(
                "..........",
                "#.........",
                "..........",
                "..........",
                "..........",
                "..........",
                "..........",
                "..........",
                "..........",
                "..........");
            Check(LineOfSight.Clear(edge, new TilePos(1, 1), new TilePos(5, 1)),
                "起点自己是墙也不影响（只看中间经过的格）");
            Check(LineOfSight.Clear(edge, new TilePos(5, 8), new TilePos(0, 8)),
                "终点是墙也看得见（终点那格不判）");
        }

        private static void TestPackAggro()
        {
            Console.WriteLine("[群居（打了狼群一只，一群扑上来）]");

            GameMap map = OpenMap(20);
            World world = new World(map, 3u, new EventBus());

            Entity player = MakeEntity(EntityKind.Player, new TilePos(2, 5));
            world.Spawn(player);
            world.Player = player;

            Entity victim = MakeMonster("mon_wolf", new TilePos(5, 5), 10, 6);
            Entity near = MakeMonster("mon_wolf", new TilePos(7, 5), 8, 6);      // 距离 2，在半径 6 内
            Entity far = MakeMonster("mon_wolf", new TilePos(19, 5), 8, 6);      // 距离 14，半径外
            Entity otherKind = MakeMonster("mon_boar", new TilePos(6, 5), 6, 6); // 同类才惊动
            world.Spawn(victim); world.Spawn(near); world.Spawn(far); world.Spawn(otherKind);

            DamageResult hit = new DamageResult();
            hit.Amount = 1;
            CombatSystem.ApplyDamage(world, player, victim, hit);

            Check(near.Target == player.Id, "半径内的同类被惊动，目标指向打人的人");
            Check(far.Target.IsValid == false, "半径外的同伴没被惊动（离太远听不见）");
            Check(otherKind.Target.IsValid == false, "只惊动同类，别的怪不管");

            // 独行怪（packRadius = 0）不该有这种行为
            World solo = new World(OpenMap(20), 4u, new EventBus());
            Entity hero = MakeEntity(EntityKind.Player, new TilePos(2, 5));
            solo.Spawn(hero);
            solo.Player = hero;
            Entity lone = MakeMonster("mon_spider", new TilePos(5, 5), 10, 0);
            Entity buddy = MakeMonster("mon_spider", new TilePos(6, 5), 8, 0);
            solo.Spawn(lone); solo.Spawn(buddy);
            CombatSystem.ApplyDamage(solo, hero, lone, hit);
            Check(buddy.Target.IsValid == false, "群居半径 0 的怪（独行）不会喊同伴");

            // 打死的那一只也要惊动同伴：一击秒掉一只狼，狼群照样扑上来
            World killing = new World(OpenMap(20), 5u, new EventBus());
            Entity killer = MakeEntity(EntityKind.Player, new TilePos(2, 5));
            killing.Spawn(killer);
            killing.Player = killer;
            Entity dying = MakeMonster("mon_wolf", new TilePos(5, 5), 10, 8);
            Entity witness = MakeMonster("mon_wolf", new TilePos(8, 5), 8, 8);
            killing.Spawn(dying); killing.Spawn(witness);
            DamageResult lethal = new DamageResult();
            lethal.Amount = 999;
            CombatSystem.ApplyDamage(killing, killer, dying, lethal);
            Check(dying.Hp == 0, "第一只被秒了");
            Check(witness.Target == killer.Id, "被秒的那一只也把同伴喊来了");

            // 远程怪：目标在射程内、但中间隔着墙 -> 不出手；绕开墙 -> 出手
            GameMap wallMap = Map(
                "####################",
                "#..................#",
                "#..................#",
                "#...##.............#",
                "#...##.............#",
                "#..................#",
                "#..................#",
                "#..................#",
                "####################");
            World ranged = new World(wallMap, 6u, new EventBus());
            Entity prey = MakeEntity(EntityKind.Player, new TilePos(1, 3));
            ranged.Spawn(prey);
            ranged.Player = prey;

            // 射程 6、视野 8，玩家在 (1,3)：距离 5 够得着，但 (4,3)/(5,3) 是墙
            Entity shooter = MakeEntity(EntityKind.Monster, new TilePos(6, 3));
            shooter.DefId = "mon_lich";
            shooter.AttackRange = 6;
            shooter.Vision = 8;
            shooter.Aggressive = true;
            shooter.AttackCooldown = 0;
            shooter.AiThinkCooldown = 0;
            ranged.Spawn(shooter);

            // 让 AI 思考一次：中间隔着 (4,3)/(5,3) 那两格墙
            ranged.Systems.Add(new AiSystem());
            ranged.Step(new List<Intent>());
            Check(!shooter.WantsAttack, "隔着墙不出手（远程怪的视线判定生效）");

            // 把怪挪到没有墙的一侧，同一个射程就该开火
            World clear = new World(wallMap, 6u, new EventBus());
            Entity prey2 = MakeEntity(EntityKind.Player, new TilePos(1, 1));
            clear.Spawn(prey2);
            clear.Player = prey2;
            Entity shooter2 = MakeEntity(EntityKind.Monster, new TilePos(7, 1));
            shooter2.DefId = "mon_lich";
            shooter2.AttackRange = 6;
            shooter2.Vision = 8;
            shooter2.Aggressive = true;
            shooter2.AiThinkCooldown = 0;
            clear.Spawn(shooter2);
            clear.Systems.Add(new AiSystem());
            clear.Step(new List<Intent>());
            Check(shooter2.WantsAttack, "同一条直线上没有墙就该开火");
        }

        private static Entity MakeMonster(string defId, TilePos at, int hp, int packRadius)
        {
            Entity e = MakeEntity(EntityKind.Monster, at);
            e.DefId = defId;
            e.SpriteId = defId;
            e.Name = defId;
            e.BaseMaxHp = hp;
            e.MaxHp = hp;
            e.Hp = hp;
            e.PackRadius = packRadius;
            e.Aggressive = true;
            e.Vision = 9;
            e.Leash = 20;
            e.AttackRange = 1;
            return e;
        }

        // ---------------------------------------------------------------- M5b 装备品质

        private static void TestItemQuality()
        {
            Console.WriteLine("[装备品质]");

            // ---- 规则本身 ----
            Check(ItemQualityRules.PriceMultiplier(ItemQuality.White) < ItemQualityRules.PriceMultiplier(ItemQuality.Green)
               && ItemQualityRules.PriceMultiplier(ItemQuality.Green) < ItemQualityRules.PriceMultiplier(ItemQuality.Blue)
               && ItemQualityRules.PriceMultiplier(ItemQuality.Blue) < ItemQualityRules.PriceMultiplier(ItemQuality.Purple),
                "价格倍率随品质严格递增");

            Check(ItemQualityRules.StatMultiplier(ItemQuality.White) < ItemQualityRules.StatMultiplier(ItemQuality.Green)
               && ItemQualityRules.StatMultiplier(ItemQuality.Green) < ItemQualityRules.StatMultiplier(ItemQuality.Blue)
               && ItemQualityRules.StatMultiplier(ItemQuality.Blue) < ItemQualityRules.StatMultiplier(ItemQuality.Purple),
                "属性倍率随品质严格递增");

            Check(ItemQualityRules.Scale(0, ItemQuality.Purple) == 0, "0 属性放大还是 0");
            Check(ItemQualityRules.Scale(4, ItemQuality.White) == 4, "白装属性原样");
            Check(ItemQualityRules.Scale(4, ItemQuality.Purple) == 8, "史诗 4 -> 8（1.9 倍，实际 " + ItemQualityRules.Scale(4, ItemQuality.Purple) + "）");
            Check(ItemQualityRules.Parse("purple") == ItemQuality.Purple
               && ItemQualityRules.Parse("BLUE") == ItemQuality.Blue
               && ItemQualityRules.Parse("") == ItemQuality.White
               && ItemQualityRules.Parse("乱七八糟") == ItemQuality.White,
                "品质字符串解析（含空串 / 脏数据退回白色）");

            Check(ItemQualityRules.Max(ItemQuality.Blue, ItemQuality.Green) == ItemQuality.Blue,
                "取较高的品质");

            // ---- 掉落时摇品质 ----
            TestCatalog cat = new TestCatalog();
            cat.Equip("sword", EquipSlot.Weapon, 6, 10, 0);
            cat.Equip("relic", EquipSlot.Weapon, 6, 10, 0, 1, 0, ItemQuality.Blue);   // 最低稀有
            cat.Potion("pot", 30);

            LootTuning tuning = new LootTuning();
            tuning.Clamp();

            List<ItemDrop> table = new List<ItemDrop>();
            table.Add(MakeDrop("sword", 1f));
            table.Add(MakeDrop("relic", 1f));
            table.Add(MakeDrop("pot", 1f));

            Rng rng = new Rng(20240617u);
            List<ItemDropResult> results = new List<ItemDropResult>();
            int[] swordCounts = new int[ItemQualityRules.Count];
            bool potionAlwaysWhite = true;
            bool relicNeverBelowFloor = true;

            for (int i = 0; i < 4000; i++)
            {
                DropRoller.Roll(table, rng, results, cat, tuning, 3);
                for (int k = 0; k < results.Count; k++)
                {
                    if (results[k].ItemId == "sword") swordCounts[(int)results[k].Quality]++;
                    if (results[k].ItemId == "pot" && results[k].Quality != ItemQuality.White) potionAlwaysWhite = false;
                    if (results[k].ItemId == "relic" && (int)results[k].Quality < (int)ItemQuality.Blue) relicNeverBelowFloor = false;
                }
            }

            Check(potionAlwaysWhite, "药水永远不会摇出品质（可堆叠物恒为白色）");
            Check(relicNeverBelowFloor, "物品表写了 minQuality: blue，就绝不会掉出白装或绿装");

            Check(swordCounts[(int)ItemQuality.White] > swordCounts[(int)ItemQuality.Green]
               && swordCounts[(int)ItemQuality.Green] > swordCounts[(int)ItemQuality.Blue]
               && swordCounts[(int)ItemQuality.Blue] > swordCounts[(int)ItemQuality.Purple],
                "品质分布单调递减：白 " + swordCounts[0] + " > 绿 " + swordCounts[1]
                + " > 蓝 " + swordCounts[2] + " > 紫 " + swordCounts[3]);
            Check(swordCounts[(int)ItemQuality.Purple] > 0, "4000 次里确实出过史诗（实际 " + swordCounts[3] + " 件）");

            // 同一个种子 -> 同一串品质（可复现）
            List<ItemDrop> onlySword = new List<ItemDrop>();
            onlySword.Add(MakeDrop("sword", 1f));
            Rng r1 = new Rng(99u), r2 = new Rng(99u);
            bool same = true;
            for (int i = 0; i < 60; i++)
            {
                DropRoller.Roll(onlySword, r1, results, cat, tuning, 3);
                ItemQuality q1 = results[0].Quality;
                DropRoller.Roll(onlySword, r2, results, cat, tuning, 3);
                if (results[0].Quality != q1) same = false;
            }
            Check(same, "同种子 -> 同品质序列（可复现）");

            // 怪越高级越容易出好货
            Check(tuning.WeightOf(ItemQuality.Purple, 12) > tuning.WeightOf(ItemQuality.Purple, 1),
                "怪越高级，史诗权重越高（Lv1 -> Lv12）");
            Check(tuning.WeightOf(ItemQuality.White, 12) == tuning.WeightOf(ItemQuality.White, 1),
                "白装不吃等级加成");

            // 没有物品表时退化成白装，不会崩
            DropRoller.Roll(onlySword, new Rng(7u), results, null, null, 5);
            Check(results.Count == 1 && results[0].Quality == ItemQuality.White,
                "没传物品表时退化成白装，不抛异常");

            // ---- 品质真的进属性 ----
            GameMap map = OpenMap(8);
            World world = new World(map, 1u, new EventBus());

            int prevMin = -1, prevMax = -1;
            bool rising = true;
            for (int i = 0; i < ItemQualityRules.Count; i++)
            {
                Entity hero = MakeFullPlayer(cat, new TilePos(1, 1));
                hero.Bag.Add(cat.Get("sword"), 1, (ItemQuality)i);
                ItemSystem.Equip(world, hero, hero.Bag.IndexOf("sword"), cat);
                if (hero.MinDc <= prevMin || hero.MaxDc <= prevMax) rising = false;
                prevMin = hero.MinDc; prevMax = hero.MaxDc;
            }
            Check(rising, "同一件武器：品质越高，穿上的攻击力越高（白 -> 紫，最后 " + prevMin + "-" + prevMax + "）");

            // 穿脱一个来回，品质不能丢
            Entity keeper = MakeFullPlayer(cat, new TilePos(2, 2));
            keeper.Bag.Add(cat.Get("sword"), 1, ItemQuality.Purple);
            Check(ItemSystem.Equip(world, keeper, keeper.Bag.IndexOf("sword"), cat), "穿上史诗武器");
            Check(keeper.Gear.Get(EquipSlot.Weapon).Quality == ItemQuality.Purple, "装备栏里记着它是史诗");
            Check(ItemSystem.Unequip(world, keeper, EquipSlot.Weapon, cat), "卸下史诗武器");
            Check(keeper.Bag.At(keeper.Bag.IndexOf("sword")).Quality == ItemQuality.Purple,
                "卸回背包后品质没变成白色");

            // 换装：被换下来的那件也要保持自己的品质
            Entity swapper = MakeFullPlayer(cat, new TilePos(3, 3));
            swapper.Bag.Add(cat.Get("sword"), 1, ItemQuality.Blue);
            ItemSystem.Equip(world, swapper, swapper.Bag.IndexOf("sword"), cat);
            swapper.Bag.Add(cat.Get("relic"), 1, ItemQuality.White);
            Check(ItemSystem.Equip(world, swapper, swapper.Bag.IndexOf("relic"), cat), "换上另一件武器");
            Check(swapper.Bag.At(swapper.Bag.IndexOf("sword")).Quality == ItemQuality.Blue,
                "换下来的那件还是稀有（没被重置成白色）");

            // 背包：不同品质的同一件装备必须各占一格，不能叠在一起
            Inventory bag = new Inventory();
            ItemDef swordDef = cat.Get("sword");
            bag.Add(swordDef, 1, ItemQuality.White);
            bag.Add(swordDef, 1, ItemQuality.Purple);
            Check(bag.UsedSlots == 2, "同名的白剑和紫剑各占一格（实际 " + bag.UsedSlots + " 格）");

            // ---- 品质进价格 ----
            swordDef.Price = 100;
            ShopTuning shop = new ShopTuning();
            shop.SellRatio = 0.4f;
            Check(shop.BuyPriceOf(swordDef, ItemQuality.White) == 100, "白装买入价 = 基础价 100");
            Check(shop.BuyPriceOf(swordDef, ItemQuality.Purple) == 420, "史诗买入价 420（实际 " + shop.BuyPriceOf(swordDef, ItemQuality.Purple) + "）");
            Check(shop.SellPriceOf(swordDef, ItemQuality.Purple) > shop.SellPriceOf(swordDef, ItemQuality.White),
                "史诗卖得比白装多（" + shop.SellPriceOf(swordDef, ItemQuality.White)
                + " -> " + shop.SellPriceOf(swordDef, ItemQuality.Purple) + "）");
            Check(shop.SellPriceOf(swordDef, ItemQuality.White) == 40, "白装回收价还是 ×0.4（旧行为不变）");

            // ---- 地上掉的品质，捡起来要带进背包 ----
            World lootWorld = new World(OpenMap(12), 11u, new EventBus());
            lootWorld.Systems.Add(new LootSystem(cat));
            Entity picker = MakeFullPlayer(cat, new TilePos(5, 5));
            lootWorld.Spawn(picker);
            lootWorld.Player = picker;

            Entity groundSword = MakeGroundItem(new TilePos(6, 5), "sword", 1);
            groundSword.Quality = ItemQuality.Purple;
            lootWorld.Spawn(groundSword);
            lootWorld.PlaceEntity(picker, new TilePos(6, 5));
            lootWorld.Step(new List<Intent>());

            int picked = picker.Bag.IndexOf("sword");
            Check(picked >= 0 && picker.Bag.At(picked).Quality == ItemQuality.Purple,
                "地上捡起来的史诗，进了背包还是史诗");

            // ---- 存档读品质：坏数据不能读崩 ----
            Check(SaveData.QualityAt(null, 0) == ItemQuality.White, "v1 旧档（没有品质数组）读出白色");
            Check(SaveData.QualityAt(new int[] { (int)ItemQuality.Purple }, 5) == ItemQuality.White, "下标越界读出白色");
            Check(SaveData.QualityAt(new int[] { 99 }, 0) == ItemQuality.White, "数组里是脏数字也读出白色");
            Check(SaveData.QualityAt(new int[] { (int)ItemQuality.Purple }, 0) == ItemQuality.Purple, "正常值原样读出");
        }

        private static ItemDrop MakeDrop(string itemId, float chance)
        {
            ItemDrop d = new ItemDrop();
            d.ItemId = itemId;
            d.Chance = chance;
            d.Min = 1;
            d.Max = 1;
            return d;
        }

        private static void TestConsumable()
        {
            Console.WriteLine("[消耗品]");
            TestCatalog cat = new TestCatalog();
            cat.Potion("pot", 30);

            GameMap map = OpenMap(8);
            World world = new World(map, 3u, new EventBus());
            Entity p = MakeFullPlayer(cat, new TilePos(4, 4));
            world.Spawn(p);
            world.Player = p;

            p.Hp = 50;
            p.Bag.Add(cat.Get("pot"), 3);
            int idx = p.Bag.IndexOf("pot");

            Check(ItemSystem.Use(world, p, idx, cat), "喝药成功");
            Check(p.Hp == 80, "回血 30（实际 " + p.Hp + "）");
            Check(p.Bag.At(idx).Count == 2, "药水少了一瓶");

            p.Hp = p.MaxHp;
            Check(!ItemSystem.Use(world, p, idx, cat), "满血时不浪费药");
            Check(p.Bag.At(idx).Count == 2, "药水数量没变");
        }

        private static void TestLootLoop()
        {
            Console.WriteLine("[闭环：击杀 -> 掉装 -> 捡起 -> 穿上 -> 变强]");
            TestCatalog cat = new TestCatalog();
            cat.Equip("sword", EquipSlot.Weapon, 10, 10, 0);

            GameMap map = OpenMap(20);
            CombatTuning t = new CombatTuning();
            t.HitBase = 1f; t.HitMin = 1f; t.CritChance = 0f;
            t.CorpseTicks = 1; t.GroundLootTicks = 100; t.RegenDelayTicks = 100000;

            Func<string, Entity> factory = delegate(string id)
            {
                Entity m = MakeEntity(EntityKind.Monster, new TilePos(10, 10));
                m.DefId = id;
                m.BaseMaxHp = 10; m.BaseAc = 0;
                m.AttackInterval = 100; m.MoveSpeed = 100;
                m.Vision = 0; m.Aggressive = false; m.Leash = 1;
                m.ExpReward = 5;
                m.GoldMax = 0;
                ItemDrop drop = new ItemDrop();
                drop.ItemId = "sword"; drop.Chance = 1f; drop.Min = 1; drop.Max = 1;
                m.ItemDrops.Add(drop);
                return m;
            };

            Simulation sim = new Simulation(map, 9u, factory, t, cat, null, new ShopTuning());
            Entity p = MakeFullPlayer(cat, new TilePos(9, 10));
            sim.World.Spawn(p);
            sim.World.Player = p;

            Entity dummy = factory("dummy");
            dummy.Pos = new TilePos(10, 10);
            dummy.HomePos = dummy.Pos;
            sim.World.Spawn(dummy);

            int before = p.MinDc;
            CombatSystem.ApplyDamage(sim.World, p, dummy, new DamageResult { Hit = true, Crit = false, Amount = 999 });
            sim.Step(new List<Intent>());

            Entity drop = null;
            foreach (Entity e in sim.World.Entities) if (e.Kind == EntityKind.GroundItem) drop = e;
            Check(drop != null && drop.DefId == "sword", "怪掉了一把剑");

            for (int i = 0; i < 4; i++) sim.Step(new List<Intent>());   // 等尸体消失
            if (drop != null)
            {
                sim.World.PlaceEntity(p, drop.Pos);
                sim.Step(new List<Intent>());
                Check(p.Bag.IndexOf("sword") >= 0, "剑进了背包");

                Check(ItemSystem.Equip(sim.World, p, p.Bag.IndexOf("sword"), cat), "把剑穿上了");
                Check(p.MinDc > before, "攻击力从 " + before + " 提升到 " + p.MinDc);
            }
        }

        // ------------------------------------------------------------------ 多地图

        private static void TestMapSwitch()
        {
            Console.WriteLine("[切换地图 / 传送]");

            string[] open = { "..........", "..........", "..........", "..........", "..........",
                              "..........", "..........", "..........", "..........", ".........." };

            // map_a：走廊，(5,5) 是去 map_b 的传送点；也配个刷怪区，用来验证旧图账本被清
            GameMap a = NamedMap("map_a", open);
            AddPortal(a, 5, 5, "map_b", 3, 3);
            AddSpawner(a, 6, 6, 3, 3, "mon_old", 2, 1);

            // map_b：落点本身就是它自己的传送点（用来验证「落地不会再触发一次」），另配一个刷怪区
            GameMap b = NamedMap("map_b", open);
            AddPortal(b, 3, 3, "map_a", 5, 4);
            AddSpawner(b, 6, 6, 3, 3, "mon_slime", 2, 1);

            // map_c：传送点指向一张不存在的地图
            GameMap c = NamedMap("map_c", open);
            AddPortal(c, 5, 5, "map_nope", 1, 1);

            FakeMapCatalog catalog = new FakeMapCatalog();
            catalog.Add(a);
            catalog.Add(b);
            catalog.Add(c);

            TestCatalog items = new TestCatalog();
            items.Potion("potion", 30);

            Func<string, Entity> factory = delegate(string id)
            {
                Entity m = MakeEntity(EntityKind.Monster, new TilePos(2, 2));
                m.DefId = id;
                m.MoveSpeed = 100;      // 别乱跑，方便断言
                m.Vision = 0;
                m.Aggressive = false;
                return m;
            };

            Simulation sim = new Simulation(a, 5u, factory, null, items, null, null, catalog);
            World w = sim.World;

            Entity player = MakeFullPlayer(items, new TilePos(4, 5));
            player.Gold = 123;
            player.Level = 7;
            player.Bag.Add(items.Get("potion"), 3);
            w.Spawn(player);
            w.Player = player;

            Entity bystander = factory("mon_bystander");
            bystander.Pos = new TilePos(2, 2);
            bystander.HomePos = bystander.Pos;
            w.Spawn(bystander);

            int mapChanges = 0;
            string lastFrom = null, lastTo = null;
            sim.Bus.Subscribe<MapChanged>(delegate(MapChanged e) { mapChanges++; lastFrom = e.FromMapId; lastTo = e.ToMapId; });

            int refused = 0;
            sim.Bus.Subscribe<PortalRefused>(delegate(PortalRefused e) { refused++; });

            // 首 tick 只记录，不该触发（否则「读档落在传送点上」会被误传送）
            sim.Step(new List<Intent>());
            Check(w.Map.Id == "map_a", "开局在第一张图 map_a");
            Check(mapChanges == 0, "站着不动不会被传送");

            // 走进传送点
            List<Intent> acts = new List<Intent>();
            acts.Add(Intent.Move(player.Id, Dir.Right));
            sim.Step(acts);

            Check(w.Map.Id == "map_b", "走进传送点后换到了 map_b（实际 " + w.Map.Id + "）");
            Check(player.Pos == new TilePos(3, 3), "人在目标落点 (3,3)，实际 " + player.Pos);
            Check(mapChanges == 1, "只换了一次图（实际 " + mapChanges + "）");
            Check(lastFrom == "map_a" && lastTo == "map_b", "事件带对的 from/to");
            Check(refused == 0, "成功的传送不会发 PortalRefused");

            // 旧图的实体必须清干净，否则会在新图上占格、被 AI 继续驱动
            Check(w.Get(bystander.Id) == null, "旧图的怪被清掉了");
            bool onlyPlayerAndNewSpawns = true;
            foreach (Entity e in w.Entities)
                if (e.Id != player.Id && e.DefId != "mon_slime") onlyPlayerAndNewSpawns = false;
            Check(onlyPlayerAndNewSpawns,
                "换图后场上只剩玩家和新图刷出来的怪（实际 " + w.EntityCount + " 个实体）");
            Check(!w.IsOccupied(new TilePos(5, 5)), "旧图传送点的占位已释放");
            Check(w.IsOccupied(new TilePos(3, 3)), "新图落点被玩家占住");

            // 角色数据跨图不能丢
            Check(player.Level == 7 && player.Gold == 123, "等级和金币跨图保留");
            Check(player.Bag.IndexOf("potion") >= 0, "背包跨图保留");
            Check(player.HomePos == player.Pos, "HomePos 跟着人走（自检会校验它在界内）");

            // 落地那格本身就是传送点：不能再触发一次，否则来回死循环
            for (int i = 0; i < 5; i++) sim.Step(new List<Intent>());
            Check(w.Map.Id == "map_b", "落地在传送点上不会被二次传送");
            Check(mapChanges == 1, "不会来回弹（实际换了 " + mapChanges + " 次）");

            // 新图的刷怪区要能自己补起来
            for (int i = 0; i < 10; i++) sim.Step(new List<Intent>());
            Check(w.Map.Id == "map_b" && b.Spawners[0].Alive.Count > 0,
                "新图的刷怪区自动补刷（实际 " + b.Spawners[0].Alive.Count + " 只）");
            Check(a.Spawners[0].Alive.Count == 0, "旧图的刷怪区账本被清空");

            string broken = Invariants(w);
            Check(broken == null, "换图后不变量成立" + (broken == null ? "" : "：" + broken));

            // ---------------- 目标地图不存在：拒绝 + 留在原地，不能静默失败
            Simulation sim2 = new Simulation(c, 6u, factory, null, items, null, null, catalog);
            Entity p2 = MakeFullPlayer(items, new TilePos(4, 5));
            sim2.World.Spawn(p2);
            sim2.World.Player = p2;

            int refused2 = 0;
            sim2.Bus.Subscribe<PortalRefused>(delegate(PortalRefused e) { refused2++; });

            sim2.Step(new List<Intent>());
            List<Intent> walk = new List<Intent>();
            walk.Add(Intent.Move(p2.Id, Dir.Right));
            sim2.Step(walk);

            Check(refused2 == 1, "目标地图不存在时发了 PortalRefused（实际 " + refused2 + "）");
            Check(sim2.World.Map.Id == "map_c", "目标地图不存在时留在原地");
            Check(p2.Pos == new TilePos(5, 5), "人停在传送点上，没有凭空消失");
        }
    }
}
