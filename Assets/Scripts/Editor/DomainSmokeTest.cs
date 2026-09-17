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

        /// <summary>失败项数量，供命令行入口判断退出码。</summary>
        public static int FailureCount { get { return _fail; } }
        private static readonly List<string> _failures = new List<string>();

        /// <summary>命令行入口（CI / 脚本用）：
        /// Unity -batchmode -nographics -quit -projectPath . -executeMethod SimplyCQ.EditorTools.DomainSmokeTest.RunBatch
        /// 失败时以退出码 1 结束，这样脚本能直接判断。</summary>
        public static void RunBatch()
        {
            Run();
            EditorApplication.Exit(_fail == 0 ? 0 : 1);
        }

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

            // ---------------- M2 战斗闭环（用真实数据表跑一遍）----------------
            CombatTuning tuning = db.Tuning;
            Check(tuning != null && tuning.PlayerAttackInterval > 0,
                "balance.json 的 combat 段解析成功（攻击间隔 " + (tuning != null ? tuning.PlayerAttackInterval : 0) + " tick）");

            GameMap arena = MapLoader.CreateFallbackMap(24, 24);
            Simulation arena2 = new Simulation(arena, 20240617u, null, tuning);

            Entity fighter = db.CreatePlayer();
            fighter.Pos = arena.Spawn;
            fighter.HomePos = fighter.Pos;
            fighter.Hp = fighter.MaxHp;
            fighter.Gold = 0;
            arena2.World.Spawn(fighter);
            arena2.World.Player = fighter;

            string monsterId = map.Spawners.Count > 0 ? map.Spawners[0].MonsterId : "mon_hen";
            Entity dummy = db.CreateMonster(monsterId);
            Check(dummy != null, "能从数据表造出怪物 " + monsterId);

            if (dummy != null)
            {
                TilePos at = arena.FindNearestWalkable(new TilePos(fighter.Pos.X + 1, fighter.Pos.Y), 8);
                dummy.Pos = at;
                dummy.HomePos = at;
                dummy.Aggressive = false;
                arena2.World.Spawn(dummy);

                // 固定掉落，方便断言
                dummy.GoldChance = 1f;
                dummy.GoldMin = 3;
                dummy.GoldMax = 3;
                dummy.ExpReward = 7;

                int diedCount = 0, damageCount = 0;
                arena2.Bus.Subscribe<EntityDied>(delegate(EntityDied e) { diedCount++; });
                arena2.Bus.Subscribe<DamageDealt>(delegate(DamageDealt e) { damageCount++; });

                int expBefore = fighter.Exp;
                CombatSystem.ApplyDamage(arena2.World, fighter, dummy,
                    new DamageResult { Hit = true, Crit = false, Amount = dummy.MaxHp });
                arena2.Step(new List<Intent>());

                Check(diedCount == 1 && damageCount == 1, "致命伤 -> DamageDealt + EntityDied 各一次");
                Check(fighter.Exp == expBefore + 7, "经验结算正确（" + expBefore + " -> " + fighter.Exp + "）");

                Entity drop = null;
                foreach (Entity e in arena2.World.Entities) if (e.Kind == EntityKind.GroundItem) drop = e;
                Check(drop != null && drop.Gold == 3, "按掉落表掉出 3 金币");
                Check(drop != null && drop.Pos == at, "金币落在怪物死亡点 " + at);
                Check(arena2.World.EntityAt(at) == dummy, "此刻占着这一格的是尸体，掉落物不参与占格");

                for (int i = 0; i < tuning.CorpseTicks + 2; i++) arena2.Step(new List<Intent>());
                Check(arena2.World.Get(dummy.Id) == null, "尸体按 CorpseTicks=" + tuning.CorpseTicks + " 被清理");
                Check(arena2.World.GroundItemAt(at) == drop, "金币还留在原地");
                Check(!arena2.World.IsOccupied(at), "尸体清掉后金币所在格可通行（掉落物不占格）");

                arena2.World.PlaceEntity(fighter, at);
                arena2.Step(new List<Intent>());
                Check(fighter.Gold == 3, "踩上去自动捡到 3 金币（实际 " + fighter.Gold + "）");
                Check(arena2.World.GroundItemAt(at) == null, "捡完后地面金币消失");
            }

            // ---------------- M3 物品 / 背包 / 装备（用真实数据表）----------------
            Check(db.Items != null && db.Items.Count > 0,
                "items.json 加载了 " + (db.Items != null ? db.Items.Count : 0) + " 件物品");

            // 掉落表引用的物品必须都存在 —— 这种数据错误拖到运行时才发现就晚了
            int badDropRefs = 0;
            for (int i = 0; i < map.Spawners.Count; i++)
            {
                Entity probe = db.CreateMonster(map.Spawners[i].MonsterId);
                if (probe == null) continue;
                for (int k = 0; k < probe.ItemDrops.Count; k++)
                    if (db.Items.Get(probe.ItemDrops[k].ItemId) == null) badDropRefs++;
            }
            Check(badDropRefs == 0, "掉落表引用的物品都能在 items.json 里找到");

            Entity hero = db.CreatePlayer();
            Check(hero.Bag != null && hero.Gear != null, "玩家出生自带背包和装备栏");
            Check(hero.Bag.MaxWeight == db.Balance.playerMaxWeight,
                "负重上限来自 balance.json（" + hero.Bag.MaxWeight + "）");
            Check(hero.Bag.UsedSlots > 0, "新手包里有 " + hero.Bag.UsedSlots + " 格东西");

            int baseDc = hero.MinDc;
            int swordIdx = hero.Bag.IndexOf("wp_wood");
            Check(swordIdx >= 0, "新手包里有木剑");
            if (swordIdx >= 0)
            {
                Simulation gearSim = new Simulation(arena, 4242u, null, tuning, db.Items);
                Check(ItemSystem.Equip(gearSim.World, hero, swordIdx, db.Items), "能把木剑穿上");
                Check(hero.MinDc > baseDc, "攻击力从 " + baseDc + " 提升到 " + hero.MinDc);
                ItemInstance worn = hero.Gear.Get(EquipSlot.Weapon);
                Check(worn != null && worn.Count == 1, "装备栏里的数量正确（" + (worn != null ? worn.Count : -1) + "）");
                Check(ItemSystem.Unequip(gearSim.World, hero, EquipSlot.Weapon, db.Items), "能把木剑卸下");
                Check(hero.MinDc == baseDc, "卸下后属性回到 " + hero.MinDc);
            }

            // 用真实物品表跑一次拾取
            World lootWorld = new World(arena, 777u, new EventBus());
            lootWorld.Systems.Add(new LootSystem(db.Items));
            Entity picker = db.CreatePlayer();
            picker.Pos = arena.Spawn;
            picker.HomePos = picker.Pos;
            lootWorld.Spawn(picker);
            lootWorld.Player = picker;

            int picked = 0;
            lootWorld.Events.Subscribe<ItemPicked>(delegate(ItemPicked e) { picked++; });

            ItemDef hideDef = db.Items.Get("mat_hide");
            Check(hideDef != null, "items.json 里有 mat_hide");
            if (hideDef != null)
            {
                Entity ground = new Entity();
                ground.Kind = EntityKind.GroundItem;
                ground.DefId = "mat_hide";
                ground.SpriteId = "mat_hide";
                ground.BlocksTile = false;
                ground.Count = 2;
                ground.Pos = arena.FindNearestWalkable(new TilePos(picker.Pos.X + 1, picker.Pos.Y), 8);
                ground.HomePos = ground.Pos;
                lootWorld.Spawn(ground);

                lootWorld.PlaceEntity(picker, ground.Pos);
                lootWorld.Step(new List<Intent>());
                Check(picked == 1 && picker.Bag.IndexOf("mat_hide") >= 0, "踩上去把兽皮捡进背包");
                Check(picker.Bag.WeightOf(db.Items) > 0, "背包重量随拾取增长");
            }

            // 键盘操作的成败取决于 Player Settings，这里用编译期宏直接断言，
            // 免得出现「能跑但按键盘没反应」这种最难查的情况。
#if ENABLE_LEGACY_INPUT_MANAGER
            Check(true, "旧输入已启用（ENABLE_LEGACY_INPUT_MANAGER）");
#else
            Check(false, "旧输入未启用：Project Settings > Player > Other Settings 的 Active Input Handling 要改成 Both，否则键盘没反应");
#endif

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
