using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 唯一的「谁站在哪里、能不能走过去」的执行者。
    /// 每 tick 每个实体最多移动 1 格 —— 这是传奇那种一格一格顿挫感的来源。
    /// </summary>
    public sealed class MovementSystem : ISystem
    {
        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            // 1) 冷却推进
            foreach (Entity e in world.Entities)
            {
                if (e.MoveCooldown > 0) e.MoveCooldown--;
                // 注意：AttackCooldown 由 CombatSystem 推进，这里不能碰，否则会被扣两次
            }

            // 2) 玩家（以及以后的被控实体）的移动意图
            for (int i = 0; i < intents.Count; i++)
            {
                Intent it = intents[i];
                if (it.Kind != IntentKind.Move) continue;

                Entity e = world.Get(it.Actor);
                if (e == null || !e.IsAlive) continue;
                if (e.MoveCooldown > 0) continue;

                TilePos to = e.Pos + DirHelper.Delta(it.Dir);
                if (world.CanWalk(to, e))
                {
                    world.MoveEntity(e, it.Dir);
                    e.MoveCooldown = e.MoveSpeed < 1 ? 1 : e.MoveSpeed;
                }
                else
                {
                    // 撞墙/撞怪：原地转身，给 1 tick 冷却避免每帧刷事件
                    e.Facing = it.Dir;
                    e.MoveCooldown = 1;
                }
            }

            // 3) 怪物：执行 AiSystem 写下的 WantsMove
            foreach (Entity e in world.Entities)
            {
                if (e.Kind != EntityKind.Monster) continue;
                if (!e.IsAlive) continue;          // 尸体不许再动
                if (e.WantsMove == null) continue;
                if (e.MoveCooldown > 0) continue;

                Dir dir = e.WantsMove.Value;
                TilePos to = e.Pos + DirHelper.Delta(dir);
                if (world.CanWalk(to, e))
                {
                    world.MoveEntity(e, dir);
                    e.MoveCooldown = e.MoveSpeed < 1 ? 1 : e.MoveSpeed;
                }
                else
                {
                    e.Facing = dir;
                    e.MoveCooldown = 1;
                    e.Path.Clear();
                    e.RepathCounter = 0;
                }
            }
        }
    }
}
