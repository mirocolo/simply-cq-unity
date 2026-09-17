using System;

namespace SimplyCQ.Domain
{
    /// <summary>把 World 和 System 装到一起的组装点。表现层只跟它打交道。</summary>
    public sealed class Simulation
    {
        public readonly EventBus Bus;
        public readonly World World;

        public Simulation(GameMap map, uint seed, Func<string, Entity> monsterFactory)
        {
            Bus = new EventBus();
            World = new World(map, seed, Bus);

            // 顺序有含义：先决策（AI），再执行（移动），最后刷怪
            World.Systems.Add(new AiSystem());
            World.Systems.Add(new MovementSystem());
            if (monsterFactory != null) World.Systems.Add(new SpawnerSystem(monsterFactory));
        }

        public void Step(System.Collections.Generic.IReadOnlyList<Intent> intents)
        {
            World.Step(intents);
        }
    }
}
