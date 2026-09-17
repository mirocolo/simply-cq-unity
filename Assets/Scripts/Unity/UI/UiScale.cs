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
}
