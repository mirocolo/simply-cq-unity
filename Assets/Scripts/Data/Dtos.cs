using System;
using SimplyCQ.Domain;

namespace SimplyCQ.Data
{
    [Serializable]
    public class MapDto
    {
        public string id;
        public string name;
        public int width;
        public int height;
        public int spawnX;
        public int spawnY;
        public string[] rows;
        public PortalDto[] portals;
        public SpawnerDto[] spawners;
    }

    [Serializable]
    public class PortalDto
    {
        public int x;
        public int y;
        public string targetMap;
        public int targetX;
        public int targetY;
    }

    [Serializable]
    public class SpawnerDto
    {
        public int x;
        public int y;
        public int w;
        public int h;
        public string monsterId;
        public int max;
        public int intervalTicks;
    }

    [Serializable]
    public class MonsterDto
    {
        public string id;
        public string name;
        public string sprite;
        public int level = 1;
        public int hp = 30;
        public int ac;
        public int minDc = 1;
        public int maxDc = 3;
        public int exp;
        public int moveSpeed = 6;
        public int attackInterval = 10;
        public int attackRange = 1;
        public int vision = 5;
        public bool aggressive;
        public int leash = 12;

        // 击杀收益（M2 战斗）
        public int goldMin;
        public int goldMax;
        public float goldChance = 1f;

        // 物品掉落表（M3）
        public DropDto[] drops;
    }

    [Serializable]
    public class DropDto
    {
        public string itemId;
        public float chance = 1f;
        public int min = 1;
        public int max = 1;
    }

    [Serializable]
    public class ItemDto
    {
        public string id;
        public string name;
        public string sprite;
        /// <summary>consumable / equip / material / book / quest</summary>
        public string type;
        /// <summary>weapon / armour / helmet / necklace / bracelet / ring / belt / boots</summary>
        public string slot;
        public int maxStack = 1;
        public int weight = 1;
        public int price;
        public int levelReq = 1;
        public string classReq;

        public int minDc, maxDc, mc, sc, ac, mac, bonusHp, bonusMp;
        public int healHp, healMp;

        public string desc;
    }

    [Serializable]
    public class ItemFile
    {
        public ItemDto[] items;
    }

    [Serializable]
    public class MonsterFile
    {
        public MonsterDto[] monsters;
    }

    [Serializable]
    public class BalanceDto
    {
        public int tickPerSecond = 10;
        public int playerMoveSpeed = 3;
        public int playerLevel = 1;
        public int playerMaxWeight = 60;
        public int playerHp = 90;
        public int playerMinDc = 2;
        public int playerMaxDc = 5;
        public int playerAc = 1;
        public int tileWidthPx = 48;
        public int tileHeightPx = 32;
        public int pixelsPerUnit = 32;
        public int characterWidthPx = 32;
        public int characterHeightPx = 48;
        public int visibleTilesVertically = 15;
        public float cameraSmoothTime = 0.12f;
        public int worldSeed = 20240617;

        /// <summary>战斗/成长数值。JsonUtility 直接反序列化成 Domain 的 CombatTuning。</summary>
        public CombatTuning combat;

        /// <summary>把明显不合理的值夹到安全范围，避免一个手抖让游戏起不来。</summary>
        public void Normalize()
        {
            if (tickPerSecond < 1) tickPerSecond = 1;
            if (tickPerSecond > 60) tickPerSecond = 60;
            if (playerMoveSpeed < 1) playerMoveSpeed = 1;
            if (tileWidthPx < 8) tileWidthPx = 8;
            if (tileHeightPx < 8) tileHeightPx = 8;
            if (pixelsPerUnit < 1) pixelsPerUnit = 1;
            if (characterWidthPx < 8) characterWidthPx = 8;
            if (characterHeightPx < 8) characterHeightPx = 8;
            if (visibleTilesVertically < 5) visibleTilesVertically = 5;
            if (playerHp < 1) playerHp = 1;
            if (playerMaxWeight < 1) playerMaxWeight = 1;
            if (worldSeed == 0) worldSeed = 20240617;
        }
    }
}
