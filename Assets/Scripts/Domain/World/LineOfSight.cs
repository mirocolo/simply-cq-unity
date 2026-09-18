using System;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 视线判定。远程怪必须"看得见"才出手 —— 否则它会隔着石墙射你，玩家只会觉得这游戏坏了。
    ///
    /// 只判地形（墙），不判别的实体：怪物互相挡视线既说不清也没必要，
    /// 而且判定里卷进实体会让"两只怪排一排"变成玄学。
    /// </summary>
    public static class LineOfSight
    {
        /// <summary>两个格子之间没有被墙挡住。起点和终点本身不算遮挡。</summary>
        public static bool Clear(GameMap map, TilePos from, TilePos to)
        {
            if (map == null) return true;

            int x0 = from.X, y0 = from.Y;
            int x1 = to.X, y1 = to.Y;

            int dx = Math.Abs(x1 - x0);
            int dy = Math.Abs(y1 - y0);
            int sx = x0 < x1 ? 1 : -1;
            int sy = y0 < y1 ? 1 : -1;
            int err = dx - dy;

            // Bresenham 走一遍：dx+dy+2 步足够覆盖任何一条线，多的那两步是防御性上限
            int guard = dx + dy + 2;
            while (guard-- > 0)
            {
                if (x0 == x1 && y0 == y1) return true;

                int e2 = err * 2;
                if (e2 > -dy) { err -= dy; x0 += sx; }
                if (e2 < dx) { err += dx; y0 += sy; }

                if (x0 == x1 && y0 == y1) return true;      // 终点不判（目标自己站的那格）
                if (!map.IsWalkable(new TilePos(x0, y0))) return false;
            }
            return true;
        }
    }
}
