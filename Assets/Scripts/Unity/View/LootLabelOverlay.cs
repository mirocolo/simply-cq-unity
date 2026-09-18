using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 地面上的名字：掉落物 + NPC。
    /// 掉落物只在玩家附近显示（免得满屏是字），按类型上色：
    /// 金币金、药水绿、材料灰；**装备按品质上色并标出品质名**（普通/精良/稀有/史诗）。
    /// NPC 始终显示名字（金色）。
    /// </summary>
    public sealed class LootLabelOverlay
    {
        private const float ShowRadiusTiles = 5f;
        private const float NpcRadiusTiles = 14f;

        private readonly World _world;
        private readonly EntityViewRegistry _views;
        private readonly IItemCatalog _catalog;
        private readonly Camera _camera;

        private GUIStyle _gold;
        private GUIStyle _consumable;
        private GUIStyle _material;
        private GUIStyle _unknown;
        private GUIStyle _npc;
        private readonly GUIStyle[] _quality = new GUIStyle[ItemQualityRules.Count];

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

            foreach (Entity e in _world.Entities)
            {
                if (e.Kind == EntityKind.Npc)
                {
                    if (e.Pos.ChebyshevTo(player.Pos) <= NpcRadiusTiles) Label(e, e.Name, _npc);
                    continue;
                }

                if (e.Kind != EntityKind.GroundItem) continue;
                if (e.Pos.ChebyshevTo(player.Pos) > ShowRadiusTiles) continue;

                if (e.Gold > 0)
                {
                    Label(e, "金币 x" + e.Gold, _gold);
                    continue;
                }

                ItemDef def = _catalog != null ? _catalog.Get(e.DefId) : null;
                string text = def != null ? def.Name : e.DefId;
                if (e.Count > 1) text += " x" + e.Count;

                ItemType type = def != null ? def.Type : ItemType.Material;
                if (type == ItemType.Equip)
                {
                    // 地上的装备按品质上色 + 标品质名 —— 不用捡起来就知道爆了个好东西
                    Label(e, ItemQualityStyle.TitledName(e.Quality, text), QualityStyle(e.Quality));
                    continue;
                }

                GUIStyle style = type == ItemType.Consumable ? _consumable
                               : type == ItemType.Material ? _material
                               : _unknown;

                Label(e, text, style);
            }
        }

        private void Label(Entity e, string text, GUIStyle style)
        {
            Transform t = _views.GetTransform(e.Id);
            if (t == null) return;

            Vector3 sp = _camera.WorldToScreenPoint(t.position + new Vector3(0f, 0.85f, 0f));
            if (sp.z <= 0f) return;

            float w = UiScale.Px(180f);
            GUI.Label(new Rect(sp.x - w * 0.5f, Screen.height - sp.y, w, UiScale.Px(20f)), text, style);
        }

        private void EnsureStyles()
        {
            if (_gold != null) return;
            _gold = Make(UiColor.Srgb(1f, 0.86f, 0.25f));
            _consumable = Make(UiColor.Srgb(0.55f, 1f, 0.60f));
            _material = Make(UiColor.Srgb(0.82f, 0.82f, 0.78f));
            _unknown = Make(UiColor.Srgb(1f, 0.55f, 0.35f));
            _npc = Make(UiColor.Srgb(1f, 0.93f, 0.60f));
        }

        /// <summary>装备按品质取样式（懒加载）。</summary>
        private GUIStyle QualityStyle(ItemQuality q)
        {
            int i = (int)q;
            if (i < 0 || i >= _quality.Length) i = 0;
            if (_quality[i] == null) _quality[i] = Make(ItemQualityStyle.Srgb((ItemQuality)i));
            return _quality[i];
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
