using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 面板拖动。在标题栏按住拖，位置在**本次运行内**保留。
    ///
    /// 面板原来的位置是常量算出来的、每帧重算（所以没有状态、不会漂）。加了拖动就必须存一个偏移量，
    /// 但不能让它把面板拖到屏幕外 —— 拖丢了就再也点不着了。所以偏移量每次都会夹回可见范围。
    ///
    /// 只存偏移、不写盘：皮肤不该顺带做"记住布局"。
    /// </summary>
    public sealed class PanelDrag
    {
        private Vector2 _offset;
        private Vector2 _grabAt;
        private bool _dragging;

        public bool Dragging { get { return _dragging; } }

        /// <summary>面板当前的额外偏移（逻辑单位）。</summary>
        public Vector2 Offset { get { return _offset; } }

        /// <summary>把基础位置加上偏移。面板每帧调它拿到最终矩形。</summary>
        public Rect Apply(Rect baseRect)
        {
            return new Rect(baseRect.x + UiScale.Px(_offset.x), baseRect.y + UiScale.Px(_offset.y),
                            baseRect.width, baseRect.height);
        }

        /// <summary>回到默认位置。</summary>
        public void Reset() { _offset = Vector2.zero; _dragging = false; }

        /// <summary>
        /// 处理拖动。在 OnGUI 里、拿到面板矩形之后调一次。
        /// pressed / released / mouse 由调用方从 Event 里取 —— 这样它不依赖 Event.current 的时机。
        /// </summary>
        public void Handle(Rect panel, bool pressed, bool released, Vector2 mouse)
        {
            if (released)
            {
                _dragging = false;
                return;
            }

            if (pressed)
            {
                // 只有点在标题栏上才是"拖面板"，点内容区不能把面板拖走
                if (UiSkin.TitleBar(panel).Contains(mouse))
                {
                    _dragging = true;
                    _grabAt = mouse - new Vector2(UiScale.Px(_offset.x), UiScale.Px(_offset.y));
                }
                else
                {
                    _dragging = false;
                }
                return;
            }

            if (!_dragging) return;

            Vector2 want = (mouse - _grabAt) / Mathf.Max(0.0001f, UiScale.Scale);
            _offset = ClampToScreen(panel, want);
        }

        /// <summary>
        /// 夹回屏幕：至少要留一条标题栏能看见，否则面板就永远拖不回来了。
        /// 用"逻辑单位"算，和 UiScale 一致。
        /// </summary>
        private static Vector2 ClampToScreen(Rect panelAtBase, Vector2 want)
        {
            float scale = Mathf.Max(0.0001f, UiScale.Scale);
            float screenW = Screen.width / scale;
            float screenH = Screen.height / scale;

            float baseX = panelAtBase.x / scale;
            float baseY = panelAtBase.y / scale;
            float w = panelAtBase.width / scale;
            float h = panelAtBase.height / scale;

            // 面板最多只能拖到"标题栏还露在屏幕里"
            const float keep = UiSkin.TitleBarH + 8f;

            float x = Mathf.Clamp(want.x, -baseX - w + keep, screenW - baseX - keep);
            float y = Mathf.Clamp(want.y, -baseY, screenH - baseY - keep);
            return new Vector2(x, y);
        }

        /// <summary>从当前 Event 里取按下 / 抬起（左键）。</summary>
        public static void ReadMouse(Event e, out bool pressed, out bool released, out Vector2 mouse)
        {
            pressed = false;
            released = false;
            mouse = e != null ? e.mousePosition : Vector2.zero;
            if (e == null) return;

            if (e.type == EventType.MouseDown && e.button == 0) pressed = true;
            else if (e.type == EventType.MouseUp && e.button == 0) released = true;
        }
    }
}
