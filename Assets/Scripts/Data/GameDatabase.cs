using System;
using System.Collections.Generic;
using System.IO;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Data
{
    /// <summary>运行时的数据表集合：balance.json / monsters.json / maps/*.json。</summary>
    public sealed class GameDatabase : IMapCatalog
    {
        private readonly Dictionary<string, MonsterDto> _monsters = new Dictionary<string, MonsterDto>();
        private readonly Dictionary<string, NpcDef> _npcs = new Dictionary<string, NpcDef>();
        private readonly Dictionary<string, GameMap> _maps = new Dictionary<string, GameMap>();

        public BalanceDto Balance { get; private set; }
        public CombatTuning Tuning { get; private set; }
        public LootTuning Loot { get; private set; }
        public ItemCatalog Items { get; private set; }
        public SkillCatalog Skills { get; private set; }
        public ShopTuning Shop { get; private set; }

        /// <summary>起始地图（进游戏时站的那张）。其余地图用 GetMap / AllMaps 取。</summary>
        public GameMap Map { get; private set; }

        public int MonsterKindCount { get { return _monsters.Count; } }
        public int MapCount { get { return _maps.Count; } }
        public IEnumerable<GameMap> AllMaps { get { return _maps.Values; } }

        /// <summary>所有怪的定义。自检要遍历它检查"怪的等级配不配得上它掉的装备"。</summary>
        public IEnumerable<MonsterDto> AllMonsters { get { return _monsters.Values; } }

        public static GameDatabase LoadFromStreamingAssets(string mapFile, string monsterFile, string balanceFile,
                                                          string itemFile = "Data/items.json",
                                                          string npcFile = "Data/npcs.json",
                                                          string skillFile = "Data/skills.json")
        {
            GameDatabase db = new GameDatabase();

            db.Items = ItemCatalog.FromFile(LoadJson<ItemFile>(itemFile));
            db.Skills = SkillCatalog.FromFile(LoadJson<SkillFile>(skillFile));

            BalanceDto balance = LoadJson<BalanceDto>(balanceFile);
            db.Balance = balance != null ? balance : new BalanceDto();
            db.Balance.Normalize();

            db.Tuning = db.Balance.combat != null ? db.Balance.combat : new CombatTuning();
            db.Tuning.Clamp();

            db.Loot = db.Balance.loot != null ? db.Balance.loot : new LootTuning();
            db.Loot.Clamp();

            db.Shop = new ShopTuning();
            db.Shop.SellRatio = db.Balance.shopSellRatio;
            db.Shop.Clamp();

            NpcFile npcFileData = LoadJson<NpcFile>(npcFile);
            if (npcFileData != null && npcFileData.npcs != null)
            {
                for (int i = 0; i < npcFileData.npcs.Length; i++)
                {
                    NpcDto dto = npcFileData.npcs[i];
                    if (dto == null || string.IsNullOrEmpty(dto.id)) continue;
                    NpcDef def = new NpcDef();
                    def.Id = dto.id;
                    def.Name = string.IsNullOrEmpty(dto.name) ? dto.id : dto.name;
                    def.SpriteId = string.IsNullOrEmpty(dto.sprite) ? dto.id : dto.sprite;
                    def.Dialog = dto.dialog;
                    if (dto.stock != null)
                        for (int k = 0; k < dto.stock.Length; k++) def.Stock.Add(dto.stock[k]);
                    if (dto.teleports != null)
                    {
                        for (int k = 0; k < dto.teleports.Length; k++)
                        {
                            NpcTeleportDto t = dto.teleports[k];
                            if (t == null || string.IsNullOrEmpty(t.targetMap)) continue;
                            NpcTeleport spot = new NpcTeleport();
                            spot.TargetMap = t.targetMap;
                            spot.TargetPos = new TilePos(t.x, t.y);
                            spot.Name = string.IsNullOrEmpty(t.name) ? t.targetMap : t.name;
                            spot.Cost = t.cost > 0 ? t.cost : 0;
                            def.Teleports.Add(spot);
                        }
                    }
                    db._npcs[def.Id] = def;
                }
            }

            MonsterFile mf = LoadJson<MonsterFile>(monsterFile);
            if (mf != null && mf.monsters != null)
            {
                for (int i = 0; i < mf.monsters.Length; i++)
                {
                    MonsterDto m = mf.monsters[i];
                    if (m == null || string.IsNullOrEmpty(m.id)) continue;
                    db._monsters[m.id] = m;
                }
            }

            MapDto mapp = LoadJson<MapDto>(mapFile);
            db.Map = mapp != null ? MapLoader.FromDto(mapp) : MapLoader.CreateFallbackMap(40, 40);
            db.RegisterMaps(mapFile);

            return db;
        }

        /// <summary>
        /// 把起始地图和 Data/maps 目录下其它地图一起装进表里。
        /// 用扫目录而不是写死文件名：以后往 maps/ 里丢一个新 json 就能生效，不用改代码。
        /// 读不到目录就退化成「只有起始图」，不影响单图跑起来。
        /// </summary>
        private void RegisterMaps(string startMapFile)
        {
            _maps[Map.Id] = Map;

            string folder = Path.GetDirectoryName(startMapFile);
            if (string.IsNullOrEmpty(folder)) return;

            string dir = Path.Combine(Application.streamingAssetsPath, folder);
            if (!Directory.Exists(dir)) return;

            string[] files = Directory.GetFiles(dir, "map_*.json");   // 约定：地图文件都叫 map_*.json
            Array.Sort(files, StringComparer.Ordinal);   // 顺序确定，免得每次进游戏地图表顺序都不一样
            string startName = Path.GetFileName(startMapFile);

            for (int i = 0; i < files.Length; i++)
            {
                if (string.Equals(Path.GetFileName(files[i]), startName, StringComparison.Ordinal)) continue;

                MapDto dto = LoadJsonAbsolute<MapDto>(files[i]);
                if (dto == null || string.IsNullOrEmpty(dto.id)) continue;
                if (_maps.ContainsKey(dto.id))
                {
                    Debug.LogWarning("[SimplyCQ] 地图 id 重复：" + dto.id + "（" + files[i] + "），忽略");
                    continue;
                }
                _maps[dto.id] = MapLoader.FromDto(dto);
            }
        }

        public static T LoadJson<T>(string relativePath) where T : class
        {
            if (string.IsNullOrEmpty(relativePath)) return null;
            return LoadJsonAbsolute<T>(Path.Combine(Application.streamingAssetsPath, relativePath));
        }

        private static T LoadJsonAbsolute<T>(string path) where T : class
        {
            if (string.IsNullOrEmpty(path)) return null;
            if (!File.Exists(path))
            {
                Debug.LogError("[SimplyCQ] 找不到数据文件: " + path);
                return null;
            }
            try
            {
                return JsonUtility.FromJson<T>(File.ReadAllText(path));
            }
            catch (Exception ex)
            {
                Debug.LogError("[SimplyCQ] 解析 " + path + " 失败: " + ex.Message);
                return null;
            }
        }

        /// <summary>
        /// 装配一个能玩的 Simulation（地图 + 战斗数值 + 物品表 + 怪物工厂）。
        /// 游戏本体和无头自检都走这里 —— 只留一条装配路径，就不会出现
        /// "测试里好好的、真跑起来忘了传物品表"这种事。
        /// </summary>
        public Simulation CreateSimulation(uint seed)
        {
            return new Simulation(Map, seed, CreateMonster, Tuning, Items, Skills, Shop, this, Loot);
        }

        /// <summary>按 id 取图（实现 IMapCatalog）。找不到返回 null，由调用方给玩家反馈。</summary>
        public GameMap GetMap(string mapId)
        {
            if (string.IsNullOrEmpty(mapId)) return null;
            GameMap m;
            return _maps.TryGetValue(mapId, out m) ? m : null;
        }

        public NpcDef GetNpc(string npcId)
        {
            if (string.IsNullOrEmpty(npcId)) return null;
            NpcDef def;
            return _npcs.TryGetValue(npcId, out def) ? def : null;
        }

        /// <summary>
        /// 把【当前地图】上摆的 NPC 生出来。商人的货来自 npcs.json。
        /// 必须用 world.Map 而不是 db.Map —— 换图之后要生的是新图上的 NPC。
        /// </summary>
        public void SpawnNpcs(World world)
        {
            if (world == null) return;

            List<NpcSpawn> spots = world.Map.Npcs;
            for (int i = 0; i < spots.Count; i++)
            {
                NpcSpawn spot = spots[i];
                NpcDef def = GetNpc(spot.NpcId);
                if (def == null)
                {
                    Debug.LogWarning("[SimplyCQ] npcs.json 里没有 " + spot.NpcId);
                    continue;
                }

                Entity e = new Entity();
                e.Kind = EntityKind.Npc;
                e.DefId = def.Id;
                e.SpriteId = def.SpriteId;
                e.Name = def.Name;
                e.Shop = def;
                e.BlocksTile = true;
                e.BaseMaxHp = 100; e.MaxHp = 100; e.Hp = 100;
                e.MoveSpeed = 1000;
                e.Pos = world.FindFreeTileNear(spot.Pos, 8);
                e.HomePos = e.Pos;
                world.Spawn(e);
            }
        }

        public Entity CreateMonster(string monsterId)
        {
            MonsterDto d;
            if (string.IsNullOrEmpty(monsterId) || !_monsters.TryGetValue(monsterId, out d))
            {
                Debug.LogWarning("[SimplyCQ] monsters.json 里没有 " + monsterId);
                return null;
            }
            Entity e = new Entity();
            e.Kind = EntityKind.Monster;
            e.DefId = d.id;
            e.SpriteId = string.IsNullOrEmpty(d.sprite) ? d.id : d.sprite;
            e.Name = d.name;
            e.Level = d.level;
            e.BaseMaxHp = d.hp;
            e.BaseMinDc = d.minDc;
            e.BaseMaxDc = d.maxDc;
            e.BaseAc = d.ac;
            e.Exp = d.exp;
            e.MoveSpeed = d.moveSpeed;
            e.AttackInterval = d.attackInterval;
            e.AttackRange = d.attackRange;
            e.Vision = d.vision;
            e.Aggressive = d.aggressive;
            e.Leash = d.leash;
            e.PackRadius = d.packRadius > 0 ? d.packRadius : 0;   // 手抖填了负数就当独行

            e.ExpReward = d.exp;
            e.GoldMin = d.goldMin;
            e.GoldMax = d.goldMax;
            e.GoldChance = d.goldChance;

            if (d.drops != null)
            {
                for (int i = 0; i < d.drops.Length; i++)
                {
                    DropDto drop = d.drops[i];
                    if (drop == null || string.IsNullOrEmpty(drop.itemId)) continue;
                    ItemDrop entry = new ItemDrop();
                    entry.ItemId = drop.itemId;
                    entry.Chance = drop.chance;
                    entry.Min = drop.min > 0 ? drop.min : 1;
                    entry.Max = drop.max >= entry.Min ? drop.max : entry.Min;
                    e.ItemDrops.Add(entry);
                }
            }

            StatCalculator.Apply(e, Items);
            e.Hp = e.MaxHp;
            return e;
        }

        public Entity CreatePlayer()
        {
            Entity e = new Entity();
            e.Kind = EntityKind.Player;
            e.DefId = "player_warrior";
            e.SpriteId = "player_warrior";
            e.Name = "战士";
            e.Level = Balance.playerLevel;
            e.BaseMaxHp = Balance.playerHp;
            e.BaseMinDc = Balance.playerMinDc;
            e.BaseMaxDc = Balance.playerMaxDc;
            e.BaseAc = Balance.playerAc;
            e.MoveSpeed = Balance.playerMoveSpeed;
            e.Aggressive = false;
            e.ClassId = "warrior";
            e.BaseMaxMp = Balance.playerMp;

            CombatTuning t = Tuning != null ? Tuning : new CombatTuning();
            e.AttackInterval = t.PlayerAttackInterval;
            e.AttackRange = 1;
            e.ExpToNextLevel = LevelCurve.ExpToNext(e.Level, t);

            e.Bag = new Inventory();
            e.Gear = new Equipment();

            // 送一套新手装备，进游戏就能立刻看到换装对属性的影响
            GiveStartingKit(e);

            StatCalculator.Apply(e, Items);
            e.Hp = e.MaxHp;
            e.Mp = e.MaxMp;
            return e;
        }

        private void GiveStartingKit(Entity e)
        {
            if (Items == null || e.Bag == null) return;
            string[] kit = { "wp_wood", "ar_cloth", "bt_straw", "pot_hp_s", "pot_hp_s", "pot_hp_s" };
            for (int i = 0; i < kit.Length; i++)
            {
                ItemDef def = Items.Get(kit[i]);
                if (def == null) continue;
                e.Bag.Add(def, 1);
            }
        }
    }
}
