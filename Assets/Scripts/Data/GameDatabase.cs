using System;
using System.Collections.Generic;
using System.IO;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Data
{
    /// <summary>运行时的数据表集合：balance.json / monsters.json / maps/*.json。</summary>
    public sealed class GameDatabase
    {
        private readonly Dictionary<string, MonsterDto> _monsters = new Dictionary<string, MonsterDto>();

        public BalanceDto Balance { get; private set; }
        public CombatTuning Tuning { get; private set; }
        public ItemCatalog Items { get; private set; }
        public GameMap Map { get; private set; }
        public int MonsterKindCount { get { return _monsters.Count; } }

        public static GameDatabase LoadFromStreamingAssets(string mapFile, string monsterFile, string balanceFile,
                                                          string itemFile = "Data/items.json")
        {
            GameDatabase db = new GameDatabase();

            db.Items = ItemCatalog.FromFile(LoadJson<ItemFile>(itemFile));

            BalanceDto balance = LoadJson<BalanceDto>(balanceFile);
            db.Balance = balance != null ? balance : new BalanceDto();
            db.Balance.Normalize();

            db.Tuning = db.Balance.combat != null ? db.Balance.combat : new CombatTuning();
            db.Tuning.Clamp();

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

            return db;
        }

        public static T LoadJson<T>(string relativePath) where T : class
        {
            if (string.IsNullOrEmpty(relativePath)) return null;
            string path = Path.Combine(Application.streamingAssetsPath, relativePath);
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
            return new Simulation(Map, seed, CreateMonster, Tuning, Items);
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

            CombatTuning t = Tuning != null ? Tuning : new CombatTuning();
            e.AttackInterval = t.PlayerAttackInterval;
            e.AttackRange = 1;
            e.ExpToNextLevel = LevelCurve.ExpToNext(e.Level, t);

            e.Bag = new Inventory();
            e.Bag.MaxWeight = Balance.playerMaxWeight;
            e.Gear = new Equipment();

            // 送一套新手装备，进游戏就能立刻看到换装对属性的影响
            GiveStartingKit(e);

            StatCalculator.Apply(e, Items);
            e.Hp = e.MaxHp;
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
