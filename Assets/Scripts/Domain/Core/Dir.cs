namespace SimplyCQ.Domain
{
    /// <summary>8 方向。顺序不要改：DeltaX / DeltaY 靠下标对应。</summary>
    public enum Dir
    {
        Up = 0,
        UpRight = 1,
        Right = 2,
        DownRight = 3,
        Down = 4,
        DownLeft = 5,
        Left = 6,
        UpLeft = 7
    }

    public static class DirHelper
    {
        public const int Count = 8;
        private static readonly int[] DX = { 0, 1, 1, 1, 0, -1, -1, -1 };
        private static readonly int[] DY = { -1, -1, 0, 1, 1, 1, 0, -1 };

        public static TilePos Delta(Dir d) { return new TilePos(DX[(int)d], DY[(int)d]); }
        public static int Dx(Dir d) { return DX[(int)d]; }
        public static int Dy(Dir d) { return DY[(int)d]; }
        public static Dir Opposite(Dir d) { return (Dir)(((int)d + 4) & 7); }

        /// <summary>把朝向向量转成 8 向；零向量回落到 fallback。</summary>
        public static Dir FromDelta(int dx, int dy, Dir fallback = Dir.Down)
        {
            int sx = dx == 0 ? 0 : (dx > 0 ? 1 : -1);
            int sy = dy == 0 ? 0 : (dy > 0 ? 1 : -1);
            for (int i = 0; i < Count; i++)
            {
                if (DX[i] == sx && DY[i] == sy) return (Dir)i;
            }
            return fallback;
        }

        /// <summary>屏幕/世界坐标方向（Unity 的 +Y 向上）转成 8 向。</summary>
        public static Dir FromWorldVector(float x, float y, Dir fallback = Dir.Down)
        {
            // 世界 +Y 向上 = 格子 -Y，所以这里对 y 取反
            int dx = x > 0.0001f ? 1 : (x < -0.0001f ? -1 : 0);
            int dy = y > 0.0001f ? -1 : (y < -0.0001f ? 1 : 0);
            return FromDelta(dx, dy, fallback);
        }

        public static bool IsDiagonal(Dir d) { return DX[(int)d] != 0 && DY[(int)d] != 0; }
    }
}
