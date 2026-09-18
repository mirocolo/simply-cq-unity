using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 界面皮肤：整套 IMGUI 面板唯一的配色 / 字号 / 画法来源。
    ///
    /// 为什么要有它：在这之前五个面板（背包 / 角色 / 商店 / 传送 / 调参 / 快捷栏）各自复制了一份
    /// `Fill` / `Border` / `LRect` / `EnsureStyles`，还各自写死了颜色 ——
    /// 改一次配色要动五个文件，而且已经出现了三种不同的"金边"。
    /// 现在换皮肤只改这一个文件（和 README 里"换美术只动两个地方"是同一个思路）。
    ///
    /// 观感往类传奇靠：暗石底、双线金边、分隔的标题栏、**分段刻度**的血条。
    ///
    /// 注意：`GUI.skin` 只有在 OnGUI 里才可用，所以样式是**第一次用到时才建**，
    /// 并且按 `UiScale.Scale` 缓存 —— 换了 DPI 会自动重建。
    /// </summary>
    public static class UiSkin
    {
        // ------------------------------------------------------------------ 配色
        //
        // 全部走 UiColor.Srgb：项目是 Linear 色彩空间，直接写 sRGB 数值会整体发亮。

        /// <summary>面板底：接近黑的暖灰，像石头。</summary>
        public static readonly Color PanelBg = UiColor.Srgb(0.055f, 0.052f, 0.062f, 0.94f);
        /// <summary>外圈边框：暗金。</summary>
        public static readonly Color PanelBorderOuter = UiColor.Srgb(0.38f, 0.32f, 0.17f, 1f);
        /// <summary>内圈边框：亮金。双线才像"传奇那种镶边"。</summary>
        public static readonly Color PanelBorderInner = UiColor.Srgb(0.72f, 0.62f, 0.32f, 1f);
        /// <summary>标题栏底。</summary>
        public static readonly Color TitleBarBg = UiColor.Srgb(0.13f, 0.11f, 0.07f, 0.96f);

        public static readonly Color TitleText = UiColor.Srgb(1f, 0.89f, 0.52f);
        public static readonly Color TextPrimary = UiColor.Srgb(0.90f, 0.89f, 0.84f);
        public static readonly Color TextDim = UiColor.Srgb(0.66f, 0.64f, 0.57f);
        public static readonly Color TextValue = UiColor.Srgb(1f, 0.87f, 0.45f);
        public static readonly Color TextGroup = UiColor.Srgb(0.68f, 0.82f, 1f);
        public static readonly Color TextGood = UiColor.Srgb(0.48f, 0.95f, 0.53f);
        public static readonly Color TextWarn = UiColor.Srgb(1f, 0.62f, 0.28f);
        public static readonly Color TextBad = UiColor.Srgb(1f, 0.44f, 0.40f);

        /// <summary>列表行底 / 悬停底。</summary>
        public static readonly Color RowBg = UiColor.Srgb(0.115f, 0.108f, 0.100f, 0.92f);
        public static readonly Color RowHover = UiColor.Srgb(0.30f, 0.26f, 0.15f, 0.95f);
        public static readonly Color RowBorder = UiColor.Srgb(0.34f, 0.30f, 0.19f, 1f);

        /// <summary>格子底（背包格 / 装备栏）。</summary>
        public static readonly Color CellBg = UiColor.Srgb(0.12f, 0.115f, 0.108f, 0.92f);
        public static readonly Color CellHover = UiColor.Srgb(0.32f, 0.28f, 0.17f, 0.95f);
        public static readonly Color CellBorder = UiColor.Srgb(0.40f, 0.35f, 0.22f, 1f);

        /// <summary>按钮（调参面板的 -/+）。</summary>
        public static readonly Color ButtonBg = UiColor.Srgb(0.16f, 0.15f, 0.13f, 0.92f);
        public static readonly Color ButtonHover = UiColor.Srgb(0.34f, 0.30f, 0.18f, 0.95f);
        public static readonly Color ButtonActive = UiColor.Srgb(0.46f, 0.37f, 0.16f, 0.96f);

        /// <summary>进度条：底 + 血 / 蓝 / 经验。</summary>
        public static readonly Color BarBack = UiColor.Srgb(0.085f, 0.085f, 0.10f, 0.92f);
        public static readonly Color BarTick = UiColor.Srgb(0.0f, 0.0f, 0.0f, 0.35f);
        public static readonly Color HpFill = UiColor.Srgb(0.76f, 0.16f, 0.13f);
        public static readonly Color MpFill = UiColor.Srgb(0.20f, 0.34f, 0.82f);
        public static readonly Color ExpFill = UiColor.Srgb(0.22f, 0.52f, 0.88f);
        public static readonly Color BarBorder = UiColor.Srgb(0.44f, 0.39f, 0.24f, 1f);

        /// <summary>提示条（捡不起来 / 买不起）。</summary>
        public static readonly Color HintBg = UiColor.Srgb(0.13f, 0.045f, 0.04f, 0.90f);

        // ------------------------------------------------------------------ 画图

        public static void Fill(Rect r, Color c)
        {
            Color prev = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, Texture2D.whiteTexture);
            GUI.color = prev;
        }

        public static void Border(Rect r, Color c, float thickness = 1f)
        {
            float t = UiScale.Px(thickness);
            Fill(new Rect(r.x, r.y, r.width, t), c);
            Fill(new Rect(r.x, r.yMax - t, r.width, t), c);
            Fill(new Rect(r.x, r.y, t, r.height), c);
            Fill(new Rect(r.xMax - t, r.y, t, r.height), c);
        }

        /// <summary>相对外框排版：坐标和尺寸都按逻辑单位写，落屏时统一放大。</summary>
        public static Rect LRect(Rect outer, float x, float y, float w, float h)
        {
            return new Rect(outer.x + UiScale.Px(x), outer.y + UiScale.Px(y), UiScale.Px(w), UiScale.Px(h));
        }

        public static Rect Inset(Rect r, float d)
        {
            float p = UiScale.Px(d);
            return new Rect(r.x + p, r.y + p, r.width - p * 2f, r.height - p * 2f);
        }

        // ------------------------------------------------------------------ 面板 / 行 / 条

        /// <summary>标题栏高度（逻辑单位）。拖动面板就是拖这一条。</summary>
        public const float TitleBarH = 22f;

        /// <summary>画一个面板：底、双线金边、分隔的标题栏。</summary>
        public static void Panel(Rect r, string title)
        {
            Fill(r, PanelBg);

            // 双线金边：外暗内亮，看起来是镶上去的
            Border(r, PanelBorderOuter, 2f);
            Border(Inset(r, 2f), PanelBorderInner, 1f);

            Rect bar = TitleBar(r);
            Fill(bar, TitleBarBg);
            Fill(new Rect(bar.x, bar.yMax - UiScale.Px(1f), bar.width, UiScale.Px(1f)), PanelBorderInner);

            if (!string.IsNullOrEmpty(title))
                GUI.Label(new Rect(bar.x + UiScale.Px(7f), bar.y + UiScale.Px(3f), bar.width, bar.height),
                    title, Styles.Title);
        }

        /// <summary>标题栏矩形（拖动热区）。</summary>
        public static Rect TitleBar(Rect panel)
        {
            float h = UiScale.Px(TitleBarH);
            return new Rect(panel.x + UiScale.Px(3f), panel.y + UiScale.Px(3f), panel.width - UiScale.Px(6f), h);
        }

        /// <summary>列表行：默认 / 悬停两态。</summary>
        public static void Row(Rect r, bool hover)
        {
            Fill(r, hover ? RowHover : RowBg);
            Border(r, RowBorder, 1f);
        }

        /// <summary>格子（背包格 / 装备栏那一行）。</summary>
        public static void Cell(Rect r, bool highlight)
        {
            Fill(r, highlight ? CellHover : CellBg);
            Border(r, CellBorder, 1f);
        }

        /// <summary>按钮。</summary>
        public static void Button(Rect r, string text, bool hover, bool active = false)
        {
            Fill(r, active ? ButtonActive : (hover ? ButtonHover : ButtonBg));
            Border(r, RowBorder, 1f);
            GUI.Label(new Rect(r.x + UiScale.Px(6f), r.y + UiScale.Px(2f), r.width, r.height), text, Styles.Button);
        }

        /// <summary>
        /// 分段进度条。传奇那种"一格一格"的血条 ——
        /// 分段不只是好看：一眼能估出"还剩几格"，比一根连续条更准。
        /// </summary>
        public static void Bar(Rect r, float percent, Color fill, string text, int segments = 10)
        {
            float pct = percent < 0f ? 0f : (percent > 1f ? 1f : percent);

            Fill(r, BarBack);
            if (pct > 0f) Fill(new Rect(r.x, r.y, r.width * pct, r.height), fill);

            // 分段刻度线（画在填充之上，所以空的那一段也能看出格子）
            if (segments > 1)
            {
                float step = r.width / segments;
                for (int i = 1; i < segments; i++)
                    Fill(new Rect(r.x + step * i, r.y, Mathf.Max(1f, UiScale.Px(0.7f)), r.height), BarTick);
            }

            Border(r, BarBorder, 1f);
            if (!string.IsNullOrEmpty(text))
                GUI.Label(new Rect(r.x + UiScale.Px(6f), r.y, r.width, r.height), text, Styles.Bar);
        }

        /// <summary>提示条（居中底部的一条）。</summary>
        public static void Hint(Rect r, string text)
        {
            Fill(r, HintBg);
            Border(r, TextBad, 1f);
            GUI.Label(r, text, Styles.Hint);
        }

        // ------------------------------------------------------------------ 字号

        /// <summary>整套文字样式。第一次在 OnGUI 里用到时建，DPI 变了自动重建。</summary>
        public sealed class TextStyles
        {
            /// <summary>正文。</summary>
            public GUIStyle Label;
            /// <summary>数值（金色，右对齐那种用 Alignment 单独改）。</summary>
            public GUIStyle Value;
            /// <summary>面板标题。</summary>
            public GUIStyle Title;
            /// <summary>次要说明（小一号、灰）。</summary>
            public GUIStyle Small;
            /// <summary>分组标题（蓝）。</summary>
            public GUIStyle Group;
            /// <summary>按钮字。</summary>
            public GUIStyle Button;
            /// <summary>压在小数值箭头右边的字。</summary>
            public GUIStyle Good;
            /// <summary>买不起 / 不合法的红字。</summary>
            public GUIStyle Bad;
            /// <summary>提醒（橙色，比如"窗口没焦点"）。</summary>
            public GUIStyle Warn;
            /// <summary>压在进度条上的字。</summary>
            public GUIStyle Bar;
            /// <summary>提示条。</summary>
            public GUIStyle Hint;
        }

        private static TextStyles _styles;
        private static float _builtAtScale = -1f;

        public static TextStyles Styles
        {
            get
            {
                if (_styles == null || _builtAtScale != UiScale.Scale) Build();
                return _styles;
            }
        }

        /// <summary>丢掉缓存的样式（退出 Play / 自检里想重建时用）。</summary>
        public static void ResetStyles()
        {
            _styles = null;
            _builtAtScale = -1f;
        }

        private static void Build()
        {
            TextStyles t = new TextStyles();

            t.Label = Make(13, TextPrimary);
            t.Value = Make(13, TextValue);
            t.Title = Make(14, TitleText);
            t.Small = Make(11, TextDim);
            t.Group = Make(13, TextGroup);
            t.Button = Make(13, TextPrimary, TextAnchor.MiddleCenter);
            t.Good = Make(13, TextGood);
            t.Bad = Make(13, TextBad);
            t.Warn = Make(13, TextWarn);
            t.Bar = Make(12, Color.white);
            t.Hint = Make(13, TextWarn, TextAnchor.MiddleCenter);

            _styles = t;
            _builtAtScale = UiScale.Scale;
        }

        private static GUIStyle Make(int logicalSize, Color color, TextAnchor anchor = TextAnchor.MiddleLeft)
        {
            // 注意：GUI.skin 只有在 OnGUI 里才拿得到（在别处访问 Unity 会直接抛异常，
            // 连判空都躲不过）。所以样式只能在 OnGUI 里懒建 —— 自检别去碰 Styles。
            GUIStyle s = new GUIStyle(GUI.skin.label);
            s.fontSize = UiScale.Font(logicalSize);
            s.alignment = anchor;
            s.normal.textColor = color;
            s.clipping = TextClipping.Clip;
            return s;
        }

        /// <summary>取一份 Value 的右对齐版本（数值列）。</summary>
        public static GUIStyle RightAligned(GUIStyle source)
        {
            GUIStyle s = new GUIStyle(source);
            s.alignment = TextAnchor.MiddleRight;
            return s;
        }
    }
}
