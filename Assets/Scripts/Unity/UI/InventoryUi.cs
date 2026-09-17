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
    /// 以后要换成 UGUI/UI Toolkit，只需要替换这一个类 —— 它对外的接口只有 Draw/DrainInto/ConsumesMouse。
    ///
    /// 交互只产出 Intent 交给 Simulation；界面自己绝不改 World。
    /// </summary>
    public sealed class InventoryUi
    {
        private const int Cell = 46;
        private const int Gap = 2;
        private const float Pad = 7f;

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

        private GUIStyle _label;
        private GUIStyle _title;
        private GUIStyle _small;
        private GUIStyle _tipTitle;
        private GUIStyle _tipBody;

        private float _hintUntil;

        public InventoryUi(World world, IItemCatalog catalog)
        {
            _world = world;
            _catalog = catalog;

            if (world != null) world.Events.Subscribe<PickupRefused>(OnPickupRefused);
        }

        private void OnPickupRefused(PickupRefused evt)
        {
            SetHint("捡不起来：" + evt.Reason);
            _hintUntil = Time.timeSinceLevelLoad + 3f;
        }

        public bool AnyOpen { get { return _bagOpen || _charOpen; } }
        /// <summary>上一步绘制时鼠标是否在面板上（用来决定点击算不算"攻击"）。</summary>
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

        // ------------------------------------------------------------------ 布局

        private static Rect BagWindow()
        {
            float w = Inventory.Columns * (Cell + Gap) + Gap + Pad * 2f;
            float h = 122f + Inventory.Rows * (Cell + Gap) + Gap + Pad;
            return new Rect(10f, 132f, w, h);
        }

        private static Rect CharWindow()
        {
            Rect bag = BagWindow();
            return new Rect(bag.x + bag.width + 8f, 132f, 300f, bag.height);
        }

        // ------------------------------------------------------------------ 入口

        public void Draw()
        {
            EnsureStyles();

            Event e = Event.current;
            MouseOverPanel = e != null && (HitBag(e.mousePosition) || HitChar(e.mousePosition));

            Entity player = _world != null ? _world.Player : null;
            if (player == null) return;

            if (_bagOpen) DrawBag(player, e);
            if (_charOpen) DrawChar(player, e);
            DrawHint();
        }

        private static bool HitBag(Vector2 m) { return _bagOpenRect.Contains(m); }
        private static bool HitChar(Vector2 m) { return _charOpenRect.Contains(m); }

        private static Rect _bagOpenRect;
        private static Rect _charOpenRect;

        // ------------------------------------------------------------------ 背包

        private void DrawBag(Entity player, Event e)
        {
            Inventory bag = player.Bag;
            if (bag == null) return;

            Rect r = BagWindow();
            _bagOpenRect = r;
            Panel(r, "背包");

            string head = "金币 " + player.Gold + "    格子 " + bag.UsedSlots + " / " + Inventory.SlotCount;
            GUI.Label(new Rect(r.x + Pad, r.y + 26f, r.width - Pad * 2f, 18f), head, _label);

            float gx = r.x + Pad + Gap;
            float gy = r.y + 70f;

            _hoverBag = -1;
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;
            bool rightDown = e != null && e.type == EventType.MouseDown && e.button == 1;

            for (int row = 0; row < Inventory.Rows; row++)
            {
                for (int col = 0; col < Inventory.Columns; col++)
                {
                    int index = row * Inventory.Columns + col;
                    Rect cell = new Rect(gx + col * (Cell + Gap), gy + row * (Cell + Gap), Cell, Cell);

                    bool hover = e != null && cell.Contains(e.mousePosition);
                    if (hover) _hoverBag = index;

                    DrawCellBackground(cell, hover);
                    ItemInstance item = bag.At(index);
                    if (item != null)
                    {
                        ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
                        DrawIcon(cell, item, def);
                        if (item.Count > 1)
                            GUI.Label(new Rect(cell.x + cell.width - 20f, cell.y + cell.height - 18f, 20f, 16f), item.Count.ToString(), _small);
                    }

                    if (hover && leftDown && item != null) OnBagLeftClick(player, index, item);
                    else if (hover && rightDown && item != null) OnBagRightClick(player, index);
                }
            }

            // 鼠标悬停提示
            if (_hoverBag >= 0 && e != null)
            {
                ItemInstance item = bag.At(_hoverBag);
                if (item != null) DrawTooltip(_catalog != null ? _catalog.Get(item.DefId) : null, item, e.mousePosition);
            }
        }

        private void OnBagLeftClick(Entity player, int index, ItemInstance item)
        {
            ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
            if (def == null) return;

            if (def.IsEquip) Queue(Intent.BagAction(player.Id, IntentKind.EquipItem, index));
            else if (def.Type == ItemType.Consumable) Queue(Intent.BagAction(player.Id, IntentKind.UseItem, index));
        }

        private void OnBagRightClick(Entity player, int index)
        {
            Queue(Intent.BagAction(player.Id, IntentKind.DropItem, index));
        }

        // ------------------------------------------------------------------ 角色

        private void DrawChar(Entity player, Event e)
        {
            Rect r = CharWindow();
            _charOpenRect = r;
            Panel(r, "角色");

            float y = r.y + 26f;
            GUI.Label(new Rect(r.x + Pad, y, r.width - Pad * 2f, 18f),
                "Lv." + player.Level + "    经验 " + player.Exp + " / " + player.ExpToNextLevel, _label);

            y += 20f;
            GUI.Label(new Rect(r.x + Pad, y, r.width - Pad * 2f, 18f),
                "生命 " + player.Hp + " / " + player.MaxHp + "    金币 " + player.Gold, _label);

            y += 22f;
            GUI.Label(new Rect(r.x + Pad, y, r.width - Pad * 2f, 18f),
                "攻击 " + player.MinDc + "-" + player.MaxDc + "    防御 " + player.Ac, _label);

            y += 18f;
            GUI.Label(new Rect(r.x + Pad, y, r.width - Pad * 2f, 18f),
                "魔法 " + player.Mc + "    道术 " + player.Sc + "    魔御 " + player.Mac, _label);

            y += 26f;
            GUI.Label(new Rect(r.x + Pad, y, r.width - Pad * 2f, 18f), "—— 装备 ——", _label);

            y += 22f;
            _hoverGear = -1;
            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            for (int i = 1; i < ItemDef.SlotCount; i++)
            {
                EquipSlot slot = (EquipSlot)i;
                Rect row = new Rect(r.x + Pad, y + (i - 1) * 30f, r.width - Pad * 2f, 27f);
                ItemInstance worn = player.Gear != null ? player.Gear.Get(slot) : null;
                ItemDef def = worn != null && _catalog != null ? _catalog.Get(worn.DefId) : null;

                bool hover = e != null && row.Contains(e.mousePosition);
                if (hover) _hoverGear = i;

                DrawCellBackground(row, hover && worn != null);

                if (def != null)
                {
                    Rect icon = new Rect(row.x + 3f, row.y + 3f, 21f, 21f);
                    DrawIcon(icon, worn, def);
                }

                string text = SlotNames[i] + "    " + (def != null ? def.Name : "（空）");
                GUI.Label(new Rect(row.x + 28f, row.y + 4f, row.width - 32f, 20f), text, _label);

                if (hover && leftDown && worn != null)
                    Queue(Intent.BagAction(player.Id, IntentKind.UnequipItem, i));
            }

            y += (ItemDef.SlotCount - 1) * 30f + 6f;
            GUI.Label(new Rect(r.x + Pad, y, r.width - Pad * 2f, 18f), "左键点装备栏 = 卸下", _small);

            if (_hoverGear > 0 && e != null)
            {
                ItemInstance worn = player.Gear != null ? player.Gear.Get((EquipSlot)_hoverGear) : null;
                if (worn != null) DrawTooltip(_catalog != null ? _catalog.Get(worn.DefId) : null, worn, e.mousePosition);
            }
        }

        // ------------------------------------------------------------------ 画图小工具

        private void DrawCellBackground(Rect r, bool highlight)
        {
            Fill(r, highlight ? new Color(0.34f, 0.30f, 0.18f, 0.95f) : new Color(0.15f, 0.14f, 0.13f, 0.92f));
            Border(r, new Color(0.44f, 0.39f, 0.26f, 1f));
        }

        private void DrawIcon(Rect cell, ItemInstance item, ItemDef def)
        {
            ItemType type = def != null ? def.Type : ItemType.Material;
            string key = def != null ? def.SpriteId : item.DefId;
            Sprite sprite = PlaceholderArt.ItemIcon(key, type, 32);
            if (sprite == null || sprite.texture == null) return;

            float inset = 6f;
            Rect icon = new Rect(cell.x + inset, cell.y + inset, cell.width - inset * 2f, cell.height - inset * 2f);
            GUI.DrawTexture(icon, sprite.texture);
        }

        private void Panel(Rect r, string title)
        {
            Fill(r, new Color(0.06f, 0.06f, 0.08f, 0.88f));
            Border(r, new Color(0.55f, 0.47f, 0.28f, 1f));
            GUI.Label(new Rect(r.x + Pad, r.y + 4f, r.width - Pad * 2f, 20f), title, _title);
        }

        private void DrawTooltip(ItemDef def, ItemInstance item, Vector2 mouse)
        {
            if (def == null) return;

            string body = "";
            if (def.IsEquip)
            {
                if (def.MinDc > 0 || def.MaxDc > 0) body += "攻击 " + def.MinDc + "-" + def.MaxDc + "  ";
                if (def.Ac > 0) body += "防御 " + def.Ac + "  ";
                if (def.BonusHp > 0) body += "生命 +" + def.BonusHp + "  ";
                body += "\n要求等级 " + def.LevelReq;
            }
            else if (def.Type == ItemType.Consumable)
            {
                if (def.HealHp > 0) body += "恢复生命 " + def.HealHp + "  ";
                if (def.HealMp > 0) body += "恢复魔法 " + def.HealMp;
                body += "\n左键使用";
            }
            else
            {
                body += "材料，可以卖钱";
            }

            if (!string.IsNullOrEmpty(def.Description)) body += "\n" + def.Description;
            body += "\n售价 " + (def.Price / 2) + " 金币";

            float w = 220f;
            float h = 46f + (body.Split('\n').Length) * 17f;
            Rect r = new Rect(mouse.x + 16f, mouse.y + 12f, w, h);
            if (r.xMax > Screen.width) r.x = Screen.width - w - 4f;
            if (r.yMax > Screen.height) r.y = Screen.height - h - 4f;

            Fill(r, new Color(0.04f, 0.04f, 0.05f, 0.97f));
            Border(r, new Color(0.70f, 0.60f, 0.32f, 1f));

            string name = def.Name + (item != null && item.Count > 1 ? "  x" + item.Count : "");
            GUI.Label(new Rect(r.x + 7f, r.y + 4f, w - 14f, 18f), name, _tipTitle);
            GUI.Label(new Rect(r.x + 7f, r.y + 24f, w - 14f, h - 26f), body, _tipBody);
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
            Rect r = new Rect(Screen.width * 0.5f - 160f, Screen.height - 40f, 320f, 24f);
            Fill(r, new Color(0.10f, 0.04f, 0.04f, 0.85f));
            GUI.Label(new Rect(r.x, r.y + 3f, r.width, 20f), _hint, _label);
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
            _label.fontSize = 13;
            _label.normal.textColor = new Color(0.92f, 0.92f, 0.88f);

            _small = new GUIStyle(GUI.skin.label);
            _small.fontSize = 11;
            _small.normal.textColor = new Color(0.80f, 0.72f, 0.45f);

            _title = new GUIStyle(GUI.skin.label);
            _title.fontSize = 15;
            _title.normal.textColor = new Color(1f, 0.90f, 0.55f);

            _tipTitle = new GUIStyle(GUI.skin.label);
            _tipTitle.fontSize = 14;
            _tipTitle.normal.textColor = new Color(1f, 0.88f, 0.45f);

            _tipBody = new GUIStyle(GUI.skin.label);
            _tipBody.fontSize = 12;
            _tipBody.normal.textColor = new Color(0.85f, 0.85f, 0.82f);
        }
    }
}
