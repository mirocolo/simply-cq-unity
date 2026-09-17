using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 背包面板 + 角色面板。
    ///
    /// 为什么用 IMGUI（OnGUI）而不是 UGUI：这个项目整套界面现在都是 OnGUI 画的（HUD、伤害飘字），
    /// 零 prefab、零美术资源，M3 阶段先把玩法闭环打通最划算。
    /// 以后要换 UGUI / UI Toolkit，只需要替换这一个类。
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
        private readonly List<Intent> _pending = new List<Intent>();

        private bool _bagOpen = true;
        private bool _charOpen;
        private int _hoverBag = -1;
        private int _hoverGear = -1;
        private string _hint = "";
        private float _hintUntil;

        private GUIStyle _label;
        private GUIStyle _value;
        private GUIStyle _bonus;
        private GUIStyle _small;
        private GUIStyle _title;
        private GUIStyle _tipTitle;
        private GUIStyle _tipBody;

        private static Rect _bagRect;
        private static Rect _charRect;

        public InventoryUi(World world, IItemCatalog catalog)
        {
            _world = world;
            _catalog = catalog;
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

        // ------------------------------------------------------------------ 布局（逻辑单位）

        private static Rect BagWindow()
        {
            float w = Inventory.Columns * (Cell + Gap) + Gap + Pad * 2f;
            return UiScale.R(10f, WindowY, w, WindowH);
        }

        private static Rect CharWindow()
        {
            Rect bag = BagWindow();
            return new Rect(bag.xMax + UiScale.Px(8f), UiScale.Px(WindowY), UiScale.Px(WindowW), UiScale.Px(WindowH));
        }

        private static Rect LRect(Rect outer, float lx, float ly, float lw, float lh)
        {
            return new Rect(outer.x + UiScale.Px(lx), outer.y + UiScale.Px(ly), UiScale.Px(lw), UiScale.Px(lh));
        }

        // ------------------------------------------------------------------ 入口

        public void Draw()
        {
            EnsureStyles();

            Event e = Event.current;
            MouseOverPanel = e != null && ((_bagOpen && _bagRect.Contains(e.mousePosition)) || (_charOpen && _charRect.Contains(e.mousePosition)));

            Entity player = _world != null ? _world.Player : null;
            if (player == null) return;

            if (_bagOpen) DrawBag(player, e);
            if (_charOpen) DrawChar(player, e);
            DrawHint();
        }

        // ------------------------------------------------------------------ 背包

        private void DrawBag(Entity player, Event e)
        {
            Inventory bag = player.Bag;
            if (bag == null) return;

            Rect r = BagWindow();
            _bagRect = r;
            Panel(r, "背包");

            GUI.Label(LRect(r, Pad, 26f, 280f, 18f),
                "金币 " + player.Gold + "      格子 " + bag.UsedSlots + " / " + Inventory.SlotCount, _label);

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

                    DrawCellBackground(cellRect, hover);

                    ItemInstance item = bag.At(index);
                    if (item != null)
                    {
                        ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
                        DrawIcon(cellRect, item, def);
                        if (item.Count > 1)
                            GUI.Label(new Rect(cellRect.xMax - UiScale.Px(20f), cellRect.yMax - UiScale.Px(18f), UiScale.Px(20f), UiScale.Px(16f)),
                                item.Count.ToString(), _small);
                    }

                    if (hover && leftDown && item != null)
                    {
                        if (def_IsEquip(item)) Queue(Intent.BagAction(player.Id, IntentKind.EquipItem, index));
                        else Queue(Intent.BagAction(player.Id, IntentKind.UseItem, index));
                    }
                    else if (hover && rightDown && item != null)
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

        private bool def_IsEquip(ItemInstance item)
        {
            ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
            return def != null && def.IsEquip;
        }

        // ------------------------------------------------------------------ 角色

        private void DrawChar(Entity player, Event e)
        {
            Rect r = CharWindow();
            _charRect = r;
            Panel(r, "角色");

            // 等级 / 金币
            GUI.Label(LRect(r, Pad, 26f, 160f, 18f), "Lv." + player.Level, _value);
            GUI.Label(LRect(r, 150f, 26f, 190f, 18f), "金币 " + player.Gold, _label);

            // 血条 / 经验条：数字之外给个图形，一眼知道还剩多少
            Bar(LRect(r, Pad, 48f, WindowW - Pad * 2f, 16f),
                player.MaxHp > 0 ? player.Hp / (float)player.MaxHp : 0f,
                UiColor.Srgb(0.78f, 0.18f, 0.15f),
                "生命  " + player.Hp + " / " + player.MaxHp);

            Bar(LRect(r, Pad, 68f, WindowW - Pad * 2f, 16f),
                player.ExpToNextLevel > 0 ? player.Exp / (float)player.ExpToNextLevel : 0f,
                UiColor.Srgb(0.25f, 0.55f, 0.90f),
                "经验  " + player.Exp + " / " + player.ExpToNextLevel);

            // 属性：总值 + 明细（基础 / 装备），这样换装有没有用一眼看得出
            Bar(LRect(r, Pad, 88f, WindowW - Pad * 2f, 16f),
                player.MaxMp > 0 ? player.Mp / (float)player.MaxMp : 0f,
                new Color(0.28f, 0.34f, 0.85f),
                "魔法  " + player.Mp + " / " + player.MaxMp);

            int gearMin, gearMax, gearAc, gearHp;
            SumGearBonus(player, out gearMin, out gearMax, out gearAc, out gearHp);

            float y = 114f;
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
                GUI.Label(LRect(r, Pad, y, WindowW - Pad * 2f, 18f), "魔法 / 道术：三职业在 M4 开放", _small);
                y += 26f;
            }

            // 装备栏
            GUI.Label(LRect(r, Pad, y, WindowW - Pad * 2f, 18f), "—— 装备（左键点一下卸下）——", _label);
            y += 24f;

            _hoverGear = -1;
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            for (int i = 1; i < ItemDef.SlotCount; i++)
            {
                EquipSlot slot = (EquipSlot)i;
                Rect row = LRect(r, Pad, y + (i - 1) * GearRowH, WindowW - Pad * 2f, GearRowH - 3f);
                ItemInstance worn = player.Gear != null ? player.Gear.Get(slot) : null;
                ItemDef def = worn != null && _catalog != null ? _catalog.Get(worn.DefId) : null;

                bool hover = e != null && row.Contains(e.mousePosition);
                if (hover) _hoverGear = i;

                DrawCellBackground(row, hover && worn != null);

                if (def != null)
                    DrawIcon(new Rect(row.x + UiScale.Px(3f), row.y + UiScale.Px(3f), UiScale.Px(21f), UiScale.Px(21f)), worn, def);

                string text = SlotNames[i] + "     " + (def != null ? def.Name : "（空）");
                GUI.Label(new Rect(row.x + UiScale.Px(28f), row.y + UiScale.Px(5f), row.width, UiScale.Px(20f)),
                    text, def != null ? _value : _small);

                if (hover && leftDown && worn != null)
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
                minDc += def.MinDc;
                maxDc += def.MaxDc;
                ac += def.Ac;
                hp += def.BonusHp;
            }
        }

        // ------------------------------------------------------------------ 画图小工具

        private void StatBlock(Rect outer, float ly, string name, string total, string baseText, string bonusText)
        {
            GUI.Label(LRect(outer, Pad + 4f, ly, 60f, 18f), name, _label);
            GUI.Label(LRect(outer, Pad + 62f, ly, 120f, 18f), total, _value);
            GUI.Label(LRect(outer, Pad + 22f, ly + 17f, 160f, 17f), baseText, _small);
            if (!string.IsNullOrEmpty(bonusText))
                GUI.Label(LRect(outer, Pad + 130f, ly + 17f, 160f, 17f), bonusText, _bonus);
        }

        private void Bar(Rect r, float percent, Color fill, string text)
        {
            float pct = Mathf.Clamp01(percent);
            Fill(r, UiColor.Srgb(0.10f, 0.10f, 0.12f, 0.92f));
            Fill(new Rect(r.x, r.y, r.width * pct, r.height), fill);
            Border(r, UiColor.Srgb(0.44f, 0.39f, 0.26f, 1f));
            GUI.Label(new Rect(r.x + UiScale.Px(6f), r.y, r.width, r.height), text, _label);
        }

        private void DrawCellBackground(Rect r, bool highlight)
        {
            Fill(r, highlight ? UiColor.Srgb(0.34f, 0.30f, 0.18f, 0.95f) : UiColor.Srgb(0.15f, 0.14f, 0.13f, 0.92f));
            Border(r, UiColor.Srgb(0.44f, 0.39f, 0.26f, 1f));
        }

        private void DrawIcon(Rect cell, ItemInstance item, ItemDef def)
        {
            ItemType type = def != null ? def.Type : ItemType.Material;
            string key = def != null ? def.SpriteId : item.DefId;
            Sprite sprite = PlaceholderArt.ItemIcon(key, type, 32);
            if (sprite == null || sprite.texture == null) return;

            float inset = UiScale.Px(6f);
            GUI.DrawTexture(new Rect(cell.x + inset, cell.y + inset, cell.width - inset * 2f, cell.height - inset * 2f), sprite.texture);
        }

        private void Panel(Rect r, string title)
        {
            Fill(r, UiColor.Srgb(0.06f, 0.06f, 0.08f, 0.90f));
            Border(r, UiColor.Srgb(0.55f, 0.47f, 0.28f, 1f));
            GUI.Label(LRect(r, Pad, 4f, WindowW, 20f), title, _title);
        }

        private void DrawTooltip(ItemDef def, ItemInstance item, Vector2 mouse)
        {
            if (def == null) return;

            string body = "";
            if (def.IsEquip)
            {
                if (def.MinDc > 0 || def.MaxDc > 0) body += "攻击 " + def.MinDc + "-" + def.MaxDc + "   ";
                if (def.Ac > 0) body += "防御 " + def.Ac + "   ";
                if (def.BonusHp > 0) body += "生命 +" + def.BonusHp + "   ";
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
            body += "\n售价 " + (def.Price / 2) + " 金币";

            int lines = body.Split('\n').Length;
            float lw = 240f;
            float lh = 48f + lines * 18f;

            float mx = mouse.x + UiScale.Px(16f);
            float my = mouse.y + UiScale.Px(12f);
            Rect r = new Rect(mx, my, UiScale.Px(lw), UiScale.Px(lh));
            if (r.xMax > Screen.width) r.x = Screen.width - r.width - UiScale.Px(4f);
            if (r.yMax > Screen.height) r.y = Screen.height - r.height - UiScale.Px(4f);

            Fill(r, UiColor.Srgb(0.04f, 0.04f, 0.05f, 0.97f));
            Border(r, UiColor.Srgb(0.70f, 0.60f, 0.32f, 1f));

            string name = def.Name + (item != null && item.Count > 1 ? "  x" + item.Count : "");
            GUI.Label(new Rect(r.x + UiScale.Px(7f), r.y + UiScale.Px(4f), r.width, UiScale.Px(18f)), name, _tipTitle);
            GUI.Label(new Rect(r.x + UiScale.Px(7f), r.y + UiScale.Px(26f), r.width, r.height), body, _tipBody);
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

            Rect r = new Rect(Screen.width * 0.5f - UiScale.Px(180f), Screen.height - UiScale.Px(46f), UiScale.Px(360f), UiScale.Px(26f));
            Fill(r, UiColor.Srgb(0.10f, 0.04f, 0.04f, 0.88f));
            GUI.Label(new Rect(r.x, r.y + UiScale.Px(4f), r.width, r.height), _hint, _label);
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
            _value.fontSize = UiScale.Font(14);
            _value.normal.textColor = Color.white;

            _bonus = new GUIStyle(GUI.skin.label);
            _bonus.fontSize = UiScale.Font(12);
            _bonus.normal.textColor = UiColor.Srgb(0.45f, 0.95f, 0.55f);

            _small = new GUIStyle(GUI.skin.label);
            _small.fontSize = UiScale.Font(12);
            _small.normal.textColor = UiColor.Srgb(0.72f, 0.70f, 0.62f);

            _title = new GUIStyle(GUI.skin.label);
            _title.fontSize = UiScale.Font(15);
            _title.normal.textColor = UiColor.Srgb(1f, 0.90f, 0.55f);

            _tipTitle = new GUIStyle(GUI.skin.label);
            _tipTitle.fontSize = UiScale.Font(14);
            _tipTitle.normal.textColor = UiColor.Srgb(1f, 0.88f, 0.45f);

            _tipBody = new GUIStyle(GUI.skin.label);
            _tipBody.fontSize = UiScale.Font(12);
            _tipBody.normal.textColor = UiColor.Srgb(0.85f, 0.85f, 0.82f);
        }
    }
}
