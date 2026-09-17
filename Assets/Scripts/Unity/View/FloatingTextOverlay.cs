using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 伤害飘字。用 OnGUI + Camera.WorldToScreenPoint 画：
    /// 不需要任何字体资源、也不用为每个数字生成 GameObject，M2 这样最省事。
    /// 以后要做世界空间特效再换成 TextMeshPro / 自绘，接口不用变。
    /// </summary>
    public sealed class FloatingTextOverlay
    {
        private sealed class Item
        {
            public Vector3 World;
            public string Text;
            public Color Color;
            public float Age;
            public float Life;
            public float Rise;
        }

        private const float LabelWidth = 90f;

        private readonly List<Item> _items = new List<Item>(64);
        private readonly EntityViewRegistry _views;
        private readonly Camera _camera;
        private readonly World _world;
        private readonly IItemCatalog _names;
        private GUIStyle _style;   // 在 OnGUI 里懒建（构造时 GUI.skin 还没准备好）

        public FloatingTextOverlay(EntityViewRegistry views, Camera camera, World world, IItemCatalog names)
        {
            _views = views;
            _camera = camera;
            _world = world;
            _names = names;

            world.Events.Subscribe<DamageDealt>(OnDamage);
            world.Events.Subscribe<AttackMissed>(OnMiss);
            world.Events.Subscribe<GoldPicked>(OnGold);
            world.Events.Subscribe<LevelUp>(OnLevelUp);
            world.Events.Subscribe<EntityDied>(OnDied);
            world.Events.Subscribe<ItemPicked>(OnItemPicked);
            world.Events.Subscribe<PickupRefused>(OnPickupRefused);
        }

        public int Count { get { return _items.Count; } }

        public void Tick(float dt)
        {
            for (int i = _items.Count - 1; i >= 0; i--)
            {
                Item it = _items[i];
                it.Age += dt;
                if (it.Age >= it.Life)
                {
                    _items.RemoveAt(i);
                    continue;
                }
                it.World += new Vector3(0f, it.Rise * dt, 0f);
            }
        }

        public void Draw()
        {
            if (_camera == null) return;

            // 样式必须在 OnGUI 里建：构造函数里 GUI.skin 还没准备好，
            // 那时候 new 出来的空 style 没有字体，飘字会直接看不见。
            if (_style == null)
            {
                _style = new GUIStyle(GUI.skin.label);
                _style.fontSize = UiScale.Font(18);
                _style.alignment = TextAnchor.MiddleCenter;
            }

            for (int i = 0; i < _items.Count; i++)
            {
                Item it = _items[i];
                Vector3 sp = _camera.WorldToScreenPoint(it.World);
                if (sp.z <= 0f) continue;                       // 在相机背后

                float alpha = 1f - it.Age / it.Life;
                _style.normal.textColor = new Color(it.Color.r, it.Color.g, it.Color.b, alpha);

                float w = UiScale.Px(LabelWidth);
                GUI.Label(new Rect(sp.x - w * 0.5f, Screen.height - sp.y, w, UiScale.Px(22f)), it.Text, _style);
            }
        }

        private void Add(ActorId id, string text, Color color, float rise, float life)
        {
            Transform t = _views.GetTransform(id);
            if (t == null) return;

            Item item = new Item();
            item.World = t.position + new Vector3(0f, 0.7f, 0f);
            item.Text = text;
            item.Color = color;
            item.Rise = rise;
            item.Life = life;
            _items.Add(item);
        }

        private void OnDamage(DamageDealt evt)
        {
            Add(evt.Target,
                evt.Crit ? evt.Amount + "!" : evt.Amount.ToString(),
                evt.Crit ? new Color(1f, 0.86f, 0.20f) : new Color(1f, 0.36f, 0.30f),
                0.95f, 0.9f);
        }

        private void OnMiss(AttackMissed evt)
        {
            if (evt.Target.IsValid) Add(evt.Target, "MISS", new Color(0.85f, 0.85f, 0.90f), 0.7f, 0.7f);
            else Add(evt.Source, "挥空", new Color(0.75f, 0.75f, 0.80f), 0.6f, 0.6f);
        }

        private void OnGold(GoldPicked evt)
        {
            Add(evt.By, "+" + evt.Amount + " 金币", new Color(1f, 0.86f, 0.25f), 0.6f, 1.1f);
        }

        private void OnLevelUp(LevelUp evt)
        {
            Add(evt.Id, "升级！Lv." + evt.Level, new Color(0.55f, 1f, 0.60f), 0.5f, 1.6f);
        }

        private void OnItemPicked(ItemPicked evt)
        {
            string name = _names != null && _names.Get(evt.DefId) != null ? _names.Get(evt.DefId).Name : evt.DefId;
            Add(evt.By, "+" + name + (evt.Count > 1 ? " x" + evt.Count : ""), new Color(0.70f, 1f, 0.72f), 0.6f, 1.2f);
        }

        /// <summary>捡不起来（负重不够 / 背包满）—— 必须给反馈，否则玩家只觉得"踩上去没反应"。</summary>
        private void OnPickupRefused(PickupRefused evt)
        {
            Add(evt.By, "捡不起来：" + evt.Reason, new Color(1f, 0.55f, 0.25f), 0.55f, 1.6f);
        }

        private void OnDied(EntityDied evt)
        {
            Entity e = _world.Get(evt.Id);
            if (e != null && e.Kind == EntityKind.Player)
                Add(evt.Id, "你死了…", new Color(1f, 0.45f, 0.45f), 0.4f, 1.6f);
        }
    }
}
