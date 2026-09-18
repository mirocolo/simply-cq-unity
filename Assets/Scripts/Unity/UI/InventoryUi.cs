using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 背包面板 + 角色面板。
    ///
    /// 为什么用 IMGUI（OnGUI）而不是 UGUI：这个项目整套界面都是 OnGUI 画的（HUD、伤害飘字、
    /// 商店、传送员、调参面板），零 prefab、零美术资源。以后要换 UGUI / UI Toolkit，
    /// 只需要替换这几个 Ui 类，Domain 一行都不用动。
    ///
    /// 皮肤（配色 / 金边 / 标题栏 / 字号 / 分段血条）全部走 <see cref="UiSkin"/> ——
    /// 以前每个面板各画各的，改一次配色要动五个文件。
    ///
    /// 布局全部按"逻辑单位"写（基准 1080 高），真正落屏时由 UiScale 等比放大 ——
    /// 否则 Retina 屏上字小得看不清。
    ///
    /// 交互只产出 Intent 交给 Simulation；界面自己绝不改 World。
    /// </summary>
    public sealed class InventoryUi
    {
        private const float Cell = 46f;
        private const float Gap = 2f;
        private const float Pad = 7f;
        private const float WindowY = 132f;
        private const float WindowW = 340f;
        private const float WindowH = 566f;
        private const float GearRowH = 30f;

        private static readonly string[] SlotNames =
        {
            "-", "武器", "衣服", "头盔", "项链", "手镯", "戒指", "腰带", "靴子"
        };

        private readonly World _world;
        private readonly IItemCatalog _catalog;
        private readonly ShopTuning _shop;
        private readonly List<Intent> _pending = new List<Intent>();
        private readonly PanelDrag _bagDrag = new PanelDrag();
        private readonly PanelDrag _charDrag = new PanelDrag();

        /// <summary>按品质缓存的文字样式（白/绿/蓝/紫各一份）。</summary>
        private readonly GUIStyle[] _qualityLabels = new GUIStyle[ItemQualityRules.Count];

        private bool _bagOpen = true;
        private bool _charOpen;
        private int _hoverBag = -1;
        private int _hoverGear = -1;
        private string _hint = "";
        private float _hintUntil;

        private Rect _bagRect;
        private Rect _charRect;

        public InventoryUi(World world, IItemCatalog catalog, ShopTuning shop)
        {
            _world = world;
            _catalog = catalog;
            _shop = shop != null ? shop : new ShopTuning();
            if (world != null) world.Events.Subscribe<PickupRefused>(OnPickupRefused);
        }

        /// <summary>逻辑 tick 频率，用来把攻击间隔换算成秒。</summary>
        public float TickRate = 10f;

        public bool AnyOpen { get { return _bagOpen || _charOpen; } }
        public bool MouseOverPanel { get; private set; }
        public bool ConsumesMouse { get { return AnyOpen && MouseOverPanel; } }
        public bool BagOpen { get { return _bagOpen; } }
        public bool CharOpen { get { return _charOpen; } }

        public void ToggleBag() { _bagOpen = !_bagOpen; }
        public void ToggleChar() { _charOpen = !_charOpen; }

        public void SetHint(string hint)
        {
            _hint = hint;
            _hintUntil = Time.timeSinceLevelLoad + 3f;
        }

        public void DrainInto(List<Intent> target)
        {
            for (int i = 0; i < _pending.Count; i++) target.Add(_pending[i]);
            _pending.Clear();
        }

        private void Queue(Intent intent) { _pending.Add(intent); }

        private void OnPickupRefused(PickupRefused evt)
        {
            SetHint("捡不起来：" + evt.Reason);
        }

        // ------------------------------------------------------------------ 布局

        private Rect BagWindow()
        {
            float w = Inventory.Columns * (Cell + Gap) + Gap + Pad * 2f;
            return _bagDrag.Apply(UiScale.R(10f, WindowY, w, WindowH));
        }

        private Rect CharWindow()
        {
            Rect bag = BagWindow();
            return _charDrag.Apply(new Rect(bag.xMax + UiScale.Px(8f), UiScale.Px(WindowY),
                                            UiScale.Px(WindowW), UiScale.Px(WindowH)));
        }

        // ------------------------------------------------------------------ 入口

        public void Draw()
        {
            Event e = Event.current;

            Entity player = _world != null ? _world.Player : null;
            if (player == null) return;

            bool pressed, released;
            Vector2 mouse;
            PanelDrag.ReadMouse(e, out pressed, out released, out mouse);

            if (_bagOpen) _bagDrag.Handle(BagWindow(), pressed, released, mouse);
            if (_charOpen) _charDrag.Handle(CharWindow(), pressed, released, mouse);

            _bagRect = BagWindow();
            _charRect = CharWindow();
            MouseOverPanel = e != null
                && ((_bagOpen && _bagRect.Contains(e.mousePosition))
                    || (_charOpen && _charRect.Contains(e.mousePosition)));

            if (_bagOpen) DrawBag(player, e);
            if (_charOpen) DrawChar(player, e);
            DrawHint();
        }

        // ------------------------------------------------------------------ 背包

        private void DrawBag(Entity player, Event e)
        {
            Inventory bag = player.Bag;
            if (bag == null) return;

            Rect r = _bagRect;
            UiSkin.Panel(r, "背包   (I 关闭，标题栏可拖动)");

            GUI.Label(UiSkin.LRect(r, Pad, 28f, 280f, 18f),
                "金币 " + player.Gold + "      格子 " + bag.UsedSlots + " / " + Inventory.SlotCount,
                UiSkin.Styles.Label);

            float cell = UiScale.Px(Cell);
            float step = UiScale.Px(Cell + Gap);
            float gx = r.x + UiScale.Px(Pad + Gap);
            float gy = r.y + UiScale.Px(54f);

            _hoverBag = -1;
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;
            bool rightDown = e != null && e.type == EventType.MouseDown && e.button == 1;

            for (int row = 0; row < Inventory.Rows; row++)
            {
                for (int col = 0; col < Inventory.Columns; col++)
                {
                    int index = row * Inventory.Columns + col;
                    Rect cellRect = new Rect(gx + col * step, gy + row * step, cell, cell);

                    bool hover = e != null && cellRect.Contains(e.mousePosition);
                    if (hover) _hoverBag = index;

                    ItemInstance item = bag.At(index);
                    ItemDef def = item != null && _catalog != null ? _catalog.Get(item.DefId) : null;

                    UiSkin.Cell(cellRect, hover && item != null);

                    if (item != null)
                    {
                        DrawIcon(cellRect, item);
                        QualityStripe(cellRect, item.Quality);
                        if (item.Count > 1)
                            GUI.Label(new Rect(cellRect.xMax - UiScale.Px(20f), cellRect.yMax - UiScale.Px(18f),
                                    UiScale.Px(20f), UiScale.Px(16f)),
                                item.Count.ToString(), UiSkin.Styles.Small);
                    }

                    if (item != null && hover && leftDown)
                    {
                        bool isEquip = def != null && def.IsEquip;
                        Queue(Intent.BagAction(player.Id,
                            isEquip ? IntentKind.EquipItem : IntentKind.UseItem, index));
                    }
                    else if (item != null && hover && rightDown)
                    {
                        Queue(Intent.BagAction(player.Id, IntentKind.DropItem, index));
                    }
                }
            }

            if (_hoverBag >= 0 && e != null)
            {
                ItemInstance item = bag.At(_hoverBag);
                if (item != null) DrawTooltip(_catalog != null ? _catalog.Get(item.DefId) : null, item, e.mousePosition);
            }
        }

        // ------------------------------------------------------------------ 角色

        private void DrawChar(Entity player, Event e)
        {
            Rect r = _charRect;
            UiSkin.Panel(r, "角色   (C 关闭，标题栏可拖动)");

            GUI.Label(UiSkin.LRect(r, Pad, 28f, 160f, 18f), "Lv." + player.Level, UiSkin.Styles.Value);
            GUI.Label(UiSkin.LRect(r, 150f, 28f, 190f, 18f), "金币 " + player.Gold, UiSkin.Styles.Label);

            // 分段血条 / 经验条 / 蓝条：一眼能估出还剩几格
            UiSkin.Bar(UiSkin.LRect(r, Pad, 50f, WindowW - Pad * 2f, 16f),
                player.MaxHp > 0 ? player.Hp / (float)player.MaxHp : 0f,
                UiSkin.HpFill, "生命  " + player.Hp + " / " + player.MaxHp);

            UiSkin.Bar(UiSkin.LRect(r, Pad, 70f, WindowW - Pad * 2f, 16f),
                player.ExpToNextLevel > 0 ? player.Exp / (float)player.ExpToNextLevel : 0f,
                UiSkin.ExpFill, "经验  " + player.Exp + " / " + player.ExpToNextLevel);

            UiSkin.Bar(UiSkin.LRect(r, Pad, 90f, WindowW - Pad * 2f, 16f),
                player.MaxMp > 0 ? player.Mp / (float)player.MaxMp : 0f,
                UiSkin.MpFill, "魔法  " + player.Mp + " / " + player.MaxMp);

            int gearMin, gearMax, gearAc, gearHp;
            SumGearBonus(player, out gearMin, out gearMax, out gearAc, out gearHp);

            float y = 116f;
            StatBlock(r, y, "攻击", player.MinDc + " - " + player.MaxDc,
                "基础 " + player.BaseMinDc + "-" + player.BaseMaxDc,
                (gearMin > 0 || gearMax > 0) ? "装备 +" + gearMin + "~+" + gearMax : "");
            y += 38f;

            StatBlock(r, y, "防御", player.Ac.ToString(),
                "基础 " + player.BaseAc,
                gearAc > 0 ? "装备 +" + gearAc : "");
            y += 38f;

            StatBlock(r, y, "生命", player.MaxHp.ToString(),
                "基础 " + player.BaseMaxHp,
                gearHp > 0 ? "装备 +" + gearHp : "");
            y += 38f;

            StatBlock(r, y, "攻速", (TickRate / Mathf.Max(1, player.AttackInterval)).ToString("0.0") + " 次/秒",
                "间隔 " + player.AttackInterval + " tick", "");
            y += 38f;

            if (player.Mc > 0 || player.Sc > 0)
            {
                StatBlock(r, y, "魔法", player.Mc.ToString(), "基础 " + player.BaseMc, "");
                y += 38f;
                StatBlock(r, y, "道术", player.Sc.ToString(), "基础 " + player.BaseSc, "");
                y += 38f;
            }
            else
            {
                GUI.Label(UiSkin.LRect(r, Pad, y, WindowW - Pad * 2f, 18f),
                    "魔法 / 道术：三职业在 M4 开放", UiSkin.Styles.Small);
                y += 26f;
            }

            GUI.Label(UiSkin.LRect(r, Pad, y, WindowW - Pad * 2f, 18f),
                "—— 装备（左键点一下卸下）——", UiSkin.Styles.Group);
            y += 24f;

            _hoverGear = -1;
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            for (int i = 1; i < ItemDef.SlotCount; i++)
            {
                EquipSlot slot = (EquipSlot)i;
                Rect row = UiSkin.LRect(r, Pad, y + (i - 1) * GearRowH, WindowW - Pad * 2f, GearRowH - 3f);
                ItemInstance worn = player.Gear != null ? player.Gear.Get(slot) : null;
                ItemDef def = worn != null && _catalog != null ? _catalog.Get(worn.DefId) : null;

                bool hover = e != null && row.Contains(e.mousePosition);
                if (hover) _hoverGear = i;

                UiSkin.Cell(row, hover && worn != null);

                if (def != null)
                {
                    DrawIcon(new Rect(row.x + UiScale.Px(3f), row.y + UiScale.Px(3f),
                             UiScale.Px(21f), UiScale.Px(21f)), worn);
                    QualityStripe(row, worn.Quality);
                }

                string text = SlotNames[i] + "     " + (def != null ? def.Name : "（空）");
                GUI.Label(new Rect(row.x + UiScale.Px(28f), row.y + UiScale.Px(5f), row.width, UiScale.Px(20f)),
                    text, def != null ? QualityLabel(worn.Quality) : UiSkin.Styles.Small);

                if (worn != null && hover && leftDown)
                    Queue(Intent.BagAction(player.Id, IntentKind.UnequipItem, i));
            }

            if (_hoverGear > 0 && e != null)
            {
                ItemInstance worn = player.Gear != null ? player.Gear.Get((EquipSlot)_hoverGear) : null;
                if (worn != null) DrawTooltip(_catalog != null ? _catalog.Get(worn.DefId) : null, worn, e.mousePosition);
            }
        }

        private void SumGearBonus(Entity p, out int minDc, out int maxDc, out int ac, out int hp)
        {
            minDc = 0; maxDc = 0; ac = 0; hp = 0;
            if (p.Gear == null || _catalog == null) return;

            foreach (ItemInstance worn in p.Gear.All)
            {
                ItemDef def = _catalog.Get(worn.DefId);
                if (def == null) continue;
                minDc += ItemQualityRules.Scale(def.MinDc, worn.Quality);
                maxDc += ItemQualityRules.Scale(def.MaxDc, worn.Quality);
                ac += ItemQualityRules.Scale(def.Ac, worn.Quality);
                hp += ItemQualityRules.Scale(def.BonusHp, worn.Quality);
            }
        }

        // ------------------------------------------------------------------ 小件

        private void StatBlock(Rect outer, float ly, string name, string total, string baseText, string bonusText)
        {
            GUI.Label(UiSkin.LRect(outer, Pad + 4f, ly, 60f, 18f), name, UiSkin.Styles.Small);
            GUI.Label(UiSkin.LRect(outer, Pad + 62f, ly, 130f, 18f), total, UiSkin.Styles.Value);
            GUI.Label(UiSkin.LRect(outer, Pad + 22f, ly + 17f, 170f, 17f), baseText, UiSkin.Styles.Small);
            if (!string.IsNullOrEmpty(bonusText))
                GUI.Label(UiSkin.LRect(outer, Pad + 132f, ly + 17f, 170f, 17f), bonusText, UiSkin.Styles.Good);
        }

        /// <summary>格子/那一行左边的一条品质色带。白装不画（保持金色框那套原生观感）。</summary>
        private void QualityStripe(Rect r, ItemQuality q)
        {
            if (q == ItemQuality.White) return;
            UiSkin.Fill(new Rect(r.x, r.y, UiScale.Px(3f), r.height), ItemQualityStyle.Srgb(q));
        }

        private void DrawIcon(Rect cell, ItemInstance item)
        {
            ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
            ItemType type = def != null ? def.Type : ItemType.Material;
            string key = def != null ? def.SpriteId : item.DefId;
            Sprite sprite = PlaceholderArt.ItemIcon(key, type, 32);
            if (sprite == null || sprite.texture == null) return;

            float inset = UiScale.Px(6f);
            GUI.DrawTexture(new Rect(cell.x + inset, cell.y + inset,
                cell.width - inset * 2f, cell.height - inset * 2f), sprite.texture);
        }

        private void DrawTooltip(ItemDef def, ItemInstance item, Vector2 mouse)
        {
            if (def == null) return;

            // 显示的是【这一件】的实际数值（按品质放大过），和面板/战斗用的是同一套换算
            ItemQuality q = item != null ? item.Quality : ItemQuality.White;

            string body = "";
            if (def.IsEquip)
            {
                int minDc = ItemQualityRules.Scale(def.MinDc, q);
                int maxDc = ItemQualityRules.Scale(def.MaxDc, q);
                int ac = ItemQualityRules.Scale(def.Ac, q);
                int hp = ItemQualityRules.Scale(def.BonusHp, q);

                if (minDc > 0 || maxDc > 0) body += "攻击 " + minDc + "-" + maxDc + "   ";
                if (ac > 0) body += "防御 " + ac + "   ";
                if (hp > 0) body += "生命 +" + hp + "   ";
                if (def.LevelReq > 1) body += "\n要求等级 " + def.LevelReq;
                body += "\n左键穿上";
            }
            else if (def.Type == ItemType.Consumable)
            {
                if (def.HealHp > 0) body += "恢复生命 " + def.HealHp + "   ";
                if (def.HealMp > 0) body += "恢复魔法 " + def.HealMp;
                body += "\n左键使用";
            }
            else
            {
                body += "材料，可以卖钱";
            }

            if (!string.IsNullOrEmpty(def.Description)) body += "\n" + def.Description;

            // 售价走和商店同一个算法，界面才不会报错价
            body += "\n售价 " + _shop.SellPriceOf(def, q) + " 金币";

            int lines = body.Split('\n').Length;
            float lw = 240f;
            float lh = 50f + lines * 18f;

            float mx = mouse.x + UiScale.Px(16f);
            float my = mouse.y + UiScale.Px(12f);
            Rect r = new Rect(mx, my, UiScale.Px(lw), UiScale.Px(lh));
            if (r.xMax > Screen.width) r.x = Screen.width - r.width - UiScale.Px(4f);
            if (r.yMax > Screen.height) r.y = Screen.height - r.height - UiScale.Px(4f);

            UiSkin.Fill(r, UiColor.Srgb(0.035f, 0.033f, 0.040f, 0.97f));
            UiSkin.Border(r, def.IsEquip ? ItemQualityStyle.Srgb(q) : UiSkin.PanelBorderInner, 1f);

            string name = ItemQualityStyle.TitledName(q, def.Name)
                          + (item != null && item.Count > 1 ? "  x" + item.Count : "");

            GUI.Label(new Rect(r.x + UiScale.Px(7f), r.y + UiScale.Px(4f), r.width, UiScale.Px(18f)),
                name, def.IsEquip ? QualityLabel(q) : UiSkin.Styles.Title);
            GUI.Label(new Rect(r.x + UiScale.Px(7f), r.y + UiScale.Px(26f), r.width, r.height),
                body, UiSkin.Styles.Small);
        }

        private void DrawHint()
        {
            if (string.IsNullOrEmpty(_hint)) return;
            if (_hintUntil > 0f && Time.timeSinceLevelLoad > _hintUntil)
            {
                _hint = "";
                _hintUntil = 0f;
                return;
            }

            Rect r = new Rect(Screen.width * 0.5f - UiScale.Px(190f), Screen.height - UiScale.Px(52f),
                              UiScale.Px(380f), UiScale.Px(26f));
            UiSkin.Hint(r, _hint);
        }

        /// <summary>按品质取文字样式（懒加载）。</summary>
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
