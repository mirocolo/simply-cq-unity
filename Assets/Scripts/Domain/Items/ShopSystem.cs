using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    /// <summary>
    /// 买卖。交易是"扣钱 + 拿货"的两步操作，任何一步失败都必须给可见理由，
    /// 而且失败时绝不能出现"钱扣了货没给"。
    /// </summary>
    public sealed class ShopSystem : ISystem
    {
        /// <summary>和商人交易的最大距离（切比雪夫格）。</summary>
        public const int InteractRange = 2;

        private readonly IItemCatalog _catalog;
        private readonly ShopTuning _tuning;

        public ShopSystem(IItemCatalog catalog, ShopTuning tuning)
        {
            _catalog = catalog;
            _tuning = tuning != null ? tuning : new ShopTuning();
        }

        public void Tick(World world, IReadOnlyList<Intent> intents)
        {
            for (int i = 0; i < intents.Count; i++)
            {
                Intent it = intents[i];
                switch (it.Kind)
                {
                    case IntentKind.BuyItem:
                        Buy(world, world.Get(it.Actor), it.Slot, _catalog, _tuning);
                        break;
                    case IntentKind.SellItem:
                        Sell(world, world.Get(it.Actor), it.Slot, _catalog, _tuning);
                        break;
                }
            }
        }

        /// <summary>离 actor 最近、且在交互距离内的商人。</summary>
        public static Entity NearestMerchant(World world, Entity actor)
        {
            if (world == null || actor == null) return null;

            Entity best = null;
            int bestDist = int.MaxValue;
            foreach (Entity e in world.Entities)
            {
                if (e.Shop == null || !e.Shop.IsMerchant) continue;
                if (!e.IsAlive) continue;
                int dist = actor.Pos.ChebyshevTo(e.Pos);
                if (dist > InteractRange) continue;
                if (dist < bestDist) { bestDist = dist; best = e; }
            }
            return best;
        }

        public static bool Buy(World world, Entity buyer, int stockIndex, IItemCatalog catalog, ShopTuning tuning)
        {
            if (world == null || buyer == null || !buyer.IsAlive || buyer.Bag == null) return false;

            Entity merchant = NearestMerchant(world, buyer);
            if (merchant == null)
            {
                Refuse(world, buyer, "附近没有商人");
                return false;
            }

            if (stockIndex < 0 || stockIndex >= merchant.Shop.Stock.Count) return false;

            string itemId = merchant.Shop.Stock[stockIndex];
            ItemDef def = catalog != null ? catalog.Get(itemId) : null;
            if (def == null)
            {
                Refuse(world, buyer, "货物数据缺失：" + itemId);
                return false;
            }

            // 商人的货一律是白板 —— 好东西不卖，靠打（这也让品质倍率只在掉落侧生效）
            ShopTuning bt = tuning != null ? tuning : new ShopTuning();
            int price = bt.BuyPriceOf(def, ItemQuality.White);
            if (buyer.Gold < price)
            {
                Refuse(world, buyer, "金币不够（要 " + price + "，你有 " + buyer.Gold + "）");
                return false;
            }
            if (!buyer.Bag.CanAdd(def, 1))
            {
                Refuse(world, buyer, "背包满了");
                return false;
            }

            buyer.Gold -= price;
            buyer.Bag.Add(def, 1, ItemQuality.White);

            world.Events.Publish(new ItemBought { By = buyer.Id, DefId = def.Id, Count = 1, Gold = price });
            world.Events.Publish(new InventoryChanged { Id = buyer.Id });
            return true;
        }

        public static bool Sell(World world, Entity seller, int bagSlot, IItemCatalog catalog, ShopTuning tuning)
        {
            if (world == null || seller == null || !seller.IsAlive || seller.Bag == null) return false;

            Entity merchant = NearestMerchant(world, seller);
            if (merchant == null)
            {
                Refuse(world, seller, "附近没有商人");
                return false;
            }

            ItemInstance slot = seller.Bag.At(bagSlot);
            if (slot == null) return false;

            ItemDef def = catalog != null ? catalog.Get(slot.DefId) : null;
            if (def == null || def.Price <= 0)
            {
                Refuse(world, seller, "这东西卖不了钱");
                return false;
            }

            ShopTuning t = tuning != null ? tuning : new ShopTuning();
            int price = t.SellPriceOf(def, slot.Quality);

            // 按格子精确移除：界面传进来的就是那一格，按 id 移除可能动到别的堆
            if (!seller.Bag.RemoveAt(bagSlot, 1))
            {
                Refuse(world, seller, "背包里没有这件东西");
                return false;
            }

            seller.Gold += price;
            world.Events.Publish(new ItemSold { By = seller.Id, DefId = def.Id, Count = 1, Gold = price });
            world.Events.Publish(new InventoryChanged { Id = seller.Id });
            return true;
        }

        private static void Refuse(World world, Entity who, string reason)
        {
            world.Events.Publish(new ShopRefused { By = who.Id, Reason = reason });
        }
    }
}
