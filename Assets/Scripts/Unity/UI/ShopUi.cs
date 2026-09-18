using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 商店面板：左边是商人的货，右边是你的背包。
    /// 和背包面板同一套 IMGUI 画法（零资源、按 DPI 缩放）；
    /// 交易只产出 Intent 交给 Simulation，界面自己不改 World。
    /// </summary>
    public sealed class ShopUi
    {
        private const float PanelY = 132f;
        private const float PanelW = 620f;
        private const float PanelH = 470f;
        private const float Pad = 8f;
        private const float ColW = 250f;
        private const float RowH = 24f;
        private const int MaxBagRows = 15;

        private readonly World _world;
        private readonly IItemCatalog _catalog;
        private readonly ShopTuning _tuning;
        private readonly List<Intent> _pending = new List<Intent>();

        private bool _open;
        private GUIStyle _label;
        private GUIStyle _value;
        private GUIStyle _poor;
        private GUIStyle _small;
        private GUIStyle _title;
        private readonly GUIStyle[] _qualityLabels = new GUIStyle[ItemQualityRules.Count];

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

            EnsureStyles();

            Rect r = UiScale.R(660f, PanelY, PanelW, PanelH);
            Event e = Event.current;
            MouseOver = e != null && r.Contains(e.mousePosition);

            Fill(r, UiColor.Srgb(0.06f, 0.06f, 0.08f, 0.92f));
            Border(r, UiColor.Srgb(0.55f, 0.47f, 0.28f, 1f));
            GUI.Label(LRect(r, Pad, 4f, PanelW, 20f), "商店 —— " + merchant.Name, _title);
            GUI.Label(LRect(r, Pad, 28f, PanelW, 18f), "你的金币 " + player.Gold + "    （E 关闭）", _label);

            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            DrawStock(r, player, merchant, leftDown, e);
            DrawBag(r, player, leftDown, e);
            DrawHint(r);
        }

        private void DrawStock(Rect r, Entity player, Entity merchant, bool leftDown, Event e)
        {
            GUI.Label(LRect(r, Pad, 54f, ColW, 18f), "—— 商人出售 ——", _title);

            int shown = 0;
            for (int i = 0; i < merchant.Shop.Stock.Count; i++)
            {
                ItemDef def = _catalog != null ? _catalog.Get(merchant.Shop.Stock[i]) : null;
                if (def == null) continue;

                Rect row = LRect(r, Pad, 78f + shown * RowH, ColW + 40f, RowH - 2f);
                bool hover = e != null && row.Contains(e.mousePosition);

                // 商人的货是白板 —— 价格用和逻辑层同一个方法算，界面才不会"报错价"
                int buyPrice = _tuning.BuyPriceOf(def, ItemQuality.White);
                bool affordable = player.Gold >= buyPrice;

                Fill(row, hover ? UiColor.Srgb(0.30f, 0.28f, 0.18f, 0.95f) : UiColor.Srgb(0.15f, 0.14f, 0.13f, 0.92f));
                Border(row, UiColor.Srgb(0.44f, 0.39f, 0.26f, 1f));

                GUI.Label(new Rect(row.x + UiScale.Px(6f), row.y + UiScale.Px(2f), row.width, UiScale.Px(20f)), def.Name, _label);
                GUI.Label(LRect(r, Pad + ColW + 8f, 78f + shown * RowH, 60f, RowH), buyPrice + " 金", affordable ? _value : _poor);

                if (affordable && hover && leftDown)
                    Queue(Intent.BagAction(player.Id, IntentKind.BuyItem, i));

                shown++;
            }
        }

        private void DrawBag(Rect r, Entity player, bool leftDown, Event e)
        {
            float rx = Pad + ColW + 76f;
            GUI.Label(LRect(r, rx, 54f, ColW, 18f), "—— 你的背包（点一下卖）——", _title);

            Inventory bag = player.Bag;
            if (bag == null) return;

            int shown = 0;
            for (int i = 0; i < Inventory.SlotCount && shown < MaxBagRows; i++)
            {
                ItemInstance item = bag.At(i);
                if (item == null) continue;

                ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
                if (def == null || def.Price <= 0) continue;

                Rect row = LRect(r, rx, 78f + shown * RowH, ColW + 40f, RowH - 2f);
                bool hover = e != null && row.Contains(e.mousePosition);

                Fill(row, hover ? UiColor.Srgb(0.30f, 0.28f, 0.18f, 0.95f) : UiColor.Srgb(0.15f, 0.14f, 0.13f, 0.92f));
                Border(row, UiColor.Srgb(0.44f, 0.39f, 0.26f, 1f));

                string name = def.Name + (item.Count > 1 ? " x" + item.Count : "");
                GUI.Label(new Rect(row.x + UiScale.Px(6f), row.y + UiScale.Px(2f), row.width, UiScale.Px(20f)), name, QualityLabel(item.Quality));

                // 卖掉的价格看的是【这一件】的品质：捡到史诗就是比白板值钱
                int sellPrice = _tuning.SellPriceOf(def, item.Quality);
                GUI.Label(LRect(r, rx + ColW + 8f, 78f + shown * RowH, 60f, RowH), sellPrice + " 金", _value);

                if (hover && leftDown)
                    Queue(Intent.BagAction(player.Id, IntentKind.SellItem, i));

                shown++;
            }

            if (shown == 0)
                GUI.Label(LRect(r, rx, 80f, ColW, 18f), "背包里没有能卖的东西", _small);
        }

        private void DrawHint(Rect r)
        {
            if (string.IsNullOrEmpty(Hint)) return;
            if (Time.timeSinceLevelLoad > _hintUntil) { Hint = ""; return; }
            GUI.Label(LRect(r, Pad, PanelH - 30f, PanelW, 20f), Hint, _poor);
        }

        // ------------------------------------------------------------------ 画图小工具

        private static Rect LRect(Rect outer, float lx, float ly, float lw, float lh)
        {
            return new Rect(outer.x + UiScale.Px(lx), outer.y + UiScale.Px(ly), UiScale.Px(lw), UiScale.Px(lh));
        }

        /// <summary>按品质取文字样式（懒加载）。和背包面板同一套配色。</summary>
        private GUIStyle QualityLabel(ItemQuality q)
        {
            int i = (int)q;
            if (i < 0 || i >= _qualityLabels.Length) i = 0;
            if (_qualityLabels[i] == null)
            {
                GUIStyle s = new GUIStyle(GUI.skin.label);
                s.fontSize = UiScale.Font(13);
                s.normal.textColor = ItemQualityStyle.Srgb((ItemQuality)i);
                _qualityLabels[i] = s;
            }
            return _qualityLabels[i];
        }

        private static void Fill(Rect r, Color c)
        {
            Color prev = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, Texture2D.whiteTexture);
            GUI.color = prev;
        }

        private static void Border(Rect r, Color c)
        {
            Fill(new Rect(r.x, r.y, r.width, 1f), c);
            Fill(new Rect(r.x, r.yMax - 1f, r.width, 1f), c);
            Fill(new Rect(r.x, r.y, 1f, r.height), c);
            Fill(new Rect(r.xMax - 1f, r.y, 1f, r.height), c);
        }

        private void EnsureStyles()
        {
            if (_label != null) return;

            _label = new GUIStyle(GUI.skin.label);
            _label.fontSize = UiScale.Font(13);
            _label.normal.textColor = UiColor.Srgb(0.92f, 0.92f, 0.88f);

            _value = new GUIStyle(GUI.skin.label);
            _value.fontSize = UiScale.Font(13);
            _value.normal.textColor = UiColor.Srgb(1f, 0.86f, 0.35f);

            _poor = new GUIStyle(GUI.skin.label);
            _poor.fontSize = UiScale.Font(13);
            _poor.normal.textColor = UiColor.Srgb(1f, 0.45f, 0.40f);

            _small = new GUIStyle(GUI.skin.label);
            _small.fontSize = UiScale.Font(12);
            _small.normal.textColor = UiColor.Srgb(0.72f, 0.70f, 0.62f);

            _title = new GUIStyle(GUI.skin.label);
            _title.fontSize = UiScale.Font(14);
            _title.normal.textColor = UiColor.Srgb(1f, 0.90f, 0.55f);
        }
    }
}
