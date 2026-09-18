using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 物品操作：使用 / 穿戴 / 卸下 / 丢地上。
    /// 全部是纯逻辑静态方法，所以可以脱离 Unity 直接测。
    /// </summary>
    public sealed class ItemSystem : ISystem
    {
        private readonly IItemCatalog _catalog;

        public ItemSystem(IItemCatalog catalog) { _catalog = catalog; }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            for (int i = 0; i < intents.Count; i++)
            {
                Intent it = intents[i];
                switch (it.Kind)
                {
                    case IntentKind.UseItem:
                        Use(world, world.Get(it.Actor), it.Slot, _catalog);
                        break;
                    case IntentKind.EquipItem:
                        Equip(world, world.Get(it.Actor), it.Slot, _catalog);
                        break;
                    case IntentKind.UnequipItem:
                        Unequip(world, world.Get(it.Actor), (EquipSlot)it.Slot, _catalog);
                        break;
                    case IntentKind.DropItem:
                        Drop(world, world.Get(it.Actor), it.Slot, _catalog);
                        break;
                }
            }
        }

        // ------------------------------------------------------------------ 使用

        public static bool Use(World world, Entity e, int bagSlot, IItemCatalog catalog)
        {
            if (e == null || !e.IsAlive || e.Bag == null) return false;

            ItemInstance slot = e.Bag.At(bagSlot);
            if (slot == null) return false;
            ItemDef def = catalog != null ? catalog.Get(slot.DefId) : null;
            if (def == null) return false;
            if (def.Type != ItemType.Consumable) return false;

            bool changed = false;
            if (def.HealHp > 0)
            {
                int before = e.Hp;
                e.Hp += def.HealHp;
                if (e.Hp > e.MaxHp) e.Hp = e.MaxHp;
                changed |= e.Hp != before;
            }
            if (def.HealMp > 0)
            {
                int before = e.Mp;
                e.Mp += def.HealMp;
                if (e.Mp > e.MaxMp) e.Mp = e.MaxMp;
                changed |= e.Mp != before;
            }
            if (!changed) return false;

            e.Bag.RemoveAt(bagSlot, 1);
            world.Events.Publish(new ItemUsed { By = e.Id, DefId = def.Id });
            world.Events.Publish(new InventoryChanged { Id = e.Id });
            return true;
        }

        // ------------------------------------------------------------------ 穿戴

        public static bool Equip(World world, Entity e, int bagSlot, IItemCatalog catalog)
        {
            if (e == null || e.Bag == null || e.Gear == null) return false;

            ItemInstance slot = e.Bag.At(bagSlot);
            if (slot == null) return false;
            ItemDef def = catalog != null ? catalog.Get(slot.DefId) : null;
            if (def == null || !def.IsEquip) return false;
            if (e.Level < def.LevelReq) return false;

            // 先把旧的摘下来，确认放得回去再真正换，避免装备凭空消失
            ItemInstance old = e.Gear.Get(def.Slot);
            if (old != null)
            {
                if (!e.Bag.CanAdd(catalog != null ? catalog.Get(old.DefId) : null, old.Count)) return false;
            }

            // 关键：先克隆再移出背包。
            // Inventory.RemoveAt 会把那个 ItemInstance 的 Count 减到 0（它就是背包里那一个对象），
            // 如果直接把它塞进装备栏，装备的 Count 就会是 0 —— 之后换装/卸下会全部失败，
            // 换下来的旧装备也会因为 Add(x, 0) 而凭空消失。
            ItemInstance toWear = slot.Clone();
            if (!e.Bag.RemoveAt(bagSlot, 1)) return false;

            ItemInstance replaced = e.Gear.Set(def.Slot, toWear);
            if (replaced != null)
            {
                ItemDef oldDef = catalog != null ? catalog.Get(replaced.DefId) : null;
                e.Bag.Add(oldDef, replaced.Count, replaced.Quality);
            }

            StatCalculator.Apply(e, catalog);
            world.Events.Publish(new EquipmentChanged { Id = e.Id, Slot = def.Slot, DefId = def.Id });
            world.Events.Publish(new InventoryChanged { Id = e.Id });
            return true;
        }

        public static bool Unequip(World world, Entity e, EquipSlot gearSlot, IItemCatalog catalog)
        {
            if (e == null || e.Bag == null || e.Gear == null) return false;
            if (gearSlot == EquipSlot.None) return false;

            ItemInstance worn = e.Gear.Get(gearSlot);
            if (worn == null) return false;

            ItemDef def = catalog != null ? catalog.Get(worn.DefId) : null;
            if (!e.Bag.CanAdd(def, worn.Count)) return false;

            e.Gear.Clear(gearSlot);
            e.Bag.Add(def, worn.Count, worn.Quality);

            StatCalculator.Apply(e, catalog);
            world.Events.Publish(new EquipmentChanged { Id = e.Id, Slot = gearSlot, DefId = worn.DefId });
            world.Events.Publish(new InventoryChanged { Id = e.Id });
            return true;
        }

        // ------------------------------------------------------------------ 丢地上

        public static bool Drop(World world, Entity e, int bagSlot, IItemCatalog catalog)
        {
            if (e == null || e.Bag == null) return false;

            ItemInstance slot = e.Bag.At(bagSlot);
            if (slot == null) return false;
            ItemDef def = catalog != null ? catalog.Get(slot.DefId) : null;

            e.Bag.RemoveAt(bagSlot, 1);

            TilePos at = world.FindFreeGroundTileNear(e.Pos, 3);
            Entity loot = new Entity();
            loot.Kind = EntityKind.GroundItem;
            loot.DefId = slot.DefId;
            loot.SpriteId = def != null ? def.SpriteId : slot.DefId;
            loot.Name = def != null ? def.Name : slot.DefId;
            loot.BlocksTile = false;
            loot.Count = 1;
            loot.Quality = slot.Quality;
            loot.LifetimeTicks = 0;    // 玩家自己丢的不消失
            loot.Pos = at;
            loot.HomePos = at;
            world.Spawn(loot);

            world.Events.Publish(new ItemDropped { ItemId = loot.Id, DefId = slot.DefId, Count = 1, At = at });
            world.Events.Publish(new InventoryChanged { Id = e.Id });
            return true;
        }
    }
}
