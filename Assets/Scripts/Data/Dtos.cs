using System;

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
        }
    }
}
