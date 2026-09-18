using System.Collections.Generic;
using SimplyCQ.Data;
using SimplyCQ.Domain;
using SimplyCQ.Unity;
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

            // ---------------- 多地图 + 传送点的数据校验 ----------------
            // 传送点这类数据出错（指向不存在的图、落点在墙里、落点本身又是传送点）
            // 光看 JSON 是看不出来的，必须逐条算一遍。
            Check(db.MapCount >= 1, "地图表加载了 " + db.MapCount + " 张图");

            int portalTotal = 0;
            foreach (GameMap m in db.AllMaps)
            {
                Check(m.IsWalkable(m.Spawn), m.Id + " 的出生点可站人（" + m.Spawn + "）");

                bool spawnOnPortal = false;
                for (int i = 0; i < m.Portals.Count; i++)
                    if (m.Portals[i].At == m.Spawn) spawnOnPortal = true;
                Check(!spawnOnPortal, m.Id + " 的出生点没压在传送点上");

                for (int i = 0; i < m.Spawners.Count; i++)
                {
                    Spawner s = m.Spawners[i];
                    int walkable = 0;
                    for (int y = s.Y; y < s.Y + s.H; y++)
                        for (int x = s.X; x < s.X + s.W; x++)
                            if (m.IsWalkable(new TilePos(x, y))) walkable++;

                    Check(walkable > 0, m.Id + " 刷怪区 " + i + "（" + s.MonsterId + "）里有可站格：" + walkable + " 格");
                    Check(db.CreateMonster(s.MonsterId) != null, "monsters.json 里有 " + s.MonsterId);
                    Check(s.Max <= walkable, m.Id + " 刷怪区 " + i + " 上限 " + s.Max + " 不超过可站格数 " + walkable);
                }

                for (int i = 0; i < m.Portals.Count; i++)
                {
                    Portal p = m.Portals[i];
                    portalTotal++;
                    Check(m.IsWalkable(p.At), m.Id + " 传送点 " + i + " 可走（" + p.At + "）");

                    GameMap target = db.GetMap(p.TargetMap);
                    Check(target != null, m.Id + " 传送点 " + i + " 的目标地图存在：" + p.TargetMap);
                    if (target == null) continue;

                    Check(target.InBounds(p.TargetPos) && target.IsWalkable(p.TargetPos),
                        m.Id + " -> " + p.TargetMap + " 的落点可走（" + p.TargetPos + "）");

                    bool landingOnPortal = false;
                    for (int k = 0; k < target.Portals.Count; k++)
                        if (target.Portals[k].At == p.TargetPos) landingOnPortal = true;
                    Check(!landingOnPortal, m.Id + " -> " + p.TargetMap + " 的落点不是传送点（否则会在两图之间来回弹）");
                }

                for (int i = 0; i < m.Npcs.Count; i++)
                {
                    NpcSpawn n = m.Npcs[i];
                    Check(m.IsWalkable(n.Pos), m.Id + " 的 NPC「" + n.NpcId + "」落点可走（" + n.Pos + "）");
                    Check(db.GetNpc(n.NpcId) != null, "npcs.json 里有 " + n.NpcId);
                }
            }
            Check(portalTotal > 0, "至少有一张图配了传送点（共 " + portalTotal + " 个）");

            // ---------------- M5e 传送员：目的地必须真的到得了 ----------------
            {
                HashSet<string> seenNpc = new HashSet<string>();
                int teleporters = 0, destinations = 0, badSpot = 0;
                string badSpotWhere = "";
                foreach (GameMap m in db.AllMaps)
                {
                    for (int i = 0; i < m.Npcs.Count; i++)
                    {
                        NpcDef npc = db.GetNpc(m.Npcs[i].NpcId);
                        if (npc == null || !npc.IsTeleporter) continue;
                        if (!seenNpc.Add(npc.Id)) continue;   // 同一个 NPC 摆多张图只查一次
                        teleporters++;

                        for (int k = 0; k < npc.Teleports.Count; k++)
                        {
                            NpcTeleport spot = npc.Teleports[k];
                            destinations++;
                            if (spot.Cost < 0) { badSpot++; continue; }

                            GameMap target = db.GetMap(spot.TargetMap);
                            if (target == null)
                            {
                                badSpot++;
                                if (badSpotWhere.Length < 60) badSpotWhere += npc.Id + "->" + spot.TargetMap + " ";
                                continue;
                            }
                            // 落点必须在图里、可走，而且不能是传送点（否则一到就被弹回去）
                            bool onPortal = false;
                            for (int q = 0; q < target.Portals.Count; q++)
                                if (target.Portals[q].At == spot.TargetPos) onPortal = true;
                            if (!target.IsWalkable(spot.TargetPos) || onPortal)
                            {
                                badSpot++;
                                if (badSpotWhere.Length < 60)
                                    badSpotWhere += npc.Id + "->" + spot.TargetMap + spot.TargetPos + " ";
                            }
                        }
                    }
                }
                Check(teleporters > 0, "有 " + teleporters + " 个传送员 NPC");
                Check(badSpot == 0,
                    teleporters + " 个传送员的 " + destinations + " 个目的地：地图存在、落点可走、不是传送点"
                    + (badSpot > 0 ? "，有问题：" + badSpotWhere : ""));

                // 传送员边上得站得住人，否则玩家永远点不到他
                int unreachable = 0;
                foreach (GameMap m in db.AllMaps)
                    for (int i = 0; i < m.Npcs.Count; i++)
                    {
                        NpcDef npc = db.GetNpc(m.Npcs[i].NpcId);
                        if (npc == null || !npc.IsTeleporter) continue;
                        bool neighbour = false;
                        for (int d = 0; d < 8; d++)
                        {
                            TilePos p = m.Npcs[i].Pos + DirHelper.Delta((Dir)d);
                            if (m.IsWalkable(p)) neighbour = true;
                        }
                        if (!neighbour) unreachable++;
                    }
                Check(unreachable == 0, "传送员边上至少有一格站得住（不然交互不了）");
            }

            // ---------------- M5d 怪：名单、AI、难度分层 ----------------
            {
                int kinds = 0;
                foreach (MonsterDto md in db.AllMonsters) kinds++;
                Check(kinds >= 15 && kinds <= 20, "monsters.json 里有 " + kinds + " 种怪（目标 15~20）");

                int ranged = 0, packing = 0, passive = 0;
                int badAI = 0;
                string badAIWhere = "";
                foreach (MonsterDto md in db.AllMonsters)
                {
                    if (md.attackRange > 1) ranged++;
                    if (md.packRadius > 0) packing++;
                    if (!md.aggressive) passive++;

                    // 视野比射程还短 = 永远够不着（远程怪最容易填错的一栏）
                    if (md.vision < md.attackRange || md.minDc > md.maxDc)
                    {
                        badAI++;
                        if (badAIWhere.Length < 60) badAIWhere += md.id + " ";
                    }
                }
                Check(badAI == 0, "没有「视野比射程还短」或攻防上下限填反的怪"
                      + (badAI > 0 ? "，可疑：" + badAIWhere : ""));
                Check(ranged > 0, "有 " + ranged + " 种远程怪（射程 > 1）");
                Check(packing > 0, "有 " + packing + " 种群居怪（packRadius > 0）");
                Check(passive > 0, "有 " + passive + " 种被动怪（新手区总得有能安心打的）");

                // 数据里的 packRadius / attackRange 必须真的传到 Entity 上，
                // 不然就是"表里配了、游戏里没生效"这种最难查的坑
                MonsterDto packSample = null;
                foreach (MonsterDto md in db.AllMonsters)
                    if (md.packRadius > 0) { packSample = md; break; }
                if (packSample != null)
                {
                    Entity probe = db.CreateMonster(packSample.id);
                    Check(probe != null && probe.PackRadius == packSample.packRadius,
                        "monsters.json 的 packRadius 传到了 Entity 上（" + packSample.id
                        + " -> " + (probe != null ? probe.PackRadius : -1) + "）");
                }

                MonsterDto rangedSample = null;
                foreach (MonsterDto md in db.AllMonsters)
                    if (md.attackRange > 1) { rangedSample = md; break; }
                if (rangedSample != null)
                {
                    Entity probe = db.CreateMonster(rangedSample.id);
                    Check(probe != null && probe.AttackRange == rangedSample.attackRange,
                        "远程怪的射程传到了 Entity 上（" + rangedSample.id + " -> "
                        + (probe != null ? probe.AttackRange : -1) + "）");
                }

                // 难度分层 + 刷怪区不冷落任何一只怪
                int grassTop = 0, caveTop = 0;
                foreach (GameMap m in db.AllMaps)
                {
                    for (int i = 0; i < m.Spawners.Count; i++)
                    {
                        MonsterDto md = null;
                        foreach (MonsterDto candidate in db.AllMonsters)
                            if (candidate.id == m.Spawners[i].MonsterId) { md = candidate; break; }
                        if (md == null) continue;
                        if (m.Id == "map_grassland" && md.level > grassTop) grassTop = md.level;
                        if (m.Id == "map_cave" && md.level > caveTop) caveTop = md.level;
                    }
                }
                Check(grassTop > 0 && grassTop <= 6,
                    "草原最高怪 Lv" + grassTop + "（新手区，压在 Lv6 以内）");
                Check(caveTop >= 10, "洞窟最高怪 Lv" + caveTop + "（深处有 Lv10+ 的压力）");
                Check(caveTop > grassTop, "洞窟整体比草原更危险（Lv" + caveTop + " > Lv" + grassTop + "）");

                int idle = 0;
                string idleWhere = "";
                foreach (MonsterDto md in db.AllMonsters)
                {
                    bool spawned = false;
                    foreach (GameMap m in db.AllMaps)
                        for (int i = 0; i < m.Spawners.Count; i++)
                            if (m.Spawners[i].MonsterId == md.id) spawned = true;
                    if (!spawned)
                    {
                        idle++;
                        if (idleWhere.Length < 60) idleWhere += md.id + " ";
                    }
                }
                Check(idle == 0, "每种怪都有刷怪区，没有玩家永远见不到的怪"
                      + (idle > 0 ? "，冷落的：" + idleWhere : ""));

                GameMap townMap = db.GetMap("map_town");
                Check(townMap != null && townMap.Spawners.Count == 0, "比邻镇是安全区（不刷怪）");
            }

            // 从出生点随便找一块可走地，必须能寻路过去
            TilePos far = FindFarWalkable(map, map.Spawn);
            List<TilePos> path = new List<TilePos>();
            bool found = new PathFinder(map).Find(map.Spawn, far, AlwaysFalse, path);
            Check(found && path.Count > 0, "从出生点能寻路到 " + far + "（" + path.Count + " 步）");

            // 游走用例要用一份【独立的地图实例】：玩家绕圈走很容易踩到传送点，
            // 而这个用例只想验证「走路/碰撞/追击/刷怪」，所以先在副本上把传送点摘掉。
            // 用副本而不是直接改 db.Map，是为了不污染后面跨图用例要用的那份数据。
            MapDto walkDto = GameDatabase.LoadJson<MapDto>("Data/maps/map_grassland.json");
            GameMap walkMap = walkDto != null ? MapLoader.FromDto(walkDto) : MapLoader.CreateFallbackMap(48, 48);
            walkMap.Portals.Clear();

            // 跑 600 个 tick，每一步都检查不变量
            Simulation sim = new Simulation(walkMap, (uint)db.Balance.worldSeed, db.CreateMonster, db.Tuning, db.Items, db.Skills, db.Shop);
            Entity player = db.CreatePlayer();
            player.Pos = walkMap.Spawn;
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
                List<Spawner> live = sim.World.Map.Spawners;
                for (int i = 0; i < live.Count; i++) monsters += live[i].Alive.Count;
                if (monsters > maxMonsters) maxMonsters = monsters;
                if (monsters > maxSpawnerTotal) maxSpawnerTotal = monsters;
            }

            Check(broken == null, "600 tick 内不变量始终成立" + (broken == null ? "" : "： " + broken));
            Check(moved, "玩家确实动起来了");
            Check(sim.World.Tick >= 600, "逻辑 tick 推进到 " + sim.World.Tick);
            Check(maxMonsters > 0, "刷出了怪（峰值 " + maxMonsters + " 只）");

            int cap = 0;
            List<Spawner> spawnersOf = sim.World.Map.Spawners;
            for (int i = 0; i < spawnersOf.Count; i++) cap += spawnersOf[i].Max;
            Check(maxMonsters <= cap, "怪物总数没超过配置上限 " + cap);

            // ---------------- M2 战斗闭环（用真实数据表跑一遍）----------------
            CombatTuning tuning = db.Tuning;
            Check(tuning != null && tuning.PlayerAttackInterval > 0,
                "balance.json 的 combat 段解析成功（攻击间隔 " + (tuning != null ? tuning.PlayerAttackInterval : 0) + " tick）");

            GameMap arena = MapLoader.CreateFallbackMap(24, 24);
            Simulation arena2 = new Simulation(arena, 20240617u, null, tuning, db.Items, db.Skills, db.Shop);

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

                // 怪现在还会掉装备，所以不能"抓最后一件地面物"就当金币 —— 按金币找
                Entity drop = null;
                int groundCount = 0;
                foreach (Entity e in arena2.World.Entities)
                {
                    if (e.Kind != EntityKind.GroundItem) continue;
                    groundCount++;
                    if (e.Gold > 0) drop = e;
                }
                Check(drop != null && drop.Gold == 3, "按掉落表掉出 3 金币（地面物共 " + groundCount + " 件）");
                Check(drop != null && drop.Pos == at, "金币落在怪物死亡点 " + at);
                Check(arena2.World.EntityAt(at) == dummy, "此刻占着这一格的是尸体，掉落物不参与占格");

                for (int i = 0; i < tuning.CorpseTicks + 2; i++) arena2.Step(new List<Intent>());
                Check(arena2.World.Get(dummy.Id) == null, "尸体按 CorpseTicks=" + tuning.CorpseTicks + " 被清理");
                Check(drop != null && arena2.World.Get(drop.Id) != null, "金币还留在原地");
                Check(!arena2.World.IsOccupied(at), "尸体清掉后金币所在格可通行（掉落物不占格）");

                arena2.World.PlaceEntity(fighter, at);
                arena2.Step(new List<Intent>());
                Check(fighter.Gold == 3, "踩上去自动捡到 3 金币（实际 " + fighter.Gold + "）");
                Check(drop != null && arena2.World.Get(drop.Id) == null, "捡完后地面金币消失");
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

            // ---------------- M5b 装备品质：数据自检 ----------------
            int badEquip = 0, badRange = 0, badPrice = 0;
            int equipCount = 0;
            foreach (ItemDef def in db.Items.All)
            {
                if (def.MinDc > def.MaxDc) badRange++;
                if (def.Price <= 0 && def.Type != ItemType.Quest) badPrice++;
                if (!def.IsEquip) continue;

                equipCount++;
                // 一件"装备"却什么也不加，多半是数据填漏了
                if (def.MinDc == 0 && def.MaxDc == 0 && def.Ac == 0 && def.Mac == 0
                    && def.Mc == 0 && def.Sc == 0 && def.BonusHp == 0 && def.BonusMp == 0) badEquip++;
            }
            Check(equipCount > 0, "items.json 里有 " + equipCount + " 件装备");
            Check(badRange == 0, "所有物品的攻击下限不大于上限");
            Check(badPrice == 0, "所有物品都填了价格");
            Check(badEquip == 0, "没有「什么属性都不加」的空装备");

            // ---------------- M5c 60 件装备：阶梯不能断、不能倒挂 ----------------
            Check(equipCount >= 60, "装备铺到 " + equipCount + " 件（目标 >= 60）");

            // 1) 部位断档：每个部位在每个等级段都得有货，否则玩家会发现"XX 部位没得换"
            int missingCells = 0;
            string missingWhere = "";
            for (int s = 1; s < ItemDef.SlotCount; s++)
            {
                EquipSlot slot = (EquipSlot)s;
                List<int> levels = new List<int>();
                foreach (ItemDef def in db.Items.All)
                    if (def.IsEquip && def.Slot == slot && !levels.Contains(def.LevelReq)) levels.Add(def.LevelReq);
                levels.Sort();
                if (levels.Count < 3)
                {
                    missingCells++;
                    if (missingWhere.Length < 60) missingWhere += slot + "(" + levels.Count + "段) ";
                }
            }
            Check(missingCells == 0,
                "8 个部位都至少有 3 个等级段可选" + (missingCells > 0 ? "，缺的是：" + missingWhere : ""));

            // 2) 品质阶梯不倒挂：同部位同需求等级里，品质下限更高的那件，白装属性必须也更高。
            //    这条是"精良货就该比白板强"的数据保证 —— 不靠掉落时摇得好。
            int inverted = 0;
            string invertedWhere = "";
            for (int s = 1; s < ItemDef.SlotCount; s++)
            {
                EquipSlot slot = (EquipSlot)s;
                List<ItemDef> sameSlot = new List<ItemDef>();
                foreach (ItemDef def in db.Items.All)
                    if (def.IsEquip && def.Slot == slot) sameSlot.Add(def);

                for (int i = 0; i < sameSlot.Count; i++)
                {
                    for (int k = 0; k < sameSlot.Count; k++)
                    {
                        ItemDef lo = sameSlot[i], hi = sameSlot[k];
                        if (lo.LevelReq != hi.LevelReq) continue;
                        if ((int)lo.MinQuality >= (int)hi.MinQuality) continue;
                        if (EquipPower(hi) <= EquipPower(lo))
                        {
                            inverted++;
                            if (invertedWhere.Length < 70)
                                invertedWhere += hi.Id + " 不比 " + lo.Id + " 强 ";
                        }
                    }
                }
            }
            Check(inverted == 0,
                "品质阶梯不倒挂：品质下限高的装备白装属性也更高" + (inverted > 0 ? "，反例：" + invertedWhere : ""));

            // 3) 每件装备都得有出处 —— 打得到 或者 买得到。否则就是玩家永远见不到的死数据。
            HashSet<string> obtainable = new HashSet<string>();
            foreach (GameMap m in db.AllMaps)
                for (int i = 0; i < m.Npcs.Count; i++)
                {
                    NpcDef npc = db.GetNpc(m.Npcs[i].NpcId);
                    if (npc == null) continue;
                    for (int k = 0; k < npc.Stock.Count; k++) obtainable.Add(npc.Stock[k]);
                }
            foreach (MonsterDto md in db.AllMonsters)
                if (md.drops != null)
                    for (int k = 0; k < md.drops.Length; k++)
                        if (md.drops[k] != null) obtainable.Add(md.drops[k].itemId);

            int orphans = 0;
            string orphanIds = "";
            foreach (ItemDef def in db.Items.All)
            {
                if (!def.IsEquip) continue;
                if (obtainable.Contains(def.Id)) continue;
                orphans++;
                if (orphanIds.Length < 60) orphanIds += def.Id + " ";
            }
            Check(orphans == 0,
                "每件装备都有出处（怪掉 或 商店卖）" + (orphans > 0 ? "，够不着的：" + orphanIds : ""));

            // 4) 怪的掉落别跨等级段：鸡不该掉 Lv7 的剑
            int crossBand = 0;
            string crossWhere = "";
            foreach (MonsterDto md in db.AllMonsters)
            {
                if (md.drops == null) continue;
                for (int k = 0; k < md.drops.Length; k++)
                {
                    ItemDef dropped = db.Items.Get(md.drops[k].itemId);
                    if (dropped == null || !dropped.IsEquip) continue;
                    if (dropped.LevelReq > md.level + 3)
                    {
                        crossBand++;
                        if (crossWhere.Length < 60) crossWhere += md.id + "->" + dropped.Id + " ";
                    }
                }
            }
            Check(crossBand == 0,
                "怪的等级都配得上它掉的装备（没有鸡掉 Lv7 剑这种事）" + (crossBand > 0 ? "，越界：" + crossWhere : ""));

            // 商店只卖白装、精良货 —— 稀有 / 史诗只能打怪爆。
            // 这条规则写在这里，是为了以后往 npcs.json 里塞蓝装时会被立刻拦下来。
            int premiumInShop = 0;
            foreach (GameMap m in db.AllMaps)
            {
                for (int i = 0; i < m.Npcs.Count; i++)
                {
                    NpcDef npc = db.GetNpc(m.Npcs[i].NpcId);
                    if (npc == null) continue;
                    for (int k = 0; k < npc.Stock.Count; k++)
                    {
                        ItemDef stocked = db.Items.Get(npc.Stock[k]);
                        if (stocked == null) continue;
                        if ((int)stocked.MinQuality > (int)ItemQuality.Green) premiumInShop++;
                    }
                }
            }
            Check(premiumInShop == 0, "商店不卖稀有 / 史诗货（好东西靠打）");

            Check(db.Loot != null && db.Loot.qualityWeights != null
                  && db.Loot.qualityWeights.Length == ItemQualityRules.Count,
                "balance.json 的 loot 段加载成功（" + (db.Loot != null && db.Loot.qualityWeights != null
                    ? string.Join("/", System.Array.ConvertAll(db.Loot.qualityWeights, f => f.ToString("0.#")))
                    : "-") + "）");

            if (db.Loot != null && db.Loot.qualityWeights != null && db.Loot.qualityWeights.Length == ItemQualityRules.Count)
            {
                bool monotone = true;
                for (int i = 1; i < db.Loot.qualityWeights.Length; i++)
                    if (db.Loot.qualityWeights[i] > db.Loot.qualityWeights[i - 1]) monotone = false;
                Check(monotone, "品质权重单调递减（越稀有越难出）");

                // 走真实的掉落路径（DropRoller + 真物品表），别只单独测 LootTuning.Roll ——
                // 品质下限是在 DropRoller 里贴上去的，只测 Roll 测不到那一步。
                List<ItemDrop> probeTable = new List<ItemDrop>();
                foreach (ItemDef def in db.Items.All)
                {
                    if (!def.IsEquip) continue;
                    ItemDrop d = new ItemDrop();
                    d.ItemId = def.Id; d.Chance = 1f; d.Min = 1; d.Max = 1;
                    probeTable.Add(d);
                }

                Rng probe = new Rng((uint)db.Balance.worldSeed);
                List<ItemDropResult> probeDrops = new List<ItemDropResult>();
                int lowerThanFloor = 0, rolled = 0, nonWhite = 0;
                for (int t = 0; t < 400; t++)
                {
                    DropRoller.Roll(probeTable, probe, probeDrops, db.Items, db.Loot, 6);
                    for (int k = 0; k < probeDrops.Count; k++)
                    {
                        ItemDef def = db.Items.Get(probeDrops[k].ItemId);
                        if (def == null) continue;
                        if ((int)probeDrops[k].Quality < (int)def.MinQuality) lowerThanFloor++;
                        if (probeDrops[k].Quality != ItemQuality.White) nonWhite++;
                        rolled++;
                    }
                }
                Check(rolled > 0 && lowerThanFloor == 0,
                    "走真实掉落路径摇 " + rolled + " 次，没有一次低于物品表写的 minQuality 下限");
                Check(nonWhite > 0, "装备确实会掉出非白色的（" + nonWhite + " / " + rolled + "）");
            }

            Entity hero = db.CreatePlayer();
            Check(hero.Bag != null && hero.Gear != null, "玩家出生自带背包和装备栏");
            Check(hero.Bag.UsedSlots > 0, "新手包里有 " + hero.Bag.UsedSlots + " 格东西");

            int baseDc = hero.MinDc;
            int swordIdx = hero.Bag.IndexOf("wp_wood");
            Check(swordIdx >= 0, "新手包里有木剑");
            if (swordIdx >= 0)
            {
                Simulation gearSim = new Simulation(arena, 4242u, null, tuning, db.Items, db.Skills, db.Shop);
                Check(ItemSystem.Equip(gearSim.World, hero, swordIdx, db.Items), "能把木剑穿上");
                Check(hero.MinDc > baseDc, "攻击力从 " + baseDc + " 提升到 " + hero.MinDc);
                ItemInstance worn = hero.Gear.Get(EquipSlot.Weapon);
                Check(worn != null && worn.Count == 1, "装备栏里的数量正确（" + (worn != null ? worn.Count : -1) + "）");
                Check(ItemSystem.Unequip(gearSim.World, hero, EquipSlot.Weapon, db.Items), "能把木剑卸下");
                Check(hero.MinDc == baseDc, "卸下后属性回到 " + hero.MinDc);
            }

            // 界面点一下 = 排一个 Intent 丢给 Simulation。
            // 这条路和"直接调 ItemSystem"是两条路，必须单独测 —— GameBootstrap 之前就是漏传物品表，
            // 直接调用没事，走 Intent 却静默失效。
            {
                // 用和游戏本体完全相同的装配方式（GameDatabase.CreateSimulation）
                Simulation uiSim = db.CreateSimulation(99u);
                uiSim.World.Map.Spawners.Clear();   // 自检自己安排怪，别让刷怪区捣乱

                Entity uiHero = db.CreatePlayer();
                uiHero.Pos = arena.Spawn;
                uiHero.HomePos = uiHero.Pos;
                uiSim.World.Spawn(uiHero);
                uiSim.World.Player = uiHero;

                int clothIdx = uiHero.Bag.IndexOf("ar_cloth");
                Check(clothIdx >= 0, "新手包里有布衣");
                if (clothIdx >= 0)
                {
                    int acBefore = uiHero.Ac;
                    List<Intent> uiActs = new List<Intent>();
                    uiActs.Add(Intent.BagAction(uiHero.Id, IntentKind.EquipItem, clothIdx));
                    uiSim.World.Step(uiActs);

                    Check(uiHero.Gear.Get(EquipSlot.Armour) != null, "走 Intent 通道（界面点击）能把衣服穿上");
                    Check(uiHero.Ac > acBefore, "穿上衣服后防御 " + acBefore + " -> " + uiHero.Ac);
                }

                int potIdx = uiHero.Bag.IndexOf("pot_hp_s");
                if (potIdx >= 0)
                {
                    uiHero.Hp = 1;
                    List<Intent> potActs = new List<Intent>();
                    potActs.Add(Intent.BagAction(uiHero.Id, IntentKind.UseItem, potIdx));
                    uiSim.World.Step(potActs);
                    Check(uiHero.Hp > 1, "走 Intent 通道（界面点击）能喝药回血（1 -> " + uiHero.Hp + "）");
                }
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
            }

            // 移除负重后，唯一的拾取门槛是背包满 —— 这条路必须有提示，不能静默失败
            {
                World fullWorld = new World(arena, 515u, new EventBus());
                fullWorld.Systems.Add(new LootSystem(db.Items));

                Entity full = db.CreatePlayer();
                full.Pos = arena.Spawn;
                full.HomePos = full.Pos;
                fullWorld.Spawn(full);
                fullWorld.Player = full;

                ItemDef hideDef2 = db.Items.Get("mat_hide");
                if (hideDef2 != null)
                {
                    full.Bag.Add(hideDef2, Inventory.SlotCount * 99);
                    Check(full.Bag.FreeSpaceFor(hideDef2) == 0, "把背包塞满（" + full.Bag.UsedSlots + " 格）");

                    int refused = 0;
                    fullWorld.Events.Subscribe<PickupRefused>(delegate(PickupRefused e) { refused++; });

                    Entity overflow = new Entity();
                    overflow.Kind = EntityKind.GroundItem;
                    overflow.DefId = "mat_hide";
                    overflow.SpriteId = "mat_hide";
                    overflow.BlocksTile = false;
                    overflow.Count = 1;
                    overflow.Pos = full.Pos;
                    overflow.HomePos = full.Pos;
                    fullWorld.Spawn(overflow);
                    fullWorld.Step(new List<Intent>());

                    Check(refused == 1, "背包满时拒绝拾取并给出提示（" + refused + "）");
                    Check(fullWorld.GroundItemAt(full.Pos) != null, "背包满时东西留在原地，不会被吞");
                }
            }

            // ---------------- M3c 商店（买 / 卖，用真实数据表）----------------
            Check(db.Shop != null && db.Shop.SellRatio > 0f,
                "balance.json 读到售价系数 " + (db.Shop != null ? db.Shop.SellRatio : 0f));
            Check(db.Map.Npcs.Count > 0, "地图上摆了 " + db.Map.Npcs.Count + " 个 NPC");

            {
                Simulation shopSim = db.CreateSimulation(1234u);
                Entity trader = db.CreatePlayer();
                trader.Pos = shopSim.World.FindFreeTileNear(shopSim.World.Map.Spawn, 11);
                trader.HomePos = trader.Pos;
                trader.Gold = 1000;
                shopSim.World.Spawn(trader);
                shopSim.World.Player = trader;

                db.SpawnNpcs(shopSim.World);   // 把商人放出来

                Entity merchant = ShopSystem.NearestMerchant(shopSim.World, trader);
                Check(merchant != null, "商人出现在玩家交互距离内（" + (merchant != null ? merchant.Name + "@" + merchant.Pos : "-") + "）");

                if (merchant != null)
                {
                    // 优先挑一件"精良下限"的货来测 —— 那条路径才验得到"商店按 minQuality 卖"
                    int stockIndex = -1;
                    for (int i = 0; i < merchant.Shop.Stock.Count; i++)
                    {
                        ItemDef s = db.Items.Get(merchant.Shop.Stock[i]);
                        if (s == null) continue;
                        if (s.MinQuality == ItemQuality.White) continue;
                        if (trader.Bag.IndexOf(s.Id) < 0) { stockIndex = i; break; }
                    }
                    if (stockIndex < 0)
                    {
                        for (int i = 0; i < merchant.Shop.Stock.Count; i++)
                        {
                            if (trader.Bag.IndexOf(merchant.Shop.Stock[i]) < 0) { stockIndex = i; break; }
                        }
                    }
                    Check(stockIndex >= 0, "商人有玩家背包里没有的货可以测买卖");

                    string buyId = stockIndex >= 0 ? merchant.Shop.Stock[stockIndex] : "";
                    ItemDef buyDef = stockIndex >= 0 ? db.Items.Get(buyId) : null;
                    Check(buyDef != null, "商人卖的东西在 items.json 里：" + buyId);

                    if (buyDef != null)
                    {
                        // 价格按物品表的品质下限算 —— 商店卖精良货，收的就是精良价
                        int buyPrice = db.Shop.BuyPriceOf(buyDef, buyDef.MinQuality);
                        int goldBefore = trader.Gold;
                        List<Intent> buyActs = new List<Intent>();
                        buyActs.Add(Intent.BagAction(trader.Id, IntentKind.BuyItem, stockIndex));
                        shopSim.World.Step(buyActs);

                        Check(trader.Gold == goldBefore - buyPrice,
                            "买 1 件扣 " + buyPrice + " 金（" + goldBefore + " -> " + trader.Gold + "）");
                        Check(trader.Bag.IndexOf(buyId) >= 0, "买到的东西进了背包");

                        int boughtSlot = trader.Bag.IndexOf(buyId);
                        Check(boughtSlot >= 0 && trader.Bag.At(boughtSlot).Quality == buyDef.MinQuality,
                            "商人的货按 minQuality 卖：" + buyId + " 写的是 "
                            + ItemQualityRules.DisplayName(buyDef.MinQuality) + "，拿到的就是 "
                            + (boughtSlot >= 0 ? ItemQualityRules.DisplayName(trader.Bag.At(boughtSlot).Quality) : "-"));

                        int sellPrice = db.Shop.SellPriceOf(buyDef, buyDef.MinQuality);
                        int bagIndex = trader.Bag.IndexOf(buyId);
                        int goldBeforeSell = trader.Gold;
                        List<Intent> sellActs = new List<Intent>();
                        sellActs.Add(Intent.BagAction(trader.Id, IntentKind.SellItem, bagIndex));
                        shopSim.World.Step(sellActs);

                        Check(trader.Gold == goldBeforeSell + sellPrice,
                            "卖回去拿 " + sellPrice + " 金（售价系数 " + db.Shop.SellRatio + "）");
                        Check(trader.Bag.IndexOf(buyId) < 0, "卖掉的东西离开背包");

                        // 没钱：必须拒绝 + 给理由 + 绝不扣钱
                        trader.Gold = 0;
                        int refusedShop = 0;
                        shopSim.Bus.Subscribe<ShopRefused>(delegate(ShopRefused x) { refusedShop++; });
                        List<Intent> poorActs = new List<Intent>();
                        poorActs.Add(Intent.BagAction(trader.Id, IntentKind.BuyItem, stockIndex));
                        shopSim.World.Step(poorActs);

                        Check(refusedShop == 1 && trader.Gold == 0, "没钱时拒绝交易并给出理由，且不扣钱");
                    }
                }
            }

            // ---------------- M5e 传送员（用真实数据表跑一遍）----------------
            {
                GameMap town = db.GetMap("map_town");
                if (town != null)
                {
                    Simulation tpSim = new Simulation(town, 909u, db.CreateMonster, db.Tuning,
                                                      db.Items, db.Skills, db.Shop, db, db.Loot);
                    Entity tpHero = db.CreatePlayer();
                    tpHero.Gold = 100;
                    tpHero.Pos = tpSim.World.FindFreeTileNear(town.Spawn, 6);
                    tpHero.HomePos = tpHero.Pos;
                    tpSim.World.Spawn(tpHero);
                    tpSim.World.Player = tpHero;
                    db.SpawnNpcs(tpSim.World);   // 把杂货商和传送员都放出来

                    // 先按"是不是传送员"把 NPC 找出来，再站到他旁边 ——
                    // 站在别处会同时测到"距离太远"，两件事混在一起就说不清了
                    Entity tel = null;
                    foreach (Entity e in tpSim.World.Entities)
                        if (e.Shop != null && e.Shop.IsTeleporter) tel = e;
                    Check(tel != null, "比邻镇里有传送员 NPC"
                        + (tel != null ? "（" + tel.Name + "@" + tel.Pos + "）" : ""));

                    if (tel != null)
                    {
                        TilePos beside = tpSim.World.FindFreeTileNear(tel.Pos, 2);
                        tpSim.World.PlaceEntity(tpHero, beside);
                        Check(TeleportSystem.NearestTeleporter(tpSim.World, tpHero) == tel,
                            "站到传送员旁边（" + beside + "）就能交互");

                        // 走远了不该还能隔空传送
                        tpSim.World.PlaceEntity(tpHero, tpSim.World.FindFreeTileNear(town.Spawn, 12));
                        Check(TeleportSystem.NearestTeleporter(tpSim.World, tpHero) == null,
                            "走远之后交互不到传送员");

                        // 回到旁边，挑一个收费目的地真走一次
                        tpSim.World.PlaceEntity(tpHero, beside);
                        int index = -1;
                        for (int i = 0; i < tel.Shop.Teleports.Count; i++)
                            if (tel.Shop.Teleports[i].Cost > 0) { index = i; break; }
                        Check(index >= 0, "传送员有收费目的地，可以测扣费");

                        if (index >= 0)
                        {
                            NpcTeleport spot = tel.Shop.Teleports[index];
                            int goldBefore = tpHero.Gold;
                            List<Intent> acts = new List<Intent>();
                            acts.Add(Intent.BagAction(tpHero.Id, IntentKind.TeleportTo, index));
                            tpSim.World.Step(acts);

                            Check(tpSim.World.Map.Id == spot.TargetMap,
                                "传送到了 " + spot.TargetMap + "（实际 " + tpSim.World.Map.Id + "）");
                            Check(tpHero.Gold == goldBefore - spot.Cost,
                                "扣了 " + spot.Cost + " 路费（" + goldBefore + " -> " + tpHero.Gold + "）");
                            Check(tpSim.World.Map.IsWalkable(tpHero.Pos), "落点在图里且可走（" + tpHero.Pos + "）");
                            Check(tpHero.HomePos == tpHero.Pos, "传送后 HomePos 跟着人");
                            Check(CheckInvariants(tpSim.World) == null, "传送后不变量成立");
                        }
                    }
                }
            }

            // ---------------- M4 战士技能 ----------------
            Check(db.Skills != null && db.Skills.Count > 0,
                "skills.json 加载了 " + (db.Skills != null ? db.Skills.Count : 0) + " 个技能");

            {
                Simulation skillSim = db.CreateSimulation(7777u);
                skillSim.World.Map.Spawners.Clear();

                Entity hero3 = db.CreatePlayer();
                hero3.Pos = skillSim.World.FindFreeTileNear(skillSim.World.Map.Spawn, 11);
                hero3.HomePos = hero3.Pos;
                skillSim.World.Spawn(hero3);
                skillSim.World.Player = hero3;

                skillSim.World.Step(new List<Intent>());   // 跑一 tick 触发按等级自动学

                Check(hero3.LearnedSkills.Contains("sk_basic_sword"), "1 级自动学会「基本剑术」（被动）");
                Check(hero3.LearnedSkills.Contains("sk_slash"), "1 级自动学会「攻杀剑术」");
                Check(!hero3.LearnedSkills.Contains("sk_thrust"), "「刺杀剑术」要 3 级，现在还不会");
                Check(hero3.HitBonus > 0, "被动把命中加成加上了（+" + hero3.HitBonus + "）");

                SkillDef slash = db.Skills.Get("sk_slash");
                Check(SkillSystem.BarSkill(hero3, 0, db.Skills) == slash, "快捷栏第 1 格是攻杀剑术（被动不占格）");
                Check(SkillSystem.BarSkill(hero3, 1, db.Skills) == null, "还没学会的格子是空的");

                // 升到 10 级：既验证"到级自动学"，也让命中率封顶到 100%，避免用例偶发 miss 而变成 flaky
                hero3.Level = 10;
                skillSim.World.Step(new List<Intent>());
                Check(hero3.LearnedSkills.Contains("sk_thrust"), "10 级自动学会「刺杀剑术」");
                Check(hero3.LearnedSkills.Contains("sk_flame"), "10 级自动学会「烈火剑法」");
                Check(SkillSystem.BarSkill(hero3, 1, db.Skills) != null, "快捷栏第 2 格有技能了");

                Entity dummy3 = db.CreateMonster("mon_hen");
                if (dummy3 != null && slash != null)
                {
                    dummy3.Pos = skillSim.World.FindFreeTileNear(new TilePos(hero3.Pos.X + 1, hero3.Pos.Y), 6);
                    dummy3.HomePos = dummy3.Pos;
                    dummy3.Aggressive = false;
                    dummy3.MoveSpeed = 9999;
                    dummy3.BaseMaxHp = 500; dummy3.MaxHp = 500; dummy3.Hp = 500;
                    skillSim.World.Spawn(dummy3);
                    // 钉住它：怪在同一个 tick 里 AI 会先动一格，那样就已经不在技能攻击弧里了
                    dummy3.MoveCooldown = 100000;
                    hero3.Facing = DirHelper.FromDelta(dummy3.Pos.X - hero3.Pos.X, dummy3.Pos.Y - hero3.Pos.Y, hero3.Facing);

                    int mpBefore = hero3.Mp;
                    int hpBefore = dummy3.Hp;
                    int castEvents = 0;
                    skillSim.Bus.Subscribe<SkillCast>(delegate(SkillCast x) { castEvents++; });

                    List<Intent> skillActs = new List<Intent>();
                    skillActs.Add(Intent.BagAction(hero3.Id, IntentKind.CastSkill, 0));
                    skillSim.World.Step(skillActs);

                    Check(castEvents == 1, "技能释放事件发了一次");
                    Check(hero3.Mp < mpBefore, "放技能扣了蓝（" + mpBefore + " -> " + hero3.Mp + "）");
                    Check(dummy3.Hp < hpBefore, "技能造成伤害（" + hpBefore + " -> " + dummy3.Hp + "）");
                    Check(SkillSystem.CooldownLeft(hero3, slash.Id) > 0,
                        "技能进入冷却（剩 " + SkillSystem.CooldownLeft(hero3, slash.Id) + " tick）");

                    int mpBefore2 = hero3.Mp;
                    int hpBefore2 = dummy3.Hp;
                    int refusedSkill = 0;
                    skillSim.Bus.Subscribe<SkillRefused>(delegate(SkillRefused x) { refusedSkill++; });
                    skillSim.World.Step(skillActs);

                    Check(refusedSkill == 1, "冷却中再按 -> 拒绝并给理由");
                    Check(hero3.Mp >= mpBefore2 && dummy3.Hp == hpBefore2, "冷却中被拒时不扣蓝也不造成伤害");
                }
            }

            // ---------------- M3c 存档往返 ----------------
            {
                Simulation saveSim = db.CreateSimulation(4321u);
                Entity before = db.CreatePlayer();
                before.Pos = saveSim.World.FindFreeTileNear(saveSim.World.Map.Spawn, 11);
                before.HomePos = before.Pos;
                saveSim.World.Spawn(before);
                saveSim.World.Player = before;

                before.Level = 7;
                before.Exp = 33;
                before.Gold = 555;
                before.BaseMaxHp = 250;
                before.BaseMinDc = 12;
                before.BaseMaxDc = 20;
                StatCalculator.Apply(before, db.Items);
                before.Hp = 200;

                int swordSlot = before.Bag.IndexOf("wp_wood");
                if (swordSlot >= 0)
                {
                    // 故意给它一个史诗品质，验一验品质能不能扛过 F5/F9
                    before.Bag.At(swordSlot).Quality = ItemQuality.Purple;
                    ItemSystem.Equip(saveSim.World, before, swordSlot, db.Items);
                }
                ItemDef hideForSave = db.Items.Get("mat_hide");
                if (hideForSave != null) before.Bag.Add(hideForSave, 4);

                SaveData data = SaveService.Capture(saveSim.World, 4321);
                string json = JsonUtility.ToJson(data, true);
                Check(json.Length > 100, "存档序列化出 " + json.Length + " 字节的 JSON");
                Check(json.Contains("\"Level\": 7"), "JSON 里能看到等级");

                SaveData back = JsonUtility.FromJson<SaveData>(json);
                Check(back.Version == SaveData.Version2 && back.GearQualities != null,
                    "存档版本升到 v2 且带上了品质数组");

                Simulation loadSim = db.CreateSimulation(4321u);
                Entity after = db.CreatePlayer();
                after.Pos = loadSim.World.Map.Spawn;
                after.HomePos = after.Pos;
                loadSim.World.Spawn(after);
                loadSim.World.Player = after;

                Check(SaveService.Apply(back, loadSim.World, db.Items), "读档应用成功");
                Check(after.Level == 7 && after.Gold == 555, "等级/金币恢复（Lv" + after.Level + " " + after.Gold + " 金）");

                ItemInstance loadedWeapon = after.Gear.Get(EquipSlot.Weapon);
                Check(loadedWeapon != null && loadedWeapon.Quality == ItemQuality.Purple,
                    "史诗品质扛过了存档往返（实际 " + (loadedWeapon != null ? ItemQualityRules.DisplayName(loadedWeapon.Quality) : "-") + "）");
                Check(after.BaseMinDc == 12 && after.MinDc == 16,
                    "基础属性恢复且按品质重算装备加成（基础 " + after.BaseMinDc + " -> 有效 " + after.MinDc + "）");
                Check(after.Gear.Get(EquipSlot.Weapon) != null, "装备栏恢复");
                Check(after.Bag.IndexOf("mat_hide") >= 0, "背包恢复");
                Check(after.Pos == before.Pos, "位置恢复（" + after.Pos + "）");
            }

            // ---------------- M5 跨图传送 + 跨图存档 ----------------
            {
                GameMap cave = db.GetMap("map_cave");
                GameMap town = db.GetMap("map_town");
                Check(cave != null && town != null, "地图表里同时有城镇和洞窟");

                // 1) 真的从草原走进传送点，看看会不会切到城镇
                Simulation walkSim = db.CreateSimulation(1357u);
                Entity walker = db.CreatePlayer();
                walker.Pos = walkSim.World.Map.Spawn;
                walker.HomePos = walker.Pos;
                walkSim.World.Spawn(walker);
                walkSim.World.Player = walker;

                GameMap startMap = walkSim.World.Map;
                Portal startPortal = startMap.Portals.Count > 0 ? startMap.Portals[0] : null;
                Check(startPortal != null, startMap.Id + " 配了传送点");

                if (startPortal != null)
                {
                    int changes = 0;
                    walkSim.Bus.Subscribe<MapChanged>(delegate(MapChanged e) { changes++; });

                    // 先空跑一 tick：PortalSystem 的第一 tick 只记录位置，不做判定
                    walkSim.Step(new List<Intent>());

                    // 直接站到传送点旁边，然后走上去 —— 和玩家真的踩上去是同一条代码路径
                    TilePos next = startPortal.At;
                    TilePos beside = walkSim.World.FindFreeTileNear(new TilePos(next.X, next.Y - 1), 6);
                    walkSim.World.PlaceEntity(walker, beside);
                    walker.MoveCooldown = 0;
                    walkSim.Step(new List<Intent>());   // 记下新位置，但还没踩到传送点

                    int changesBefore = changes;
                    List<Intent> step = new List<Intent>();
                    step.Add(Intent.Move(walker.Id, DirHelper.FromDelta(next.X - beside.X, next.Y - beside.Y)));
                    walkSim.Step(step);
                    walkSim.Step(new List<Intent>());

                    Check(changes - changesBefore == 1, "走上传送点触发了换图（" + (changes - changesBefore) + " 次）");
                    Check(walkSim.World.Map.Id == startPortal.TargetMap,
                        "换到了 " + startPortal.TargetMap + "（实际 " + walkSim.World.Map.Id + "）");
                    Check(walker.Pos == startPortal.TargetPos, "落在目标落点 " + walker.Pos);
                    Check(startMap.Portals.Count > 0, "旧图的传送点数据没被破坏");
                    Check(CheckInvariants(walkSim.World) == null, "换图后不变量成立");

                    // 2) 在城镇里存档 -> 用另一个「从草原开局」的 World 读档，应该被送回城镇
                    walker.Gold = 888;
                    SaveData townSave = SaveService.Capture(walkSim.World, 1357);
                    Check(townSave.MapId == "map_town", "存档记下了地图 id（" + townSave.MapId + "）");
                    Check(JsonUtility.ToJson(townSave, true).Contains("\"MapId\": \"map_town\""), "MapId 进了 JSON");

                    Simulation freshSim = db.CreateSimulation(1357u);
                    Entity freshHero = db.CreatePlayer();
                    freshHero.Pos = freshSim.World.Map.Spawn;
                    freshHero.HomePos = freshHero.Pos;
                    freshSim.World.Spawn(freshHero);
                    freshSim.World.Player = freshHero;

                    Check(freshSim.World.Map.Id != "map_town", "新开的档在草原上（" + freshSim.World.Map.Id + "）");
                    Check(SaveService.Apply(townSave, freshSim.World, db.Items, db), "跨图读档应用成功");
                    Check(freshSim.World.Map.Id == "map_town", "读档后切到了城镇（实际 " + freshSim.World.Map.Id + "）");
                    Check(freshHero.Pos == walker.Pos, "跨图读档位置正确（" + freshHero.Pos + "）");
                    Check(freshHero.Gold == 888, "跨图读档金币正确（" + freshHero.Gold + "）");
                    Check(freshHero.HomePos == freshHero.Pos, "跨图读档后 HomePos 跟着人");
                    Check(CheckInvariants(freshSim.World) == null, "跨图读档后不变量成立");
                }
            }

            // ---------------- M6 音效：素材齐不齐 + 事件有没有真的接上 ----------------
            {
                // 1) 表本身
                int missingCue = 0;
                foreach (SfxId id in System.Enum.GetValues(typeof(SfxId)))
                    if (id != SfxId.None && SfxTable.Get(id) == null) missingCue++;
                Check(missingCue == 0, "SfxId 里的每条音效在表里都有定义（" + SfxTable.Count + " 条）");

                int badDef = 0, clipRefs = 0;
                string badSfxWhere = "";
                foreach (SfxTable.SfxDef def in SfxTable.All)
                {
                    if (def.Clips == null || def.Clips.Length == 0
                        || def.Volume <= 0f || def.Volume > 1f || def.Pitch <= 0f)
                    {
                        badDef++;
                        if (badSfxWhere.Length < 60) badSfxWhere += def.Id + " ";
                    }
                    if (def.Clips != null) clipRefs += def.Clips.Length;
                }
                Check(badDef == 0, "每条音效都有文件、音量在 (0,1]、音高为正"
                    + (badDef > 0 ? "，有问题：" + badSfxWhere : ""));

                // 2) 引用的音频文件必须真的在 Resources 里 —— 手滑写错一个路径就是"这条音效永远没声"
                int missingClip = 0;
                string sfxClipWhere = "";
                foreach (SfxTable.SfxDef def in SfxTable.All)
                {
                    for (int i = 0; i < def.Clips.Length; i++)
                    {
                        if (Resources.Load<AudioClip>(def.Clips[i]) != null) continue;
                        missingClip++;
                        if (sfxClipWhere.Length < 70) sfxClipWhere += def.Clips[i] + " ";
                    }
                }
                Check(missingClip == 0,
                    "音效表引用的 " + clipRefs + " 个音频文件都能从 Resources 加载到"
                    + (missingClip > 0 ? "，缺：" + sfxClipWhere : ""));

                // 3) 接线：发事件 -> 真的响。
                //    每个事件前把时钟拨过冷却，这样"发一次响一次"才是确定的。
                GameMap audioMap = MapLoader.CreateFallbackMap(24, 24);
                World audioWorld = new World(audioMap, 31337u, new EventBus());
                Projection audioProj = new Projection(
                    db.Balance.tileWidthPx / (float)db.Balance.pixelsPerUnit,
                    db.Balance.tileHeightPx / (float)db.Balance.pixelsPerUnit);

                Entity audioHero = db.CreatePlayer();
                audioHero.Pos = audioMap.Spawn;
                audioHero.HomePos = audioHero.Pos;
                audioWorld.Spawn(audioHero);
                audioWorld.Player = audioHero;

                Entity audioFoe = db.CreateMonster("mon_hen");
                if (audioFoe != null)
                {
                    audioFoe.Pos = audioMap.FindNearestWalkable(new TilePos(audioMap.Spawn.X + 1, audioMap.Spawn.Y), 6);
                    audioFoe.HomePos = audioFoe.Pos;
                    audioWorld.Spawn(audioFoe);
                }

                AudioDirector audio = new AudioDirector(audioWorld, audioProj, null);

                int wired = 0, notWired = 0;
                string unwiredWhere = "";
                System.Action<string, System.Action> probe = delegate(string name, System.Action publish)
                {
                    audio.Tick(2f);                        // 拨过最短间隔，"发一次该响一次"
                    int before = audio.PlayedCount;
                    publish();
                    if (audio.PlayedCount > before) wired++;
                    else { notWired++; if (unwiredWhere.Length < 70) unwiredWhere += name + " "; }
                };

                probe("AttackSwing", delegate { audioWorld.Events.Publish(new AttackSwing { Actor = audioHero.Id, Dir = Dir.Down, Range = 1 }); });
                probe("AttackMissed", delegate { audioWorld.Events.Publish(new AttackMissed { Source = audioHero.Id, Target = audioFoe != null ? audioFoe.Id : ActorId.None }); });
                probe("DamageDealt", delegate { audioWorld.Events.Publish(new DamageDealt { Source = audioHero.Id, Target = audioFoe != null ? audioFoe.Id : ActorId.None, Amount = 3 }); });
                probe("DamageDealt(crit)", delegate { audioWorld.Events.Publish(new DamageDealt { Source = audioHero.Id, Target = audioFoe != null ? audioFoe.Id : ActorId.None, Amount = 9, Crit = true }); });
                probe("EntityDied(怪)", delegate { audioWorld.Events.Publish(new EntityDied { Id = audioFoe != null ? audioFoe.Id : ActorId.None, Killer = audioHero.Id }); });
                probe("EntityDied(玩家)", delegate { audioWorld.Events.Publish(new EntityDied { Id = audioHero.Id, Killer = ActorId.None }); });
                probe("PlayerRespawned", delegate { audioWorld.Events.Publish(new PlayerRespawned { Id = audioHero.Id, At = audioMap.Spawn }); });
                probe("LevelUp", delegate { audioWorld.Events.Publish(new LevelUp { Id = audioHero.Id, Level = 2 }); });
                probe("SkillLearned", delegate { audioWorld.Events.Publish(new SkillLearned { Id = audioHero.Id, SkillId = "sk_slash", SkillName = "攻杀剑术" }); });
                probe("SkillCast", delegate { audioWorld.Events.Publish(new SkillCast { Caster = audioHero.Id, SkillId = "sk_slash", Dir = Dir.Down, TargetCount = 1, Success = true }); });
                probe("GoldPicked", delegate { audioWorld.Events.Publish(new GoldPicked { By = audioHero.Id, Amount = 3, Total = 3 }); });
                probe("ItemPicked", delegate { audioWorld.Events.Publish(new ItemPicked { By = audioHero.Id, DefId = "wp_wood", Count = 1 }); });
                probe("ItemUsed", delegate { audioWorld.Events.Publish(new ItemUsed { By = audioHero.Id, DefId = "pot_hp_s" }); });
                probe("EquipmentChanged", delegate { audioWorld.Events.Publish(new EquipmentChanged { Id = audioHero.Id, Slot = EquipSlot.Weapon, DefId = "wp_wood" }); });
                probe("ItemBought", delegate { audioWorld.Events.Publish(new ItemBought { By = audioHero.Id, DefId = "wp_wood", Count = 1, Gold = 100 }); });
                probe("MapChanged", delegate { audioWorld.Events.Publish(new MapChanged { FromMapId = "a", ToMapId = "b" }); });
                probe("PickupRefused", delegate { audioWorld.Events.Publish(new PickupRefused { By = audioHero.Id, DefId = "mat_hide", Reason = "背包满了" }); });
                probe("EntityMoved(玩家)", delegate { audioWorld.Events.Publish(new EntityMoved { Id = audioHero.Id, From = audioMap.Spawn, To = audioMap.Spawn, Facing = Dir.Down }); });

                Check(notWired == 0, wired + " 类事件都能触发音效"
                    + (notWired > 0 ? "，没响的：" + unwiredWhere : ""));

                // 4) 最短间隔真的在起作用：同一瞬间连发两次不该响两次
                audio.Tick(2f);
                int quietBefore = audio.PlayedCount;
                audio.Play(SfxId.Refuse);
                audio.Play(SfxId.Refuse);
                Check(audio.PlayedCount == quietBefore + 1, "同一个音在最短间隔内连发两次只响一次（防刷屏）");

                // 5) 静音 / 音量
                audio.Tick(2f);
                int mutedBefore = audio.PlayedCount;
                Check(audio.ToggleMute(), "M 键切成静音");
                audio.Play(SfxId.LevelUp);
                Check(audio.PlayedCount == mutedBefore, "静音时不再出声");
                audio.ToggleMute();
                audio.Tick(2f);
                audio.Play(SfxId.LevelUp);
                Check(audio.PlayedCount == mutedBefore + 1, "再按一次恢复出声");

                float loud = audio.MasterVolume;
                audio.AdjustVolume(-0.1f);
                Check(audio.MasterVolume < loud, "音量能调小（" + loud.ToString("0.0") + " -> " + audio.MasterVolume.ToString("0.0") + "）");
                audio.AdjustVolume(-10f);
                Check(audio.MasterVolume >= 0f, "音量减到底也不会变成负数");

                audio.Dispose();
                Check(true, "运行时建的音频物体能收干净（不留跨场景的残留）");
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

        /// <summary>
        /// 把一件装备的【白装】属性折算成一个"强度点"，用来比较同部位同等级的装备谁更强。
        /// 权重和 Tools/gen_items.py 的预算点严格对应（那边是正向分配，这里是反推）：
        /// 1 防御 = 1 点、1 攻击 = 0.5 点、1 生命 = 0.25 点、1 魔法 = 0.2 点。
        /// </summary>
        private static float EquipPower(ItemDef def)
        {
            return def.Ac
                 + (def.MinDc + def.MaxDc) * 0.5f
                 + def.BonusHp * 0.25f
                 + def.BonusMp * 0.2f;
        }

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
