namespace SimplyCQ.Domain
{
    /// <summary>确定性随机数（xorshift32）。同一个种子 + 同一串操作 = 同一个结果，方便复现 bug。</summary>
    public sealed class Rng
    {
        private uint _state;

        public Rng(uint seed)
        {
            _state = seed == 0u ? 0x9E3779B9u : seed;
        }

        public uint NextUInt()
        {
            uint x = _state;
            x ^= x << 13;
            x ^= x >> 17;
            x ^= x << 5;
            _state = x;
            return x;
        }

        /// <summary>[0,1) 浮点。</summary>
        public float Value { get { return (NextUInt() >> 8) * (1.0f / 16777216.0f); } }

        /// <summary>闭区间整数。</summary>
        public int Range(int minInclusive, int maxInclusive)
        {
            if (maxInclusive <= minInclusive) return minInclusive;
            uint span = (uint)(maxInclusive - minInclusive + 1);
            return minInclusive + (int)(NextUInt() % span);
        }

        public bool Chance(float p) { return Value < p; }
    }
}
