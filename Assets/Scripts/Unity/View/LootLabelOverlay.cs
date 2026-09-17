using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 地面掉落物的名字。
    /// 只在玩家附近显示（免得满屏是字），并且按类型上色：
    /// 金币金、装备蓝、药水绿、材料灰 —— 站远一点也能一眼看出掉了什么好东西。
    /// </summary>
    public sealed class LootLabelOverlay
    {
        private const float ShowRadiusTiles = 5f;

        private readonly World _world;
        private readonly EntityViewRegistry _views;
        private readonly IItemCatalog _catalog;
        private readonly Camera _camera;

        private GUIStyle _gold;
        private GUIStyle _equip;
        private GUIStyle _consumable;
        private GUIStyle _material;
        private GUIStyle _unknown;

        public LootLabelOverlay(World world, EntityViewRegistry views, IItemCatalog catalog, Camera camera)
        {
            _world = world;
            _views = views;
            _catalog = catalog;
            _camera = camera;
        }

        public void Draw()
        {
            if (_world == null || _camera == null) return;

            Entity player = _world.Player;
            if (player == null) return;

            EnsureStyles();

            foreach (Entity item in _world.Entities)
            {
                if (item.Kind != EntityKind.GroundItem) continue;
                if (item.Pos.ChebyshevTo(player.Pos) > ShowRadiusTiles) continue;

                Transform t = _views.GetTransform(item.Id);
                if (t == null) continue;

                Vector3 sp = _camera.WorldToScreenPoint(t.position + new Vector3(0f, 0.85f, 0f));
                if (sp.z <= 0f) continue;

                string text;
                GUIStyle style;

                if (item.Gold > 0)
                {
                    text = "金币 x" + item.Gold;
                    style = _gold;
                }
                else
                {
                    ItemDef def = _catalog != null ? _catalog.Get(item.DefId) : null;
                    text = def != null ? def.Name : item.DefId;
                    if (item.Count > 1) text += " x" + item.Count;

                    ItemType type = def != null ? def.Type : ItemType.Material;
                    if (type == ItemType.Equip) style = _equip;
                    else if (type == ItemType.Consumable) style = _consumable;
                    else if (type == ItemType.Material) style = _material;
                    else style = _unknown;
                }

                float w = UiScale.Px(160f);
                GUI.Label(new Rect(sp.x - w * 0.5f, Screen.height - sp.y, w, UiScale.Px(20f)), text, style);
            }
        }

        private void EnsureStyles()
        {
            if (_gold != null) return;
            _gold = Make(new Color(1f, 0.86f, 0.25f));
            _equip = Make(new Color(0.45f, 0.78f, 1f));
            _consumable = Make(new Color(0.55f, 1f, 0.60f));
            _material = Make(new Color(0.82f, 0.82f, 0.78f));
            _unknown = Make(new Color(1f, 0.55f, 0.35f));
        }

        private static GUIStyle Make(Color color)
        {
            GUIStyle style = new GUIStyle(GUI.skin.label);
            style.fontSize = UiScale.Font(13);
            style.alignment = TextAnchor.MiddleCenter;
            style.normal.textColor = color;
            return style;
        }
    }
}
