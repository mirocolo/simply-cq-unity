using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 传送员面板：列出这个 NPC 能去的地方，点一下就走。
    ///
    /// 和商店面板同一套 IMGUI 画法（零资源、按 DPI 缩放）；
    /// 点目的地只产出 Intent 交给 Simulation，界面自己绝不改 World。
    ///
    /// 走成功之后会自动关掉 —— 因为人已经不在那个 NPC 旁边了（NearestTeleporter 返回 null）。
    /// </summary>
    public sealed class TeleportUi
    {
        private const float PanelY = 132f;
        private const float PanelW = 420f;
        private const float PanelH = 300f;
        private const float Pad = 8f;
        private const float RowH = 28f;

        private readonly World _world;
        private readonly IMapCatalog _maps;
        private readonly List<Intent> _pending = new List<Intent>();

        private bool _open;
        private string _hint = "";
        private float _hintUntil;
        private GUIStyle _label;
        private GUIStyle _value;
        private GUIStyle _poor;
        private GUIStyle _small;
        private GUIStyle _title;
        private GUIStyle _dialog;

        public TeleportUi(World world, IMapCatalog maps)
        {
            _world = world;
            _maps = maps;
            if (world != null) world.Events.Subscribe<PortalRefused>(OnRefused);
        }

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

        private void Queue(Intent intent) { _pending.Add(intent); }

        private void OnRefused(PortalRefused evt)
        {
            // 别的来源（踩传送点失败）也会发这个事件，这里只在面板开着时提示，免得抢戏
            if (!_open) return;
            _hint = evt.Reason;
            _hintUntil = Time.timeSinceLevelLoad + 3f;
        }

        public void Draw()
        {
            if (!_open) return;

            Entity player = _world != null ? _world.Player : null;
            if (player == null) { _open = false; return; }

            // 走远了自动关掉（传送成功后也走这条路）
            Entity npc = TeleportSystem.NearestTeleporter(_world, player);
            if (npc == null) { _open = false; return; }

            EnsureStyles();

            Rect r = UiScale.R(660f, PanelY, PanelW, PanelH);
            Event e = Event.current;
            MouseOver = e != null && r.Contains(e.mousePosition);

            Fill(r, UiColor.Srgb(0.06f, 0.06f, 0.08f, 0.92f));
            Border(r, UiColor.Srgb(0.55f, 0.47f, 0.28f, 1f));
            GUI.Label(LRect(r, Pad, 4f, PanelW, 20f), "传送员 —— " + npc.Name, _title);
            GUI.Label(LRect(r, Pad, 26f, PanelW - Pad * 2f, 18f), npc.Shop.Dialog, _dialog);
            GUI.Label(LRect(r, Pad, 48f, PanelW, 18f), "你的金币 " + player.Gold + "    （E 关闭）", _label);

            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            List<NpcTeleport> spots = npc.Shop.Teleports;
            int shown = 0;
            for (int i = 0; i < spots.Count; i++)
            {
                NpcTeleport spot = spots[i];
                if (spot == null) continue;

                Rect row = LRect(r, Pad, 74f + shown * RowH, PanelW - Pad * 2f, RowH - 3f);
                bool hover = e != null && row.Contains(e.mousePosition);
                bool affordable = player.Gold >= spot.Cost;

                Fill(row, hover ? UiColor.Srgb(0.30f, 0.28f, 0.18f, 0.95f) : UiColor.Srgb(0.15f, 0.14f, 0.13f, 0.92f));
                Border(row, UiColor.Srgb(0.44f, 0.39f, 0.26f, 1f));

                string name = DisplayNameOf(spot);
                GUI.Label(new Rect(row.x + UiScale.Px(6f), row.y + UiScale.Px(4f), row.width, UiScale.Px(20f)), name, _label);

                string price = spot.Cost > 0 ? spot.Cost + " 金" : "免费";
                GUI.Label(new Rect(row.xMax - UiScale.Px(70f), row.y + UiScale.Px(4f), UiScale.Px(64f), UiScale.Px(20f)),
                    price, (affordable && spot.Cost > 0) ? _value : (affordable ? _small : _poor));

                if (hover && leftDown) Queue(Intent.BagAction(player.Id, IntentKind.TeleportTo, i));
                shown++;
            }

            if (shown == 0)
                GUI.Label(LRect(r, Pad, 76f, PanelW, 18f), "这个传送员还没配任何目的地", _small);

            DrawHint(r);
        }

        /// <summary>数据里写了名字就用它，否则退回地图名 —— 免得菜单上出现 map_cave 这种给人看的 id。</summary>
        private string DisplayNameOf(NpcTeleport spot)
        {
            if (!string.IsNullOrEmpty(spot.Name) && spot.Name != spot.TargetMap) return spot.Name;
            GameMap m = _maps != null ? _maps.GetMap(spot.TargetMap) : null;
            if (m != null && !string.IsNullOrEmpty(m.Name)) return m.Name;
            return spot.TargetMap;
        }

        private void DrawHint(Rect r)
        {
            if (string.IsNullOrEmpty(_hint)) return;
            if (Time.timeSinceLevelLoad > _hintUntil) { _hint = ""; return; }
            GUI.Label(LRect(r, Pad, PanelH - 30f, PanelW - Pad * 2f, 20f), _hint, _poor);
        }

        // ------------------------------------------------------------------ 画图小工具

        private static Rect LRect(Rect outer, float lx, float ly, float lw, float lh)
        {
            return new Rect(outer.x + UiScale.Px(lx), outer.y + UiScale.Px(ly), UiScale.Px(lw), UiScale.Px(lh));
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

            _dialog = new GUIStyle(GUI.skin.label);
            _dialog.fontSize = UiScale.Font(12);
            _dialog.normal.textColor = UiColor.Srgb(0.78f, 0.82f, 0.88f);
        }
    }
}
