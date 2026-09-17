using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>把 World 和 System 装到一起的组装点。表现层只跟它打交道。</summary>
    public sealed class Simulation
    {
        public readonly EventBus Bus;
        public readonly World World;
        public readonly CombatTuning Tuning;

        public Simulation(GameMap map, uint seed, Func<string, Entity> monsterFactory, CombatTuning tuning = null)
        {
            Bus = new EventBus();
            World = new World(map, seed, Bus);
            Tuning = tuning != null ? tuning : new CombatTuning();
            Tuning.Clamp();

            // 顺序有含义：先决策（AI），再执行移动，再结算战斗/死亡/拾取，最后刷怪
            World.Systems.Add(new AiSystem());
            World.Systems.Add(new MovementSystem());
            World.Systems.Add(new CombatSystem(Tuning));
            World.Systems.Add(new DeathSystem(Tuning));
            World.Systems.Add(new LootSystem());
            if (monsterFactory != null) World.Systems.Add(new SpawnerSystem(monsterFactory));
        }

        public void Step(IReadOnlyList<Intent> intents)
        {
            World.Step(intents);
        }
    }
}
