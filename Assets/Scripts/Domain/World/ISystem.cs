using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>一次逻辑 tick。系统之间保持固定顺序，顺序在 Simulation 里定义。</summary>
    public interface ISystem
    {
        void Tick(World world, IReadOnlyList<Intent> intents);
    }
}
