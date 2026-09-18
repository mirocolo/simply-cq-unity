using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 商店面板：左边是商人的货，右边是你的背包。
    /// 皮肤走 <see cref="UiSkin"/>；交易只产出 Intent 交给 Simulation，界面自己不改 World。
    /// </summary>
    public sealed class ShopUi
    {
        private const float PanelX = 620f;
        private const float PanelY = 132f;
        private const float PanelW = 660f;
        private const float PanelH = 480f;
        private const float Pad = 8f;
        private const float ColW = 260f;
        private const float RowH = 24f;
        private const int MaxBagRows = 15;

        /// <summary>品质字色是逐品质的，所以这里按需建（皮肤那套固定样式覆盖不到）。</summary>
        private readonly GUIStyle[] _qualityLabels = new GUIStyle[ItemQualityRules.Count];

        private readonly World _world;
        private readonly IItemCatalog _catalog;
        private readonly ShopTuning _tuning;
        private readonly List<Intent> _pending = new List<Intent>();
        private readonly PanelDrag _drag = new PanelDrag();

        private bool _open;

        public ShopUi(World world, IItemCatalog catalog, ShopTuning tuning)
        {
            _world = world;
            _catalog = catalog;
            _tuning = tuning != null ? tuning : new ShopTuning();
            if (world != null) world.Events.Subscribe<ShopRefused>(OnRefused);
        }

        public string Hint { get; private set; }
        private float _hintUntil;

        public bool IsOpen { get { return _open; } }
        public bool MouseOver { get; private set; }
        public bool ConsumesMouse { get { return _open && MouseOver; } }

        public void Toggle() { _open = !_open; }
        public void Close() { _open = false; }

        public void DrainInto(List<Intent> target)
        {
            for (int i = 0; i < _pending.Count; i++) target.Add(_pending[i]);
            _pending.Clear();
        }

        private void OnRefused(ShopRefused evt)
        {
            Hint = "买不了：" + evt.Reason;
            _hintUntil = Time.timeSinceLevelLoad + 3f;
        }

        private void Queue(Intent intent) { _pending.Add(intent); }

        public void Draw()
        {
            if (!_open) return;

            Entity player = _world != null ? _world.Player : null;
            if (player == null) { _open = false; return; }

            // 走远了自动关掉
            Entity merchant = ShopSystem.NearestMerchant(_world, player);
            if (merchant == null) { _open = false; return; }

            Event e = Event.current;
            bool pressed, released;
            Vector2 mouse;
            PanelDrag.ReadMouse(e, out pressed, out released, out mouse);
            _drag.Handle(_drag.Apply(UiScale.R(PanelX, PanelY, PanelW, PanelH)), pressed, released, mouse);

            Rect r = _drag.Apply(UiScale.R(PanelX, PanelY, PanelW, PanelH));
            MouseOver = e != null && r.Contains(e.mousePosition);

            UiSkin.Panel(r, "商店 —— " + merchant.Name);
            GUI.Label(UiSkin.LRect(r, Pad, 28f, PanelW, 18f),
                "你的金币 " + player.Gold + "    （E 关闭，标题栏可拖动）", UiSkin.Styles.Label);

            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            DrawStock(r, player, merchant, leftDown, e);
            DrawBag(r, player, leftDown, e);

            if (!string.IsNullOrEmpty(Hint) && Time.timeSinceLevelLoad <= _hintUntil)
                UiSkin.Hint(UiSkin.LRect(r, Pad, PanelH - 32f, PanelW - Pad * 2f, 22f), Hint);
        }

        private void DrawStock(Rect r, Entity player, Entity merchant, bool leftDown, Event e)
        {
            GUI.Label(UiSkin.LRect(r, Pad, 54f, ColW, 18f), "—— 商人出售 ——", UiSkin.Styles.Group);

            int shown = 0;
            for (int i = 0; i < merchant.Shop.Stock.Count; i++)
            {
                ItemDef def = _catalog != null ? _catalog.Get(merchant.Shop.Stock[i]) : null;
                if (def == null) continue;

                Rect row = UiSkin.LRect(r, Pad, 78f + shown * RowH, ColW + 40f, RowH - 2f);
                bool hover = e != null && row.Contains(e.mousePosition);

                // 价格和品质都按物品表的 minQuality 算 —— 界面和逻辑层用同一套，才不会"报错价"
                int buyPrice = _tuning.BuyPriceOf(def, def.MinQuality);
                bool affordable = player.Gold >= buyPrice;

                UiSkin.Row(row, hover);

                GUI.Label(new Rect(row.x + UiScale.Px(6f), row.y + UiScale.Px(2f), row.width, UiScale.Px(20f)),
                    def.Name, QualityLabel(def.MinQuality));
                GUI.Label(UiSkin.LRect(r, Pad + ColW + 8f, 78f + shown * RowH, 60f, RowH),
                    buyPrice + " 金", affordable ? UiSkin.Styles.Value : UiSkin.Styles.Bad);

                if (affordable && hover && leftDown)
                    Queue(Intent.BagAction(player.Id, IntentKind.BuyItem, i));

                shown++;
            }
        }

        private void DrawBag(Rect r, Entity player, bool leftDown, Event e)
        {
            float rx = Pad + ColW + 76f;
            GUI.Label(UiSkin.LRect(r, rx, 54f, ColW, 18f), "—— 你的背包（点一下卖）——", UiSkin.Styles.Group);

            Inventory bag = player.Bag;
            if (bag == null) return;

            int shown = 0;
            for (int i = 0; i < Inventory.SlotCount && shown < MaxBagRows; i++)
            {
                ItemInstance item = bag.At(i);
                if (item == null) continue;

                ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
                if (def == null || def.Price <= 0) continue;

                Rect row = UiSkin.LRect(r, rx, 78f + shown * RowH, ColW + 40f, RowH - 2f);
                bool hover = e != null && row.Contains(e.mousePosition);

                UiSkin.Row(row, hover);

                string name = def.Name + (item.Count > 1 ? " x" + item.Count : "");
                GUI.Label(new Rect(row.x + UiScale.Px(6f), row.y + UiScale.Px(2f), row.width, UiScale.Px(20f)),
                    name, QualityLabel(item.Quality));

                // 卖掉的价格看的是【这一件】的品质：捡到史诗就是比白板值钱
                int sellPrice = _tuning.SellPriceOf(def, item.Quality);
                GUI.Label(UiSkin.LRect(r, rx + ColW + 8f, 78f + shown * RowH, 60f, RowH),
                    sellPrice + " 金", UiSkin.Styles.Value);

                if (hover && leftDown)
                    Queue(Intent.BagAction(player.Id, IntentKind.SellItem, i));

                shown++;
            }

            if (shown == 0)
                GUI.Label(UiSkin.LRect(r, rx, 80f, ColW, 18f), "背包里没有能卖的东西", UiSkin.Styles.Small);
        }

        /// <summary>按品质取文字样式（懒加载）。和背包面板同一套配色。</summary>
        private GUIStyle QualityLabel(ItemQuality q)
        {
            int i = (int)q;
            if (i < 0 || i >= _qualityLabels.Length) i = 0;
            if (_qualityLabels[i] == null)
            {
                GUIStyle s = new GUIStyle(UiSkin.Styles.Label);
                s.normal.textColor = ItemQualityStyle.Srgb((ItemQuality)i);
                _qualityLabels[i] = s;
            }
            return _qualityLabels[i];
        }
    }
}
