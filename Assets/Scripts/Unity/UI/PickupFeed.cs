using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 拾取通知流：屏幕右下角一条条往上顶的"恭喜获得 XXX"。
    ///
    /// 页游挂机的持续正反馈就来自这里——挂机的人不盯着背包，
    /// **蓝装以上必须主动告诉他**。白绿装故意不推：挂一晚全是白装通知，那就是噪音灾难。
    /// 金币连捡合并成一条（捡 20 次推 20 条"金币 +3"是灾难二号）。
    /// </summary>
    public sealed class PickupFeed
    {
        private sealed class Entry
        {
            public string Text;
            public Color Color;
            public float ExpireAt;
        }

        private const int MaxShown = 5;
        private const float EntryLife = 5f;
        private const float GoldMergeWindow = 1.5f;
        private const float FeedW = 260f;
        private const float FeedH = 22f;

        private readonly IItemCatalog _catalog;
        private readonly List<Entry> _entries = new List<Entry>();

        private GUIStyle _tinted;                      // 共用一份样式，逐条改字色（别每帧 new GUIStyle）
        private Entry _goldEntry;                      // 正在合并的那条金币
        private float _goldAccum;

        public PickupFeed(World world, IItemCatalog catalog)
        {
            _catalog = catalog;
            if (world != null)
            {
                world.Events.Subscribe<ItemPicked>(OnItemPicked);
                world.Events.Subscribe<GoldPicked>(OnGoldPicked);
            }
        }

        private void OnItemPicked(ItemPicked e)
        {
            if ((int)e.Quality < (int)ItemQuality.Blue) return;   // 白绿不上屏

            ItemDef def = _catalog != null ? _catalog.Get(e.DefId) : null;
            string name = def != null ? def.Name : e.DefId;
            if (e.Count > 1) name += " x" + e.Count;

            Push(ItemQualityStyle.TitledName(e.Quality, name),
                 ItemQualityStyle.Srgb(e.Quality),
                 e.Quality == ItemQuality.Purple ? 7f : EntryLife);
        }

        private void OnGoldPicked(GoldPicked e)
        {
            // 窗口内接着捡就往上加，不新开一条
            if (_goldEntry != null && _entries.Contains(_goldEntry)
                && _goldEntry.ExpireAt - Time.timeSinceLevelLoad > EntryLife - GoldMergeWindow)
            {
                _goldAccum += e.Amount;
                _goldEntry.Text = "金币 +" + _goldAccum;
                _goldEntry.ExpireAt = Time.timeSinceLevelLoad + EntryLife;
                return;
            }

            _goldAccum = e.Amount;
            _goldEntry = Push("金币 +" + _goldAccum, UiSkin.TextValue, EntryLife);
        }

        private Entry Push(string text, Color color, float life)
        {
            Entry entry = new Entry();
            entry.Text = text;
            entry.Color = color;
            entry.ExpireAt = Time.timeSinceLevelLoad + life;

            _entries.Insert(0, entry);        // 新的插在最上面
            if (_entries.Count > MaxShown + 4) _entries.RemoveAt(_entries.Count - 1);
            return entry;
        }

        public void Tick()
        {
            float now = Time.timeSinceLevelLoad;
            for (int i = _entries.Count - 1; i >= 0; i--)
                if (_entries[i].ExpireAt <= now) _entries.RemoveAt(i);
        }

        public void Draw()
        {
            if (_entries.Count == 0) return;
            if (_tinted == null) _tinted = new GUIStyle(UiSkin.Styles.Label);

            float x = Screen.width - UiScale.Px(FeedW + 12f);
            float y = Screen.height - UiScale.Px(70f);

            int shown = 0;
            for (int i = 0; i < _entries.Count && shown < MaxShown; i++)
            {
                Entry e = _entries[i];
                float alpha = Mathf.Clamp01((e.ExpireAt - Time.timeSinceLevelLoad) / 0.6f);

                Rect r = new Rect(x, y - UiScale.Px(shown * (FeedH + 4f)), UiScale.Px(FeedW), UiScale.Px(FeedH));
                UiSkin.Fill(r, UiColor.Srgb(0.04f, 0.04f, 0.05f, 0.75f * alpha));
                UiSkin.Border(r, UiSkin.PanelBorderInner, 1f);

                Color c = e.Color;
                c.a = alpha;
                _tinted.normal.textColor = c;
                GUI.Label(new Rect(r.x + UiScale.Px(8f), r.y + UiScale.Px(2f), r.width, r.height), e.Text, _tinted);
                shown++;
            }
        }

        public int VisibleCount
        {
            get
            {
                int n = 0;
                for (int i = 0; i < _entries.Count && n < MaxShown; i++) n++;
                return n;
            }
        }
    }
}
