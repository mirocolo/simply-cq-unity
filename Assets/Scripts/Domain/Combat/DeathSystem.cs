using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 死亡结算：发经验/升级、掉金币和物品、清理尸体、玩家复活。
    /// 只负责「死了之后」，伤害本身由 CombatSystem 负责。
    /// </summary>
    public sealed class DeathSystem : ISystem
    {
        private readonly CombatTuning _tuning;
        private readonly IItemCatalog _catalog;
        private readonly LootTuning _loot;
        private readonly List<Entity> _toDespawn = new List<Entity>();
        private readonly List<ItemDropResult> _drops = new List<ItemDropResult>();

        public DeathSystem(CombatTuning tuning, IItemCatalog catalog, LootTuning loot = null)
        {
            _tuning = tuning != null ? tuning : new CombatTuning();
            _catalog = catalog;
            _loot = loot != null ? loot : new LootTuning();
            _loot.Clamp();
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

                // 改基础属性再重算，装备加成不会被升级覆盖掉
                killer.BaseMaxHp += _tuning.LevelUpHpGain;
                killer.BaseMinDc += _tuning.LevelUpDcGain;
                killer.BaseMaxDc += _tuning.LevelUpDcGain;
                killer.BaseAc += _tuning.LevelUpAcGain;
                StatCalculator.Apply(killer, _catalog);

                killer.Hp = killer.MaxHp;          // M3 还没做药水，升级回满血玩起来更舒服
                killer.ExpToNextLevel = LevelCurve.ExpToNext(killer.Level, _tuning);

                world.Events.Publish(new LevelUp { Id = killer.Id, Level = killer.Level });
            }
        }

        private void DropLoot(World world, Entity victim)
        {
            DropGold(world, victim);
            DropItems(world, victim);
        }

        private void DropGold(World world, Entity victim)
        {
            if (victim.GoldMax <= 0) return;
            if (!world.Rng.Chance(victim.GoldChance)) return;

            int amount = world.Rng.Range(victim.GoldMin, victim.GoldMax);
            if (amount <= 0) return;

            // 就掉在死亡点上：尸体占的是 _occupancy，掉落物在 _groundItems，两者互不冲突。
            // 尸体消失后玩家踩上去就能捡，视觉上也更符合直觉。
            TilePos at = victim.Pos;

            Entity existing = world.GroundItemAt(at);
            if (existing != null && existing.Kind == EntityKind.GroundItem && existing.Gold > 0)
            {
                existing.Gold += amount;
                world.Events.Publish(new GoldDropped { ItemId = existing.Id, At = at, Amount = amount });
                return;
            }

            Entity loot = NewGroundItem(at, "gold", "金币", amount);
            loot.Gold = amount;
            loot.Count = amount;
            world.Spawn(loot);
            world.Events.Publish(new GoldDropped { ItemId = loot.Id, At = at, Amount = amount });
        }

        private void DropItems(World world, Entity victim)
        {
            if (victim.ItemDrops.Count == 0) return;

            DropRoller.Roll(victim.ItemDrops, world.Rng, _drops, _catalog, _loot, victim.Level);

            for (int i = 0; i < _drops.Count; i++)
            {
                ItemDropResult r = _drops[i];
                if (r.Count <= 0) continue;

                ItemDef def = _catalog != null ? _catalog.Get(r.ItemId) : null;
                string name = def != null ? def.Name : r.ItemId;

                // 散开放，避免多件掉落挤在同一格互相覆盖
                TilePos at = world.FindFreeGroundTileNear(victim.Pos, 4);
                Entity loot = NewGroundItem(at, r.ItemId, name, r.Count);
                loot.Quality = r.Quality;
                world.Spawn(loot);
                world.Events.Publish(new ItemDropped
                {
                    ItemId = loot.Id, DefId = r.ItemId, Count = r.Count, At = at, Quality = r.Quality
                });
            }
        }

        private Entity NewGroundItem(TilePos at, string defId, string name, int count)
        {
            Entity loot = new Entity();
            loot.Kind = EntityKind.GroundItem;
            loot.DefId = defId;
            loot.SpriteId = defId;
            loot.Name = name;
            loot.BlocksTile = false;
            loot.Count = count;
            loot.LifetimeTicks = _tuning.GroundLootTicks;
            loot.Pos = at;
            loot.HomePos = at;
            return loot;
        }
    }
}
