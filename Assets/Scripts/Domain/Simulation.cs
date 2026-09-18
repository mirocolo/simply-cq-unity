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
        public readonly IItemCatalog Catalog;

        /// <remarks>
        /// tuning 和 catalog 故意做成【必填】：之前给它们默认值 null，
        /// 结果 GameBootstrap 忘了传物品表，编译能过、运行也"正常"，
        /// 只是穿装备和捡物品会静默失效 —— 这种坑必须让编译器挡下来。
        /// </remarks>
        public Simulation(GameMap map, uint seed, Func<string, Entity> monsterFactory,
                          CombatTuning tuning, IItemCatalog catalog, ISkillCatalog skills, ShopTuning shop,
                          IMapCatalog maps = null)
        {
            Bus = new EventBus();
            World = new World(map, seed, Bus);
            Tuning = tuning != null ? tuning : new CombatTuning();
            Tuning.Clamp();
            Catalog = catalog;

            // 顺序有含义：先决策（AI），再执行移动，再结算战斗/死亡/拾取，最后刷怪
            World.Systems.Add(new AiSystem());
            World.Systems.Add(new MovementSystem());
            // 传送紧跟在移动之后：这样「走进传送点」当 tick 就能换图，玩家的位移不会浪费半拍
            if (maps != null) World.Systems.Add(new PortalSystem(maps));
            World.Systems.Add(new CombatSystem(Tuning));
            World.Systems.Add(new SkillSystem(skills, Catalog, Tuning));
            World.Systems.Add(new DeathSystem(Tuning, Catalog));
            World.Systems.Add(new LootSystem(Catalog));
            World.Systems.Add(new ItemSystem(Catalog));
            World.Systems.Add(new ShopSystem(Catalog, shop));
            if (monsterFactory != null) World.Systems.Add(new SpawnerSystem(monsterFactory));
        }

        public void Step(IReadOnlyList<Intent> intents)
        {
            World.Step(intents);
        }
    }
}
