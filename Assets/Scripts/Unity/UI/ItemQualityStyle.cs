using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 品质配色。颜色只在表现层定义（Domain 里只有枚举，它不该认识 UnityEngine.Color）。
    /// 背包 / 角色 / 商店 / 地面名字 / 拾取飘字 全部走这里，保证同一件装备在哪儿看都是同一个颜色。
    ///
    /// 数值是 sRGB，交给 UiColor 转一次线性 —— 项目是 Linear 色彩空间，直接写会整体发亮。
    /// </summary>
    public static class ItemQualityStyle
    {
        /// <summary>普通装备也用它自己的颜色（不用灰色，免得看起来像"不可用"）。</summary>
        public static Color Srgb(ItemQuality q)
        {
            switch (q)
            {
                case ItemQuality.Green: return UiColor.Srgb(0.42f, 0.95f, 0.45f);
                case ItemQuality.Blue: return UiColor.Srgb(0.40f, 0.72f, 1.00f);
                case ItemQuality.Purple: return UiColor.Srgb(0.80f, 0.50f, 1.00f);
                default: return UiColor.Srgb(0.92f, 0.92f, 0.88f);
            }
        }

        /// <summary>鼠标提示里那行"稀有 / 史诗"。</summary>
        public static string Label(ItemQuality q) { return ItemQualityRules.DisplayName(q); }

        /// <summary>提示标题："稀有 短剑"；白装不前缀，免得每件都啰嗦。</summary>
        public static string TitledName(ItemQuality q, string name)
        {
            return q == ItemQuality.White ? name : Label(q) + " " + name;
        }
    }
}
