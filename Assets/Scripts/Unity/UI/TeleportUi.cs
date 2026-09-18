using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 传送员面板：列出这个 NPC 能去的地方，点一下就走。
    ///
    /// 皮肤全部走 <see cref="UiSkin"/>（底色、金边、标题栏、行、字号都是共用的那一套）。
    /// 点目的地只产出 Intent 交给 Simulation，界面自己绝不改 World。
    ///
    /// 走成功之后会自动关掉 —— 因为人已经不在那个 NPC 旁边了（NearestTeleporter 返回 null）。
    /// </summary>
    public sealed class TeleportUi
    {
        private const float PanelX = 660f;
        private const float PanelY = 132f;
        private const float PanelW = 420f;
        private const float PanelH = 300f;
        private const float Pad = 8f;
        private const float RowH = 28f;

        private readonly World _world;
        private readonly IMapCatalog _maps;
        private readonly List<Intent> _pending = new List<Intent>();
        private readonly PanelDrag _drag = new PanelDrag();

        private bool _open;
        private string _hint = "";
        private float _hintUntil;

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

            Event e = Event.current;
            Rect r = _drag.Apply(UiScale.R(PanelX, PanelY, PanelW, PanelH));

            bool pressed, released;
            Vector2 mouse;
            PanelDrag.ReadMouse(e, out pressed, out released, out mouse);
            _drag.Handle(r, pressed, released, mouse);
            r = _drag.Apply(UiScale.R(PanelX, PanelY, PanelW, PanelH));

            MouseOver = e != null && r.Contains(e.mousePosition);

            UiSkin.Panel(r, "传送员 —— " + npc.Name);
            GUI.Label(UiSkin.LRect(r, Pad, 28f, PanelW - Pad * 2f, 18f), npc.Shop.Dialog, UiSkin.Styles.Group);
            GUI.Label(UiSkin.LRect(r, Pad, 50f, PanelW, 18f),
                "你的金币 " + player.Gold + "    （E 关闭，标题栏可拖动）", UiSkin.Styles.Label);

            bool leftDown = e != null && e.type == EventType.MouseDown && e.button == 0;

            List<NpcTeleport> spots = npc.Shop.Teleports;
            int shown = 0;
            for (int i = 0; i < spots.Count; i++)
            {
                NpcTeleport spot = spots[i];
                if (spot == null) continue;

                Rect row = UiSkin.LRect(r, Pad, 76f + shown * RowH, PanelW - Pad * 2f, RowH - 3f);
                bool hover = e != null && row.Contains(e.mousePosition);
                bool affordable = player.Gold >= spot.Cost;

                UiSkin.Row(row, hover);

                GUI.Label(new Rect(row.x + UiScale.Px(6f), row.y + UiScale.Px(4f), row.width, UiScale.Px(20f)),
                    DisplayNameOf(spot), UiSkin.Styles.Label);

                string price = spot.Cost > 0 ? spot.Cost + " 金" : "免费";
                GUIStyle priceStyle = !affordable ? UiSkin.Styles.Bad
                                    : (spot.Cost > 0 ? UiSkin.Styles.Value : UiSkin.Styles.Small);
                GUI.Label(new Rect(row.xMax - UiScale.Px(70f), row.y + UiScale.Px(4f), UiScale.Px(64f), UiScale.Px(20f)),
                    price, priceStyle);

                if (hover && leftDown) Queue(Intent.BagAction(player.Id, IntentKind.TeleportTo, i));
                shown++;
            }

            if (shown == 0)
                GUI.Label(UiSkin.LRect(r, Pad, 78f, PanelW, 18f), "这个传送员还没配任何目的地", UiSkin.Styles.Small);

            if (!string.IsNullOrEmpty(_hint) && Time.timeSinceLevelLoad < _hintUntil)
                UiSkin.Hint(UiSkin.LRect(r, Pad, PanelH - 32f, PanelW - Pad * 2f, 22f), _hint);
        }

        /// <summary>数据里写了名字就用它，否则退回地图名 —— 免得菜单上出现 map_cave 这种给人看的 id。</summary>
        private string DisplayNameOf(NpcTeleport spot)
        {
            if (!string.IsNullOrEmpty(spot.Name) && spot.Name != spot.TargetMap) return spot.Name;
            GameMap m = _maps != null ? _maps.GetMap(spot.TargetMap) : null;
            if (m != null && !string.IsNullOrEmpty(m.Name)) return m.Name;
            return spot.TargetMap;
        }
    }
}
