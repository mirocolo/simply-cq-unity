using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 死亡结算：发经验/升级、掉金币、清理尸体、玩家复活。
    /// 只负责「死了之后」，伤害本身由 CombatSystem 负责。
    /// </summary>
    public sealed class DeathSystem : ISystem
    {
        private readonly CombatTuning _tuning;
        private readonly List<Entity> _toDespawn = new List<Entity>();

        public DeathSystem(CombatTuning tuning)
        {
            _tuning = tuning != null ? tuning : new CombatTuning();
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            _toDespawn.Clear();

            // 这里会 Spawn 掉落物、Despawn 尸体，所以必须遍历快照
            foreach (Entity e in world.SnapshotEntities())
            {
                if (e.IsAlive)
                {
                    // 被治愈/复活过，重置死亡状态
                    if (e.DeathProcessed || e.DeathTick >= 0)
                    {
                        e.DeathProcessed = false;
                        e.DeathTick = -1;
                        e.Killer = ActorId.None;
                    }
                    continue;
                }

                if (!e.DeathProcessed)
                {
                    OnDeath(world, e);
                    continue;
                }

                if (e.Kind == EntityKind.Player)
                {
                    TryRespawn(world, e);
                    continue;
                }

                if (world.Tick - e.DeathTick >= _tuning.CorpseTicks) _toDespawn.Add(e);
            }

            for (int i = 0; i < _toDespawn.Count; i++) world.Despawn(_toDespawn[i].Id);
        }

        private void OnDeath(World world, Entity victim)
        {
            victim.DeathProcessed = true;
            victim.DeathTick = world.Tick;
            victim.WantsMove = null;
            victim.WantsAttack = false;
            victim.Path.Clear();

            world.Events.Publish(new EntityDied { Id = victim.Id, Killer = victim.Killer });

            Entity killer = world.Get(victim.Killer);
            GrantExperience(world, killer, victim);
            DropLoot(world, victim);

            if (victim.Kind == EntityKind.Player)
                victim.RespawnTick = world.Tick + _tuning.PlayerRespawnTicks;
        }

        private void TryRespawn(World world, Entity player)
        {
            if (player.RespawnTick <= 0 || world.Tick < player.RespawnTick) return;

            player.RespawnTick = 0;
            player.Hp = player.MaxHp;
            player.DeathProcessed = false;
            player.DeathTick = -1;
            player.Killer = ActorId.None;
            player.AttackCooldown = 0;
            player.MoveCooldown = 0;
            player.Path.Clear();
            player.PathGoal = TilePos.Zero;
            player.WanderTarget = null;
            player.WantsMove = null;
            player.WantsAttack = false;

            TilePos at = world.FindFreeTileNear(world.Map.Spawn, 12);
            world.PlaceEntity(player, at);
            world.Events.Publish(new PlayerRespawned { Id = player.Id, At = at });
        }

        private void GrantExperience(World world, Entity killer, Entity victim)
        {
            if (killer == null || killer.Kind != EntityKind.Player) return;
            if (!killer.IsAlive || victim.ExpReward <= 0) return;

            killer.Exp += victim.ExpReward;
            world.Events.Publish(new ExpGained { Id = killer.Id, Amount = victim.ExpReward, Total = killer.Exp });

            int guard = 0;
            while (killer.ExpToNextLevel > 0 && killer.Exp >= killer.ExpToNextLevel && guard < 100)
            {
                guard++;
                killer.Exp -= killer.ExpToNextLevel;
                killer.Level++;
                killer.MaxHp += _tuning.LevelUpHpGain;
                killer.Hp = killer.MaxHp;          // M2 还没有药，升级回满血玩起来更舒服
                killer.MinDc += _tuning.LevelUpDcGain;
                killer.MaxDc += _tuning.LevelUpDcGain;
                killer.Ac += _tuning.LevelUpAcGain;
                killer.ExpToNextLevel = LevelCurve.ExpToNext(killer.Level, _tuning);

                world.Events.Publish(new LevelUp { Id = killer.Id, Level = killer.Level });
            }
        }

        private void DropLoot(World world, Entity victim)
        {
            if (victim.GoldMax <= 0) return;
            if (!world.Rng.Chance(victim.GoldChance)) return;

            int amount = world.Rng.Range(victim.GoldMin, victim.GoldMax);
            if (amount <= 0) return;

            // 就掉在死亡点上：尸体占的是 _occupancy，掉落物在 _groundItems，两者互不冲突。
            // 尸体消失后玩家踩上去就能捡，视觉上也更符合直觉。
            TilePos at = victim.Pos;

            // 同一格已经有金币就合并，避免两块金币互相覆盖导致捡不到
            Entity existing = world.GroundItemAt(at);
            if (existing != null && existing.Kind == EntityKind.GroundItem)
            {
                existing.Gold += amount;
                world.Events.Publish(new GoldDropped { ItemId = existing.Id, At = at, Amount = amount });
                return;
            }

            Entity loot = new Entity();
            loot.Kind = EntityKind.GroundItem;
            loot.DefId = "gold";
            loot.SpriteId = "gold";
            loot.Name = "金币";
            loot.BlocksTile = false;
            loot.Gold = amount;
            loot.LifetimeTicks = _tuning.GroundLootTicks;
            loot.Pos = at;
            loot.HomePos = at;
            world.Spawn(loot);

            world.Events.Publish(new GoldDropped { ItemId = loot.Id, At = at, Amount = amount });
        }
    }
}
