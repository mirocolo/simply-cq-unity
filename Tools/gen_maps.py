#!/usr/bin/env python3
"""生成并校验 map_town / map_cave。

之所以用脚本生成而不是手敲 40x40 字符画：手敲必然出现「传送点落在水里」
这种错，而这种错只有跑起来才会发现。这里把 MapLoader 的解析规则和
Domain 里的硬约束都在本地实现一遍，生成完立刻校验。

用法：python3 Tools/gen_maps.py [--write]
不带 --write 只校验并打印，带 --write 才落盘。
"""
import json
import os
import sys
from collections import deque

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPS_DIR = os.path.join(ROOT, "Assets", "StreamingAssets", "Data", "maps")

BLOCKED_CHARS = {"#", "~", "^"}


# ---------------------------------------------------------------- town
def build_town():
    W = H = 40
    g = [["," for _ in range(W)] for _ in range(H)]

    def fill(x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < W and 0 <= y < H:
                    g[y][x] = ch

    # 中央石板广场
    fill(14, 14, 25, 25, "+")
    # 十字主路（穿过广场）
    fill(1, 19, 38, 20, "=")
    fill(19, 1, 20, 38, "=")
    # 北门支路：从广场一直通到北边（草原来的落点是 (16,4)）
    fill(16, 2, 17, 13, "=")

    # 树林
    for (x0, y0, x1, y1) in [(5, 6, 7, 8), (30, 8, 32, 10), (5, 28, 7, 30),
                             (24, 5, 26, 7), (33, 27, 35, 29), (2, 14, 3, 16)]:
        fill(x0, y0, x1, y1, "#")
    # 水池
    fill(28, 30, 33, 33, "~")

    # 外圈封口（MapLoader 的 SealBorders 也会做，这里显式写出来，数据自解释）
    fill(0, 0, W - 1, 0, "#")
    fill(0, H - 1, W - 1, H - 1, "#")
    fill(0, 0, 0, H - 1, "#")
    fill(W - 1, 0, W - 1, H - 1, "#")

    return {
        "id": "map_town",
        "name": "比邻镇",
        "width": W,
        "height": H,
        "spawnX": 20,
        "spawnY": 20,
        "music": "town",
        "rows": ["".join(r) for r in g],
        "portals": [
            # 回新手草原（落点在草原传送点北边两格，免得一落地就又被送回来）
            {"x": 20, "y": 36, "targetMap": "map_grassland", "targetX": 24, "targetY": 44},
            # 进洞窟
            {"x": 33, "y": 20, "targetMap": "map_cave", "targetX": 20, "targetY": 34},
        ],
        "spawners": [],
        "npcs": [
            {"x": 17, "y": 17, "npcId": "npc_merchant"},
            # 传送员摆在广场东侧，和杂货商分开，免得两个人挤在一格里
            {"x": 23, "y": 17, "npcId": "npc_teleporter"},
        ],
    }


# ---------------------------------------------------------------- cave
def build_cave():
    W = H = 40
    g = [["^" for _ in range(W)] for _ in range(H)]

    def carve(x0, y0, x1, y1, ch="+"):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < W and 0 <= y < H:
                    g[y][x] = ch

    carve(15, 29, 25, 36)          # 入口厅
    carve(7, 27, 14, 33)           # 西侧 tier1（跟入口厅贴边，天然连通）
    carve(25, 26, 26, 29, "=")     # 入口厅 -> 东侧 的走廊
    carve(26, 18, 35, 27)          # 东侧 tier2
    carve(12, 22, 13, 27, "=")     # tier1 -> 西北 tier3 的走廊
    carve(8, 14, 18, 22)           # 西北 tier3
    carve(29, 15, 30, 19, "=")     # tier2 -> 深处 的走廊
    carve(24, 8, 34, 16)           # 深处大厅
    carve(14, 3, 26, 7)            # 洞底大厅（Lv10+ 的窝，和深处大厅在 x24~26 处上下相接）

    # 岩壁上的水潭（纯装饰，阻挡）
    carve(2, 4, 4, 6, "~")
    carve(36, 33, 38, 35, "~")

    # 外圈封口
    carve(0, 0, W - 1, 0, "#")
    carve(0, H - 1, W - 1, H - 1, "#")
    carve(0, 0, 0, H - 1, "#")
    carve(W - 1, 0, W - 1, H - 1, "#")

    return {
        "id": "map_cave",
        "name": "幽暗石洞",
        "width": W,
        "height": H,
        "spawnX": 20,
        "spawnY": 34,
        "music": "cave",
        "rows": ["".join(r) for r in g],
        "portals": [
            {"x": 20, "y": 36, "targetMap": "map_town", "targetX": 30, "targetY": 20},
        ],
        "spawners": [
            # 难度带：入口(南，y≈36)浅 -> 洞底(y≈3)强。
            # 越往里走怪的等级越高，不用另加"地图等级"机制；洞底那几只基本是"见到了就该跑"。
            # 入口厅 —— 蝙蝠(Lv3)
            {"x": 16, "y": 30, "w": 9, "h": 4, "monsterId": "mon_bat", "max": 5, "intervalTicks": 24},
            # 西侧 tier1 —— 野狼(Lv4) / 骷髅(Lv4)
            {"x": 8, "y": 28, "w": 6, "h": 3, "monsterId": "mon_wolf", "max": 4, "intervalTicks": 30},
            {"x": 8, "y": 31, "w": 6, "h": 2, "monsterId": "mon_skeleton", "max": 3, "intervalTicks": 32},
            # 东侧 tier2 —— 巨蜘蛛(Lv5) / 僵尸(Lv5)
            {"x": 27, "y": 19, "w": 8, "h": 4, "monsterId": "mon_spider", "max": 4, "intervalTicks": 28},
            {"x": 27, "y": 24, "w": 8, "h": 3, "monsterId": "mon_zombie", "max": 3, "intervalTicks": 36},
            # 西北 tier3 —— 半兽人(Lv6) / 食尸鬼(Lv7)
            {"x": 9, "y": 15, "w": 9, "h": 3, "monsterId": "mon_orc", "max": 3, "intervalTicks": 34},
            {"x": 9, "y": 19, "w": 9, "h": 3, "monsterId": "mon_ghoul", "max": 3, "intervalTicks": 32},
            # 深处大厅 —— 幽魂(Lv9) / 狼王(Lv8) / 石像鬼(Lv8) / 石头人(Lv10)
            {"x": 25, "y": 9, "w": 9, "h": 2, "monsterId": "mon_wraith", "max": 3, "intervalTicks": 40},
            {"x": 25, "y": 11, "w": 9, "h": 2, "monsterId": "mon_wolf_alpha", "max": 1, "intervalTicks": 90},
            {"x": 25, "y": 13, "w": 9, "h": 2, "monsterId": "mon_gargoyle", "max": 2, "intervalTicks": 45},
            {"x": 25, "y": 15, "w": 9, "h": 2, "monsterId": "mon_golem", "max": 2, "intervalTicks": 60},
            # 洞底大厅 —— 暗黑骑士(Lv11) / 巫妖(Lv12) / 幼龙(Lv13) / 洞窟领主(Lv15)
            {"x": 15, "y": 3, "w": 11, "h": 1, "monsterId": "mon_dark_knight", "max": 2, "intervalTicks": 60},
            {"x": 15, "y": 4, "w": 11, "h": 1, "monsterId": "mon_lich", "max": 2, "intervalTicks": 70},
            {"x": 15, "y": 5, "w": 11, "h": 1, "monsterId": "mon_dragon_whelp", "max": 2, "intervalTicks": 90},
            {"x": 15, "y": 7, "w": 11, "h": 1, "monsterId": "mon_cave_lord", "max": 1, "intervalTicks": 150},
        ],
        "npcs": [],
    }


# ---------------------------------------------------------------- validate
def walkable(g, x, y):
    if y < 0 or y >= len(g) or x < 0 or x >= len(g[0]):
        return False
    return g[y][x] not in BLOCKED_CHARS


def validate(maps, errs):
    by_id = {m["id"]: m for m in maps}
    grids = {m["id"]: m["rows"] for m in maps}

    for m in maps:
        g = m["rows"]
        tag = m["id"]

        if len(g) != m["height"]:
            errs.append(f"{tag}: rows 行数 {len(g)} != height {m['height']}")
        for y, row in enumerate(g):
            if len(row) != m["width"]:
                errs.append(f"{tag}: 第 {y} 行长度 {len(row)} != width {m['width']}")

        # MapLoader 会强制封边
        for y, row in enumerate(g):
            for x, ch in enumerate(row):
                if x in (0, m["width"] - 1) or y in (0, m["height"] - 1):
                    if ch not in BLOCKED_CHARS:
                        errs.append(f"{tag}: 边界格 ({x},{y}) = {ch} 不是阻挡")

        if not walkable(g, m["spawnX"], m["spawnY"]):
            errs.append(f"{tag}: 出生点 ({m['spawnX']},{m['spawnY']}) 不可走")

        portal_tiles = {(p["x"], p["y"]) for p in m["portals"]}
        if (m["spawnX"], m["spawnY"]) in portal_tiles:
            errs.append(f"{tag}: 出生点压在传送点上")

        for p in m["portals"]:
            if not walkable(g, p["x"], p["y"]):
                errs.append(f"{tag}: 传送点 ({p['x']},{p['y']}) 不可走")
            if p["targetMap"] not in by_id:
                errs.append(f"{tag}: 传送目标地图不存在 {p['targetMap']}")
                continue
            tg = grids[p["targetMap"]]
            if not walkable(tg, p["targetX"], p["targetY"]):
                errs.append(f"{tag}: 落点 ({p['targetX']},{p['targetY']}) 在 {p['targetMap']} 上不可走")
            tportals = {(q["x"], q["y"]) for q in by_id[p["targetMap"]]["portals"]}
            if (p["targetX"], p["targetY"]) in tportals:
                errs.append(f"{tag}: 落点 ({p['targetX']},{p['targetY']}) 本身就是 {p['targetMap']} 的传送点 -> 会来回弹")

        for i, s in enumerate(m["spawners"]):
            inside = 0
            total = 0
            for y in range(s["y"], s["y"] + s["h"]):
                for x in range(s["x"], s["x"] + s["w"]):
                    total += 1
                    if walkable(g, x, y):
                        inside += 1
            if inside == 0:
                errs.append(f"{tag}: 刷怪区 {i} ({s['monsterId']}) 里一格可站的都没有")
            if s["max"] > inside:
                errs.append(f"{tag}: 刷怪区 {i} 上限 {s['max']} 大于可站格数 {inside}（总数 {total}）")

        for n in m["npcs"]:
            if not walkable(g, n["x"], n["y"]):
                errs.append(f"{tag}: NPC {n['npcId']} 落点 ({n['x']},{n['y']}) 不可走")

        # 从出生点 BFS，必须能走到所有传送点 / NPC / 每个刷怪区
        seen = {(m["spawnX"], m["spawnY"])}
        q = deque(seen)
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if (nx, ny) in seen or not walkable(g, nx, ny):
                    continue
                seen.add((nx, ny))
                q.append((nx, ny))

        for p in m["portals"]:
            if (p["x"], p["y"]) not in seen:
                errs.append(f"{tag}: 从出生点走不到传送点 ({p['x']},{p['y']})")
        for n in m["npcs"]:
            if (n["x"], n["y"]) not in seen:
                errs.append(f"{tag}: 从出生点走不到 NPC {n['npcId']}")
        for i, s in enumerate(m["spawners"]):
            if not any((x, y) in seen
                       for y in range(s["y"], s["y"] + s["h"])
                       for x in range(s["x"], s["x"] + s["w"])):
                errs.append(f"{tag}: 从出生点走不到刷怪区 {i} ({s['monsterId']})")

        print(f"  {tag} 「{m['name']}」 {m['width']}x{m['height']}  "
              f"传送点 {len(m['portals'])}  刷怪区 {len(m['spawners'])}  NPC {len(m['npcs'])}  "
              f"可走格 {len(seen)}")


def main():
    maps = [build_town(), build_cave()]

    # 已有地图也拉进来一起校验：这样「草原的传送点指向的 map_town 到底存不存在」
    # 这种事也能在本地一次性查出来，不用等进游戏。
    generated_ids = {m["id"] for m in maps}
    all_maps = list(maps)
    if os.path.isdir(MAPS_DIR):
        for name in sorted(os.listdir(MAPS_DIR)):
            if not name.endswith(".json"):
                continue
            with open(os.path.join(MAPS_DIR, name), encoding="utf-8") as f:
                m = json.load(f)
            if m.get("id") in generated_ids:
                continue
            all_maps.append(m)

    errs = []
    print("校验（含已有地图）：")
    validate(all_maps, errs)

    if errs:
        print("\n发现问题：")
        for e in errs:
            print("  ✗ " + e)
        return 1

    print("\n全部约束通过 ✓")
    if "--write" in sys.argv:
        for m in maps:
            path = os.path.join(MAPS_DIR, m["id"] + ".json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(m, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print("已写入 " + os.path.relpath(path, ROOT))
    else:
        for m in maps:
            print("\n=== " + m["id"] + " ===")
            for row in m["rows"]:
                print("    " + row)
    return 0


if __name__ == "__main__":
    sys.exit(main())
