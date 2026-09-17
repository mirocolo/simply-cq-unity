using System.Collections.Generic;
using SimplyCQ.Domain;
using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>
    /// 程序化占位美术：一行美术资源都不需要，运行时光栅图生成 Sprite。
    /// 想换成真素材时，只需要改这个类里 sprite 的来源，其它代码一行都不用动。
    /// </summary>
    public static class PlaceholderArt
    {
        private static readonly Dictionary<string, Sprite> Cache = new Dictionary<string, Sprite>();

        private static readonly Color[] GroundColors =
        {
            new Color(0.24f, 0.44f, 0.22f), // 0 草地
            new Color(0.29f, 0.50f, 0.26f), // 1 草地(亮)
            new Color(0.13f, 0.31f, 0.55f), // 2 水
            new Color(0.16f, 0.30f, 0.16f), // 3 树林
            new Color(0.52f, 0.44f, 0.30f), // 4 土路
            new Color(0.36f, 0.36f, 0.40f), // 5 山
            new Color(0.44f, 0.44f, 0.47f)  // 6 石板
        };

        public static int GroundColorCount { get { return GroundColors.Length; } }

        public static Color GetGroundColor(int groundId)
        {
            if (groundId < 0 || groundId >= GroundColors.Length) return Color.magenta;
            return GroundColors[groundId];
        }

        /// <summary>没有美术时的「随机但不难看」的实体配色：同一个 id 永远同一个颜色。</summary>
        public static Color BodyColorFor(string id)
        {
            if (string.IsNullOrEmpty(id)) return Color.gray;
            int h = 17;
            for (int i = 0; i < id.Length; i++) h = h * 31 + id[i];
            h = Mathf.Abs(h);
            return Color.HSVToRGB((h % 360) / 360f, 0.55f, 0.82f);
        }

        // ------------------------------------------------------------------ 地表

        public static Sprite Tile(int groundId, int variant, int w, int h, float ppu)
        {
            string key = "tile|" + groundId + "|" + variant + "|" + w + "x" + h + "|" + ppu;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            Color baseColor = GetGroundColor(groundId);
            Color[] px = new Color[w * h];
            for (int i = 0; i < px.Length; i++) px[i] = baseColor;

            Rng rng = new Rng((uint)(groundId * 977 + variant * 131 + 7));

            int dots = Mathf.Max(4, (w * h) / 90);
            for (int i = 0; i < dots; i++)
            {
                int x = rng.Range(1, w - 2);
                int y = rng.Range(1, h - 2);
                if (x < 1 || y < 1 || x > w - 2 || y > h - 2) continue;
                px[y * w + x] = Shade(baseColor, rng.Chance(0.5f) ? 1.12f : 0.86f);
            }

            // 很淡的格子线：调试时能一眼看出格子和投影对不对
            Color line = Shade(baseColor, 0.80f);
            for (int x = 0; x < w; x++) { px[x] = line; px[(h - 1) * w + x] = line; }
            for (int y = 0; y < h; y++) { px[y * w] = line; px[y * w + w - 1] = line; }

            if (groundId == 2)
            {
                // 水：一条波纹
                for (int x = 2; x < w - 2; x++)
                {
                    int y = 3 + Mathf.RoundToInt(h * 0.45f + Mathf.Sin((x + variant * 5) * 0.35f) * 1.5f);
                    if (y > 1 && y < h - 2)
                    {
                        px[y * w + x] = Shade(baseColor, 1.40f);
                        px[(y + 1) * w + x] = Shade(baseColor, 1.25f);
                    }
                }
            }
            else if (groundId == 3 || groundId == 5)
            {
                // 树 / 山：下暗上亮，伪造一点高度
                for (int y = 0; y < h; y++)
                {
                    float k = 0.62f + 0.55f * (y / (float)(h - 1));
                    for (int x = 0; x < w; x++) px[y * w + x] = Shade(baseColor, k);
                }
            }

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0.5f), key);
            Cache[key] = sprite;
            return sprite;
        }

        // ------------------------------------------------------------------ 角色

        public static Sprite Character(string key, Color body, Dir dir, int w, int h, float ppu)
        {
            string full = "char|" + key + "|" + (int)dir + "|" + w + "x" + h + "|" + ppu;
            Sprite cached;
            if (Cache.TryGetValue(full, out cached) && cached != null) return cached;

            Color[] px = new Color[w * h];
            int cx = w / 2;

            // 脚下阴影（半透明，不参与描边）
            Ellipse(px, w, h, cx, Mathf.RoundToInt(h * 0.09f), Mathf.RoundToInt(w * 0.40f), Mathf.RoundToInt(h * 0.10f), new Color(0f, 0f, 0f, 0.30f));

            // 身体
            int bodyBottom = Mathf.RoundToInt(h * 0.08f);
            int bodyTop = Mathf.RoundToInt(h * 0.64f);
            FillRect(px, w, h, cx - w / 3, bodyBottom, cx + w / 3, bodyTop, body);
            FillRect(px, w, h, cx - w / 3, Mathf.RoundToInt(h * 0.28f), cx + w / 3, Mathf.RoundToInt(h * 0.34f), Shade(body, 0.70f));

            // 头 + 头发/头盔
            int headBottom = bodyTop;
            int headTop = Mathf.Min(h - 2, headBottom + Mathf.RoundToInt(h * 0.24f));
            FillRect(px, w, h, cx - w / 5, headBottom, cx + w / 5, headTop, new Color(0.88f, 0.74f, 0.60f));
            FillRect(px, w, h, cx - w / 5, Mathf.Max(headBottom, headTop - 3), cx + w / 5, headTop, Shade(body, 0.85f));

            // 朝向标记：脑袋前方一个小亮点，一眼看出朝哪边
            int fx = cx + DirHelper.Dx(dir) * Mathf.RoundToInt(w * 0.30f);
            int fy = (headBottom + headTop) / 2 - DirHelper.Dy(dir) * Mathf.RoundToInt(h * 0.05f);
            Dot(px, w, h, fx, fy, Mathf.Max(2, w / 9), new Color(0.96f, 0.96f, 0.40f));

            Outline(px, w, h, new Color(0.05f, 0.05f, 0.07f, 0.95f));

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0f), full);
            Cache[full] = sprite;
            return sprite;
        }

        /// <summary>地面金币。真素材进来之后这里换成金币 Sprite 就行。</summary>
        public static Sprite Coin(string key, int w, int h, float ppu)
        {
            string full = "coin|" + w + "x" + h + "|" + ppu;
            Sprite cached;
            if (Cache.TryGetValue(full, out cached) && cached != null) return cached;

            Color gold = new Color(0.96f, 0.79f, 0.22f);
            Color dark = new Color(0.55f, 0.38f, 0.05f);
            Color[] px = new Color[w * h];
            int cx = w / 2;
            int cy = h / 2 + Mathf.RoundToInt(h * 0.08f);
            int rx = Mathf.RoundToInt(w * 0.34f);
            int ry = Mathf.RoundToInt(h * 0.34f);

            Ellipse(px, w, h, cx, Mathf.RoundToInt(h * 0.14f), Mathf.RoundToInt(w * 0.34f), Mathf.RoundToInt(h * 0.12f), new Color(0f, 0f, 0f, 0.30f));
            Ellipse(px, w, h, cx, cy, rx, ry, gold);
            Ellipse(px, w, h, cx, cy, Mathf.Max(1, rx / 2), Mathf.Max(1, ry / 2), dark);
            Outline(px, w, h, new Color(0.05f, 0.05f, 0.07f, 0.95f));

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0.5f), full);
            Cache[full] = sprite;
            return sprite;
        }

        /// <summary>背包/装备栏里的小图标。按物品类型画不同形状，一眼能分出药水/装备/材料。</summary>
        public static Sprite ItemIcon(string key, ItemType type, int sizePx)
        {
            string full = "icon|" + key + "|" + (int)type + "|" + sizePx;
            Sprite cached;
            if (Cache.TryGetValue(full, out cached) && cached != null) return cached;

            int w = sizePx;
            int h = sizePx;
            Color body = BodyColorFor(key);
            Color dark = Shade(body, 0.55f);
            Color[] px = new Color[w * h];
            int cx = w / 2;
            int cy = h / 2;

            switch (type)
            {
                case ItemType.Consumable:
                    // 药瓶：圆肚子 + 细脖子 + 瓶塞
                    Ellipse(px, w, h, cx, Mathf.RoundToInt(h * 0.34f), Mathf.RoundToInt(w * 0.32f), Mathf.RoundToInt(h * 0.30f), body);
                    FillRect(px, w, h, cx - w / 8, Mathf.RoundToInt(h * 0.60f), cx + w / 8, Mathf.RoundToInt(h * 0.82f), body);
                    FillRect(px, w, h, cx - w / 6, Mathf.RoundToInt(h * 0.82f), cx + w / 6, Mathf.RoundToInt(h * 0.94f), dark);
                    Ellipse(px, w, h, cx, Mathf.RoundToInt(h * 0.30f), Mathf.RoundToInt(w * 0.12f), Mathf.RoundToInt(h * 0.10f), Shade(body, 1.35f));
                    break;
                case ItemType.Equip:
                    // 装备：菱形
                    Diamond(px, w, h, Mathf.RoundToInt(w * 0.42f), body);
                    Diamond(px, w, h, Mathf.RoundToInt(w * 0.18f), dark);
                    break;
                case ItemType.Book:
                    FillRect(px, w, h, Mathf.RoundToInt(w * 0.22f), Mathf.RoundToInt(h * 0.18f), Mathf.RoundToInt(w * 0.78f), Mathf.RoundToInt(h * 0.82f), body);
                    FillRect(px, w, h, Mathf.RoundToInt(w * 0.30f), Mathf.RoundToInt(h * 0.45f), Mathf.RoundToInt(w * 0.70f), Mathf.RoundToInt(h * 0.55f), dark);
                    break;
                default:
                    // 材料：圆饼
                    Ellipse(px, w, h, cx, cy, Mathf.RoundToInt(w * 0.34f), Mathf.RoundToInt(h * 0.34f), body);
                    Ellipse(px, w, h, cx, cy, Mathf.RoundToInt(w * 0.16f), Mathf.RoundToInt(h * 0.16f), dark);
                    break;
            }

            Outline(px, w, h, new Color(0.05f, 0.05f, 0.07f, 0.95f));

            Sprite sprite = Build(px, w, h, sizePx, new Vector2(0.5f, 0.5f), full);
            Cache[full] = sprite;
            return sprite;
        }

        private static void Diamond(Color[] px, int w, int h, int radius, Color c)
        {
            if (radius < 1) radius = 1;
            int cx = w / 2;
            int cy = h / 2;
            for (int y = cy - radius; y <= cy + radius; y++)
            {
                if (y < 0 || y >= h) continue;
                for (int x = cx - radius; x <= cx + radius; x++)
                {
                    if (x < 0 || x >= w) continue;
                    if (Mathf.Abs(x - cx) + Mathf.Abs(y - cy) <= radius) px[y * w + x] = c;
                }
            }
        }

        public static void ClearCache() { Cache.Clear(); }

        // ------------------------------------------------------------------ 画图小工具

        private static void FillRect(Color[] px, int w, int h, int x0, int y0, int x1, int y1, Color c)
        {
            if (x0 > x1) { int t = x0; x0 = x1; x1 = t; }
            if (y0 > y1) { int t = y0; y0 = y1; y1 = t; }
            if (x0 < 0) x0 = 0;
            if (y0 < 0) y0 = 0;
            if (x1 > w - 1) x1 = w - 1;
            if (y1 > h - 1) y1 = h - 1;
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                    px[y * w + x] = c;
        }

        private static void Ellipse(Color[] px, int w, int h, int cx, int cy, int rx, int ry, Color c)
        {
            if (rx < 1) rx = 1;
            if (ry < 1) ry = 1;
            for (int y = cy - ry; y <= cy + ry; y++)
            {
                if (y < 0 || y >= h) continue;
                for (int x = cx - rx; x <= cx + rx; x++)
                {
                    if (x < 0 || x >= w) continue;
                    float nx = (x - cx) / (float)rx;
                    float ny = (y - cy) / (float)ry;
                    if (nx * nx + ny * ny <= 1f) px[y * w + x] = c;
                }
            }
        }

        private static void Dot(Color[] px, int w, int h, int cx, int cy, int r, Color c)
        {
            Ellipse(px, w, h, cx, cy, r, r, c);
        }

        /// <summary>给不透明区域描一圈黑边，占位图立刻有「像样」的感觉。</summary>
        private static void Outline(Color[] px, int w, int h, Color outline)
        {
            Color[] copy = (Color[])px.Clone();
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    int i = y * w + x;
                    if (copy[i].a > 0.5f) continue;
                    bool near =
                        (x > 0 && copy[i - 1].a > 0.5f) ||
                        (x < w - 1 && copy[i + 1].a > 0.5f) ||
                        (y > 0 && copy[i - w].a > 0.5f) ||
                        (y < h - 1 && copy[i + w].a > 0.5f);
                    if (near) px[i] = outline;
                }
            }
        }

        private static Sprite Build(Color[] px, int w, int h, float ppu, Vector2 pivot, string name)
        {
            Texture2D tex = new Texture2D(w, h, TextureFormat.RGBA32, false);
            tex.name = "ph_" + name;
            tex.filterMode = FilterMode.Point;
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.hideFlags = HideFlags.DontSave;
            tex.SetPixels(px);
            tex.Apply(false, false);

            Sprite sprite = Sprite.Create(tex, new Rect(0f, 0f, w, h), pivot, ppu, 0, SpriteMeshType.FullRect);
            sprite.name = "ph_" + name;
            sprite.hideFlags = HideFlags.DontSave;
            return sprite;
        }

        private static Color Shade(Color c, float k)
        {
            return new Color(Mathf.Clamp01(c.r * k), Mathf.Clamp01(c.g * k), Mathf.Clamp01(c.b * k), c.a);
        }
    }
}
