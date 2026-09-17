using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// IMGUI 是按像素画的，而 Retina 屏上 back buffer 是 3456x2160 ——
    /// 不缩放的话 13px 的字在屏幕上只有指甲盖大。
    /// 属性面板"不直观"有一大半其实是【字太小】。
    ///
    /// 以 1080 高为基准等比放大，所有界面都走这里，保证在任何分辨率下观感一致。
    /// </summary>
    public static class UiScale
    {
        private const float ReferenceHeight = 1080f;
        private static float _scale = 1f;

        public static float Scale { get { return _scale; } }

        public static void Refresh()
        {
            float s = Screen.height / ReferenceHeight;
            if (s < 1f) s = 1f;
            if (s > 3f) s = 3f;
            _scale = s;
        }

        public static float Px(float value) { return value * _scale; }

        public static int Font(int value)
        {
            int size = Mathf.RoundToInt(value * _scale);
            return size < 8 ? 8 : size;
        }

        public static Rect R(float x, float y, float w, float h)
        {
            return new Rect(x * _scale, y * _scale, w * _scale, h * _scale);
        }
    }

    /// <summary>
    /// 项目是 Linear 色彩空间（m_ActiveColorSpace: 1）：
    /// IMGUI 的颜色会被按【线性】解释，直接把 sRGB 数值写进去，显示出来会整体偏亮 ——
    /// 0.06 的"近黑"面板会变成 0.25 的中灰，看起来又灰又平。
    /// 所以界面颜色统一从 sRGB 转一次线性。（Gamma 空间的项目里这个转换是恒等，不会有副作用。）
    /// </summary>
    public static class UiColor
    {
        public static Color Srgb(float r, float g, float b, float a = 1f)
        {
            return new Color(r, g, b, a).linear;
        }
    }
}
