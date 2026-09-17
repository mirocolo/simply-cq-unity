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
        public GameMap Map { get; private set; }
        public int MonsterKindCount { get { return _monsters.Count; } }

        public static GameDatabase LoadFromStreamingAssets(string mapFile, string monsterFile, string balanceFile)
        {
            GameDatabase db = new GameDatabase();

            BalanceDto balance = LoadJson<BalanceDto>(balanceFile);
            db.Balance = balance != null ? balance : new BalanceDto();
            db.Balance.Normalize();

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
            e.Hp = d.hp;
            e.MaxHp = d.hp;
            e.MinDc = d.minDc;
            e.MaxDc = d.maxDc;
            e.Ac = d.ac;
            e.Exp = d.exp;
            e.MoveSpeed = d.moveSpeed;
            e.AttackInterval = d.attackInterval;
            e.AttackRange = d.attackRange;
            e.Vision = d.vision;
            e.Aggressive = d.aggressive;
            e.Leash = d.leash;
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
            e.Hp = Balance.playerHp;
            e.MaxHp = Balance.playerHp;
            e.MinDc = Balance.playerMinDc;
            e.MaxDc = Balance.playerMaxDc;
            e.Ac = Balance.playerAc;
            e.MoveSpeed = Balance.playerMoveSpeed;
            e.Aggressive = false;
            return e;
        }
    }
}
