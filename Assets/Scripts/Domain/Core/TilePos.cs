using System;

namespace SimplyCQ.Domain
{
    /// <summary>格子坐标。X 向右，Y 向下（屏幕方向，Y 越大越靠近屏幕下方）。</summary>
    [Serializable]
    public struct TilePos : IEquatable<TilePos>
    {
        public int X;
        public int Y;

        public TilePos(int x, int y) { X = x; Y = y; }

        public static readonly TilePos Zero = new TilePos(0, 0);

        public static TilePos operator +(TilePos a, TilePos b) { return new TilePos(a.X + b.X, a.Y + b.Y); }
        public static TilePos operator -(TilePos a, TilePos b) { return new TilePos(a.X - b.X, a.Y - b.Y); }
        public static bool operator ==(TilePos a, TilePos b) { return a.X == b.X && a.Y == b.Y; }
        public static bool operator !=(TilePos a, TilePos b) { return a.X != b.X || a.Y != b.Y; }

        public bool Equals(TilePos other) { return X == other.X && Y == other.Y; }
        public override bool Equals(object obj) { return obj is TilePos && Equals((TilePos)obj); }
        public override int GetHashCode() { return (X * 397) ^ Y; }
        public override string ToString() { return "(" + X + "," + Y + ")"; }

        public int ManhattanTo(TilePos o) { return Math.Abs(X - o.X) + Math.Abs(Y - o.Y); }
        public int ChebyshevTo(TilePos o) { return Math.Max(Math.Abs(X - o.X), Math.Abs(Y - o.Y)); }
        public static TilePos Min(TilePos a, TilePos b) { return new TilePos(Math.Min(a.X, b.X), Math.Min(a.Y, b.Y)); }
        public static TilePos Max(TilePos a, TilePos b) { return new TilePos(Math.Max(a.X, b.X), Math.Max(a.Y, b.Y)); }
    }
}
