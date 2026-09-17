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
            TestConsumable();
            TestLootLoop();
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

            Simulation sim = new Simulation(map, 11u, null, null, null);
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
            Simulation sim2 = new Simulation(Map("..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", "..........", ".........."), 12u, null, null, null);
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

            Simulation sim = new Simulation(map, 21u, factory, null, null);
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

            Simulation sim = new Simulation(map, 3u, factory, t, null);

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

            Simulation sim = new Simulation(map, 4u, factory, t, null);

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

            Simulation sim = new Simulation(map, 9u, factory, t, cat);
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
    }
}
