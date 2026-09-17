using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 伪 2.5D 投影：格子坐标 -> Unity 世界坐标。
    /// 地表 tile 是 48x32（比宽比高宽），所以正俯视变成了「斜俯视」—— 传奇那个味道就是从这来的。
    /// 以后要换真正的等距菱形投影，只改这一个类。
    /// </summary>
    public sealed class Projection
    {
        public readonly float TileW;
        public readonly float TileH;

        public Projection(float tileW, float tileH)
        {
            TileW = tileW;
            TileH = tileH;
        }

        /// <summary>格子中心的世界坐标（地表 sprite 放这里）。</summary>
        public Vector3 TileCenter(TilePos p)
        {
            return new Vector3(p.X * TileW, -p.Y * TileH, 0f);
        }

        /// <summary>角色「脚底」的世界坐标（角色 sprite 的 pivot 在底部中心）。</summary>
        public Vector3 FootPoint(TilePos p)
        {
            return TileCenter(p) + new Vector3(0f, TileH * 0.18f, 0f);
        }

        /// <summary>越靠屏幕下方（格子 Y 越大）越靠前。</summary>
        public int SortOrderFor(float worldY)
        {
            return Mathf.Clamp(Mathf.RoundToInt(-worldY * 100f), -30000, 30000);
        }

        public Rect MapWorldRect(int width, int height)
        {
            float minX = -TileW * 0.5f;
            float maxX = (width - 1) * TileW + TileW * 0.5f;
            float minY = -(height - 1) * TileH - TileH * 0.5f;
            float maxY = TileH * 0.5f;
            return Rect.MinMaxRect(minX, minY, maxX, maxY);
        }
    }
}
