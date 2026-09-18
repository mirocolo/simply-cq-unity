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

        /// <summary>挥砍刀光：一道月牙。配合旋转使用，指向攻击方向。</summary>
        public static Sprite Slash(int widthPx, int heightPx, float ppu)
        {
            string key = "slash|" + widthPx + "x" + heightPx;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            Color core = new Color(1f, 1f, 1f, 0.95f);
            Color glow = new Color(0.75f, 0.92f, 1f, 0.75f);
            Color[] px = new Color[widthPx * heightPx];

            for (int x = 0; x < widthPx; x++)
            {
                float t = x / (float)(widthPx - 1);
                float bend = Mathf.Sin(t * Mathf.PI);
                int y = Mathf.RoundToInt(heightPx * 0.5f + bend * (heightPx * 0.30f));
                int thickness = Mathf.Max(2, Mathf.RoundToInt(bend * heightPx * 0.32f));

                for (int k = -thickness / 2; k <= thickness / 2; k++)
                {
                    int yy = y + k;
                    if (yy < 0 || yy >= heightPx) continue;
                    bool isCore = Mathf.Abs(k) <= Mathf.Max(0, thickness / 4);
                    px[yy * widthPx + x] = isCore ? core : glow;
                }
            }

            Sprite sprite = Build(px, widthPx, heightPx, ppu, new Vector2(0.5f, 0.5f), key);
            Cache[key] = sprite;
            return sprite;
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

        // ------------------------------------------------------------------ 特效
        //
        // 都是"白色/中性的底图"，具体颜色由特效池用 SpriteRenderer.color 染 ——
        // 一张图能当命中、暴击、升级光柱、品质光柱用，不用给每种颜色各生成一张。

        /// <summary>星芒爆点：亮核 + 四长四短的尖刺。命中/暴击那一下用。</summary>
        public static Sprite Blast(int sizePx, float ppu)
        {
            string key = "blast|" + sizePx;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            Color core = new Color(1f, 1f, 1f, 0.95f);
            Color spike = new Color(1f, 1f, 1f, 0.75f);
            Color fade = new Color(1f, 1f, 1f, 0.35f);

            int w = sizePx, h = sizePx;
            Color[] px = new Color[w * h];
            int c = sizePx / 2;

            Ellipse(px, w, h, c, c, Mathf.Max(1, sizePx / 6), Mathf.Max(1, sizePx / 6), core);

            // 四长（上下左右）+ 四短（对角）
            int longLen = sizePx / 2 - 1;
            int shortLen = Mathf.RoundToInt(longLen * 0.55f);
            int[][] dirs = { new[] { 1, 0 }, new[] { -1, 0 }, new[] { 0, 1 }, new[] { 0, -1 } };
            for (int d = 0; d < dirs.Length; d++)
                Spike(px, w, h, c, c, dirs[d][0], dirs[d][1], longLen, spike, fade);
            int[][] diag = { new[] { 1, 1 }, new[] { 1, -1 }, new[] { -1, 1 }, new[] { -1, -1 } };
            for (int d = 0; d < diag.Length; d++)
                Spike(px, w, h, c, c, diag[d][0], diag[d][1], shortLen, spike, fade);

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0.5f), key);
            Cache[key] = sprite;
            return sprite;
        }

        /// <summary>一圈冲击波：中间空的圆环，越往外越淡。</summary>
        public static Sprite Ring(int sizePx, float ppu)
        {
            string key = "ring|" + sizePx;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            int w = sizePx, h = sizePx;
            Color[] px = new Color[w * h];
            float outer = sizePx * 0.48f;
            float inner = sizePx * 0.34f;
            float cx = (sizePx - 1) * 0.5f;
            float cy = (sizePx - 1) * 0.5f;

            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    float d = Mathf.Sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                    if (d > outer || d < inner) continue;
                    float t = Mathf.InverseLerp(inner, outer, d);
                    px[y * w + x] = new Color(1f, 1f, 1f, Mathf.Lerp(0.9f, 0.15f, t));
                }
            }

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0.5f), key);
            Cache[key] = sprite;
            return sprite;
        }

        /// <summary>烟团：几个叠在一起的圆，边缘抖一点，别是个完美圆。</summary>
        public static Sprite Puff(int sizePx, float ppu)
        {
            string key = "puff|" + sizePx;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            int w = sizePx, h = sizePx;
            Color[] px = new Color[w * h];
            int c = sizePx / 2;
            int big = Mathf.Max(2, Mathf.RoundToInt(sizePx * 0.30f));
            int small = Mathf.Max(1, Mathf.RoundToInt(sizePx * 0.20f));

            Ellipse(px, w, h, c, c, big, big, new Color(1f, 1f, 1f, 0.42f));
            Ellipse(px, w, h, c - big, c - big / 2, small, small, new Color(1f, 1f, 1f, 0.34f));
            Ellipse(px, w, h, c + big, c - small, small, small, new Color(1f, 1f, 1f, 0.34f));
            Ellipse(px, w, h, c - small, c + big, small, small, new Color(1f, 1f, 1f, 0.30f));
            Ellipse(px, w, h, c + small / 2, c + big, small, small, new Color(1f, 1f, 1f, 0.30f));

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0.5f), key);
            Cache[key] = sprite;
            return sprite;
        }

        /// <summary>光柱：中间亮、两侧淡，顶端收细。pivot 在底部中心，方便"从地上长出来"。</summary>
        public static Sprite Beam(int widthPx, int heightPx, float ppu)
        {
            string key = "beam|" + widthPx + "x" + heightPx;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            int w = widthPx, h = heightPx;
            Color[] px = new Color[w * h];
            float half = (w - 1) * 0.5f;

            for (int y = 0; y < h; y++)
            {
                float ty = y / (float)(h - 1);
                // 越靠顶端越窄越淡
                float widthK = Mathf.Lerp(1f, 0.45f, ty);
                float alphaK = Mathf.Lerp(1f, 0.15f, ty * ty);

                for (int x = 0; x < w; x++)
                {
                    float dx = Mathf.Abs(x - half) / Mathf.Max(0.001f, half * widthK);
                    if (dx > 1f) continue;
                    float a = Mathf.Lerp(0.65f, 0.10f, dx * dx) * alphaK;
                    px[y * w + x] = new Color(1f, 1f, 1f, a);
                }
            }

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0f), key);
            Cache[key] = sprite;
            return sprite;
        }

        /// <summary>直线斩：一条两头收尖的横线（刺杀剑术那种直线攻击）。</summary>
        public static Sprite Line(int widthPx, int heightPx, float ppu)
        {
            string key = "line|" + widthPx + "x" + heightPx;
            Sprite cached;
            if (Cache.TryGetValue(key, out cached) && cached != null) return cached;

            int w = widthPx, h = heightPx;
            Color[] px = new Color[w * h];
            int mid = h / 2;

            for (int x = 0; x < w; x++)
            {
                float t = x / (float)(w - 1);
                float taper = Mathf.Sin(t * Mathf.PI);          // 两头细
                int thickness = Mathf.Max(1, Mathf.RoundToInt(taper * (h * 0.45f)));
                float a = Mathf.Lerp(0.5f, 1f, taper);
                for (int k = -thickness; k <= thickness; k++)
                {
                    int y = mid + k;
                    if (y < 0 || y >= h) continue;
                    px[y * w + x] = new Color(1f, 1f, 1f, a);
                }
            }

            Sprite sprite = Build(px, w, h, ppu, new Vector2(0.5f, 0.5f), key);
            Cache[key] = sprite;
            return sprite;
        }

        /// <summary>从中心沿一个方向画一条尖刺：越远越细越淡。</summary>
        private static void Spike(Color[] px, int w, int h, int cx, int cy,
                                  int dx, int dy, int len, Color near, Color far)
        {
            for (int i = 1; i <= len; i++)
            {
                // 斜向的尖刺走得慢一点，视觉上长度才接近
                float step = (dx != 0 && dy != 0) ? 0.71f : 1f;
                int x = cx + Mathf.RoundToInt(dx * i * step);
                int y = cy + Mathf.RoundToInt(dy * i * step);
                if (x < 0 || x >= w || y < 0 || y >= h) continue;

                float t = i / (float)len;
                float thickness = Mathf.Lerp(1f, 0f, t);
                px[y * w + x] = t < 0.5f ? near : (t < 0.85f ? far : new Color(1f, 1f, 1f, 0.18f));

                if (thickness > 0.5f)
                {
                    int px2 = Mathf.Clamp(x + (dy != 0 ? 1 : 0), 0, w - 1);
                    int py2 = Mathf.Clamp(y + (dx != 0 ? 1 : 0), 0, h - 1);
                    px[py2 * w + px2] = new Color(1f, 1f, 1f, 0.55f);
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
