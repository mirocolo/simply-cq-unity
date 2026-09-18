#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
monsters.json 生成 + 校验（M5d：20 种怪）

这一版起 monsters.json 归这个脚本写（以前是 gen_items.py 顺手写掉落表）。
装备等级段那条规则仍然只有一份，从 gen_items.py import 过来，两个脚本不会各自维护。

用法：
    python3 Tools/gen_monsters.py            # 只校验并打印，不落盘
    python3 Tools/gen_monsters.py --write    # 真的写回 monsters.json

20 种怪按等级带分到两张战斗图：
    草原   Lv1~6    （西北最安全，往东/南逐渐加码）
    洞窟   Lv3~15   （入口浅、深处强，洞窟领主在洞底）
镇子不刷怪，是安全区。
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_items  # noqa: E402  等级段规则只在那里定义一次

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONSTERS_PATH = os.path.join(ROOT, "Assets", "StreamingAssets", "Data", "monsters.json")
MAPS_DIR = os.path.join(ROOT, "Assets", "StreamingAssets", "Data", "maps")
ITEMS_PATH = os.path.join(ROOT, "Assets", "StreamingAssets", "Data", "items.json")

# ----------------------------------------------------------------- 怪名单
#
# 列：id / 名字 / 等级 / 血 / 防 / 攻击下限 / 攻击上限 / 经验 / 移速 / 出手间隔 /
#     射程 / 视野 / 主动 / 脱战距离 / 群居半径 / 金币下限 / 金币上限 / 爆钱概率
#
# 射程 > 1 就是远程怪（AI 本来就认 attackRange，但会多判一条视线，见 LineOfSight）
# 群居半径 > 0 就是合群的（打了其中一只，附近同类一起上）
MONSTERS = [
    # 数值是**照着审计跑出来的玩家曲线**反推的（见 Tools/gen_monsters.py 顶部注释与 docs/计划-M6c）：
    #   血量   = 玩家同级每击伤害 × 耐打刀数 × 档次系数   -> 同级 5~10 刀死
    #   攻击   = (玩家最大血 × 2% + 玩家防御 × 0.5) × 档次系数 -> 每击约掉 2% 血
    # 耐打刀数按等级单调递增，这样"血量 × 攻击"这条粗口径才会随等级单调 —— 否则
    # 低一级的"厚皮怪"会比高一级的普通怪还强，"往深处走"就没有意义了。
    #
    # ---- 草原 · 低级带（掉 b1 段装备）----
    ("mon_hen",         "鸡",       "trash",  1,   18,  0,  4,  8,    8, 7, 16, 1,  4, False,  6, 0,  0,   2, 0.60),
    ("mon_rabbit",      "野兔",     "trash",  1,   15,  0,  4,  8,    7, 9, 18, 1,  4, False,  8, 0,  0,   2, 0.60),
    ("mon_deer",        "鹿",       "trash",  2,   29,  1,  5,  9,   13, 6, 15, 1,  5, False,  8, 0,  1,   4, 0.80),
    ("mon_bat",         "蝙蝠",     "squishy",3,   65,  0,  9, 16,   29,10, 12, 1,  7, True,  12, 0,  1,   5, 0.90),
    ("mon_scorpion",    "毒蝎",     "normal", 3,   77,  2,  8, 14,   35, 5, 14, 1,  6, True,  10, 0,  2,   6, 0.90),

    # ---- 草原 · 中级带（掉 b2 段装备）----
    ("mon_wolf",        "野狼",     "normal", 4,  140,  1, 14, 24,   63, 4, 12, 1,  7, True,  14, 7,  2,   8, 0.90),
    ("mon_skeleton",    "骷髅",     "tanky",  4,  175,  3, 12, 20,   79, 4, 13, 1,  7, True,  14, 6,  3,   9, 0.90),
    ("mon_spider",      "巨蜘蛛",   "squishy",5,  140,  2, 16, 29,   63, 8, 10, 1,  7, True,  13, 0,  3,  10, 0.95),
    ("mon_zombie",      "僵尸",     "tanky",  5,  206,  4, 12, 21,   93, 2, 16, 1,  5, True,  12, 5,  4,  12, 1.00),
    ("mon_boar",        "野猪",     "normal", 6,  192,  4, 15, 26,   86, 6, 14, 1,  6, True,  10, 5,  5,  15, 1.00),
    ("mon_orc",         "半兽人",   "tanky",  6,  240,  5, 13, 22,  108, 5, 13, 1,  7, True,  16, 8,  6,  16, 1.00),

    # ---- 洞窟 · 深处带（掉 b3 段装备）----
    ("mon_ghoul",       "食尸鬼",   "normal", 7,  256,  5, 19, 32,  115, 5, 12, 1,  7, True,  15, 6,  8,  20, 1.00),
    ("mon_gargoyle",    "石像鬼",   "normal", 8,  289,  8, 20, 33,  130, 4, 14, 3,  8, True,  16, 0, 10,  24, 1.00),
    ("mon_wolf_alpha",  "狼王",     "elite",  8,  433,  6, 25, 42,  195, 7, 11, 1,  8, True,  18, 9, 12,  26, 1.00),
    ("mon_wraith",      "幽魂",     "normal", 9,  324,  4, 21, 34,  146, 6, 11, 4,  9, True,  20, 0, 14,  30, 1.00),
    ("mon_golem",       "石头人",   "tanky", 10,  452, 12, 18, 31,  203, 3, 16, 1,  6, True,  14, 0, 18,  36, 1.00),
    ("mon_dark_knight", "暗黑骑士", "normal",11,  400, 10, 22, 37,  180, 5, 12, 1,  8, True,  18, 7, 22,  44, 1.00),
    ("mon_lich",        "巫妖",     "normal",12,  442,  7, 23, 38,  199, 4, 13, 5, 10, True,  20, 0, 28,  52, 1.00),
    ("mon_dragon_whelp","幼龙",     "elite", 13,  728, 13, 30, 49,  328, 5, 12, 3,  9, True,  20, 0, 36,  64, 1.00),
    ("mon_cave_lord",   "洞窟领主", "boss",  15, 1197, 16, 37, 61,  540, 4, 11, 2, 11, True,  24, 0, 60, 120, 1.00),
]

# 非装备掉落（材料 / 药水）手写在这里；装备掉落由脚本按等级段生成
KEPT_DROPS = {
    "mon_hen":  [("mat_hide", 0.30, 1, 1), ("pot_hp_s", 0.08, 1, 1)],
    "mon_wolf": [("mat_hide", 0.70, 1, 1), ("pot_hp_s", 0.20, 1, 2)],
    "mon_boar": [("mat_hide", 1.00, 1, 2), ("mat_fang", 0.55, 1, 2), ("pot_hp_m", 0.25, 1, 1)],
}

# 每杀一只，掉出"任意一件装备"的期望概率。等级越高越容易爆，但别失控。
EQUIP_TOTAL = {
    "mon_hen": 0.18, "mon_rabbit": 0.18, "mon_deer": 0.20, "mon_scorpion": 0.22, "mon_bat": 0.22,
    "mon_wolf": 0.26, "mon_skeleton": 0.26, "mon_spider": 0.28, "mon_zombie": 0.28,
    "mon_boar": 0.40, "mon_orc": 0.40,
    "mon_ghoul": 0.34, "mon_gargoyle": 0.34, "mon_wolf_alpha": 0.42, "mon_wraith": 0.34,
    "mon_golem": 0.36, "mon_dark_knight": 0.38, "mon_lich": 0.40,
    "mon_dragon_whelp": 0.46, "mon_cave_lord": 0.90,
}

# 同等级段里，档次越高越难爆
DROP_WEIGHT = {"base": 1.0, "fine": 0.55, "rare": 0.30}

COLUMNS = ["id", "name", "tier", "level", "hp", "ac", "minDc", "maxDc", "exp", "moveSpeed",
           "attackInterval", "attackRange", "vision", "aggressive", "leash", "packRadius",
           "goldMin", "goldMax", "goldChance"]

# 档次。数值是照着"审计跑出来的玩家曲线"定标的（见 docs/计划-M6c），
# 精英和头目**故意**比同级普通怪强，所以它们不参与"等级越高越强"那条严格单调检查。
TIERS = ("trash", "squishy", "normal", "tanky", "elite", "boss")
OFF_CURVE_TIERS = ("elite", "boss")

# 要求：这两张图的难度必须分层（草原是新手区，洞窟深处必须明显更强）
MAX_GRASSLAND_LEVEL = 6
MIN_CAVE_LEVEL = 10

# 安全区（不刷怪）—— 镇子只有商人和传送点
SAFE_ZONE_MAP = "map_town"


def Power(m):
    """强度粗口径：血量 × 攻击中值。"""
    return m["hp"] * (m["minDc"] + m["maxDc"]) / 2.0


def fail(msg):
    print("  [FAIL] " + msg)
    return 1


# ----------------------------------------------------------------- 生成

def build_monsters(items):
    """怪名单 -> monsters.json 的 monsters 数组（含掉落表）。"""
    rows = gen_items.all_rows()
    item_tier_of = {item_id: tier for item_id, _, _, _, tier in rows}
    band_of = {item_id: band for item_id, _, _, band, _ in rows}
    equip_by_id = {i["id"]: i for i in items if i.get("type") == "equip"}

    out = []
    for row in MONSTERS:
        dto = dict(zip(COLUMNS, row))
        monster_id = dto["id"]
        band = gen_items.band_for_level(dto["level"])

        pool = [d for d in equip_by_id.values() if band_of.get(d["id"]) == band]
        weight_sum = sum(DROP_WEIGHT[item_tier_of[d["id"]]] for d in pool)
        target = EQUIP_TOTAL.get(monster_id, 0.25)

        drops = []
        for d in pool:
            chance = target * DROP_WEIGHT[item_tier_of[d["id"]]] / weight_sum
            drops.append({"itemId": d["id"], "chance": max(0.001, round(chance, 3)),
                          "min": 1, "max": 1})
        drops.sort(key=lambda d: (-d["chance"], d["itemId"]))

        for item_id, chance, lo, hi in KEPT_DROPS.get(monster_id, []):
            drops.insert(0, {"itemId": item_id, "chance": chance, "min": lo, "max": hi})

        out.append({
            "id": monster_id, "name": dto["name"], "sprite": monster_id,
            "tier": dto["tier"], "level": dto["level"], "hp": dto["hp"], "ac": dto["ac"],
            "minDc": dto["minDc"], "maxDc": dto["maxDc"], "exp": dto["exp"],
            "moveSpeed": dto["moveSpeed"], "attackInterval": dto["attackInterval"],
            "attackRange": dto["attackRange"], "vision": dto["vision"],
            "aggressive": dto["aggressive"], "leash": dto["leash"],
            "packRadius": dto["packRadius"],
            "goldMin": dto["goldMin"], "goldMax": dto["goldMax"], "goldChance": dto["goldChance"],
            "drops": drops,
        })
    return out


# ----------------------------------------------------------------- 校验

def validate(monsters, items):
    bad = 0

    print("[名单]")
    if not 15 <= len(monsters) <= 20:
        bad += fail("怪有 %d 种，目标是 15~20 种" % len(monsters))
    else:
        print("  [PASS] %d 种怪（目标 15~20）" % len(monsters))

    ids = [m["id"] for m in monsters]
    if len(ids) != len(set(ids)):
        bad += fail("id 有重复")
    else:
        print("  [PASS] %d 个 id 全不重复" % len(ids))

    # 老 id 得留着（存档、刷怪区都在引用）
    for keep in ("mon_hen", "mon_wolf", "mon_boar"):
        if keep not in ids:
            bad += fail("老怪 %s 没了（老存档和地图刷怪区会引用不到）" % keep)
    print("  [PASS] 三种老怪都还在（鸡 / 野狼 / 野猪）")

    # 等级从低到高排，读起来顺，也方便人肉检查曲线
    if [m["level"] for m in monsters] != sorted(m["level"] for m in monsters):
        bad += fail("名单没有按等级从低到高排")
    else:
        print("  [PASS] 名单按等级从低到高排（Lv%d ~ Lv%d）"
              % (monsters[0]["level"], monsters[-1]["level"]))

    print("[数值]")
    problems = []
    for m in monsters:
        if m["hp"] <= 0 or m["minDc"] <= 0:
            problems.append("%s 的血或攻击不合法" % m["id"])
        if m["minDc"] > m["maxDc"]:
            problems.append("%s 的攻击下限大于上限" % m["id"])
        if m["attackRange"] < 1:
            problems.append("%s 的射程不合法" % m["id"])
        if m["vision"] < m["attackRange"]:
            problems.append("%s 的视野(%d)比射程(%d)还短，永远打不到人"
                            % (m["id"], m["vision"], m["attackRange"]))
        if m["leash"] < 2:
            problems.append("%s 的脱战距离太短" % m["id"])
        if m["exp"] <= 0:
            problems.append("%s 没经验" % m["id"])
    if problems:
        for p in problems:
            bad += fail(p)
    else:
        print("  [PASS] 血 / 攻防上下限 / 射程 / 视野 / 脱战距离 / 经验都合法")

    # 档次合法性
    bad_tier = [m["id"] for m in monsters if m.get("tier") not in TIERS]
    if bad_tier:
        bad += fail("档次不合法（只能是 %s）：%s" % ("/".join(TIERS), bad_tier))
    else:
        print("  [PASS] 档次都用的是 %s" % "/".join(TIERS))

    # 强度曲线（血量 × 攻击中值）。普通怪（trash/normal/tanky）必须严格随等级递增；
    # 精英和头目**故意**比同级强，不参与这条，但它们得比同级最强的普通怪还强。
    problems = []
    on_curve = sorted([m for m in monsters if m["tier"] not in OFF_CURVE_TIERS],
                      key=lambda m: m["level"])
    prev = None
    for m in on_curve:
        power = Power(m)
        if prev is not None and m["level"] > prev[0] and power <= prev[1]:
            problems.append("%s(Lv%d) 不比 %s(Lv%d) 强（%.0f <= %.0f）"
                            % (m["name"], m["level"], prev[2], prev[0], power, prev[1]))
        prev = (m["level"], power, m["name"])

    for m in monsters:
        if m["tier"] not in OFF_CURVE_TIERS:
            continue
        best_same_level = max([Power(o) for o in on_curve if o["level"] <= m["level"]] or [0])
        if Power(m) <= best_same_level:
            problems.append("%s(%s, Lv%d) 不比同级普通怪强（%.0f <= %.0f）"
                            % (m["name"], m["tier"], m["level"], Power(m), best_same_level))

    if problems:
        for p in problems:
            bad += fail(p)
    else:
        print("  [PASS] 普通怪等级越高越强；精英/头目都比同级普通怪强")

    print("[AI 花样]")
    ranged = [m["id"] for m in monsters if m["attackRange"] > 1]
    packing = [m["id"] for m in monsters if m["packRadius"] > 0]
    passive = [m["id"] for m in monsters if not m["aggressive"]]
    if not ranged:
        bad += fail("一种远程怪都没有")
    else:
        print("  [PASS] 远程怪 %d 种：%s" % (len(ranged), "、".join(ranged)))
    if not packing:
        bad += fail("一种群居怪都没有")
    else:
        print("  [PASS] 群居怪 %d 种：%s" % (len(packing), "、".join(packing)))
    if not passive:
        bad += fail("一种被动怪都没有（新手区总得有能安心打的）")
    else:
        print("  [PASS] 被动怪 %d 种：%s" % (len(passive), "、".join(passive)))

    print("[掉落表]")
    problems = []
    for m in monsters:
        equips = [d for d in m["drops"]
                  if d["itemId"] in {i["id"] for i in items if i.get("type") == "equip"}]
        if not equips:
            problems.append("%s 一件装备都不掉" % m["id"])
        total = sum(d["chance"] for d in equips)
        want = EQUIP_TOTAL.get(m["id"])
        if want is not None and abs(total - want) > 0.02:
            problems.append("%s 的爆装概率是 %.3f，目标是 %.2f" % (m["id"], total, want))
    if problems:
        for p in problems:
            bad += fail(p)
    else:
        print("  [PASS] 每只怪都掉装备，且爆装期望概率落在目标值上")

    return bad


def validate_maps(monsters):
    """刷怪区引用的怪必须存在，而且不能被刷怪区冷落（有怪没人刷 = 玩家永远见不到）。"""
    bad = 0
    ids = {m["id"] for m in monsters}
    levels = {m["id"]: m["level"] for m in monsters}

    print("[刷怪区]")
    problems = []
    spawned = {}
    per_map_max = {}

    for name in sorted(os.listdir(MAPS_DIR)):
        if not name.startswith("map_") or not name.endswith(".json"):
            continue
        path = os.path.join(MAPS_DIR, name)
        with open(path, encoding="utf-8") as f:
            m = json.load(f)

        for s in m.get("spawners", []):
            mid = s["monsterId"]
            if mid not in ids:
                problems.append("%s 的刷怪区引用了不存在的怪 %s" % (m["id"], mid))
                continue
            spawned.setdefault(mid, 0)
            spawned[mid] += 1
            per_map_max[m["id"]] = max(per_map_max.get(m["id"], 0), levels[mid])

        # 镇子是安全区：不许刷怪。这条也顺手挡住"手滑往 npcs.json 旁边加了个 spawner"
        if m["id"] == SAFE_ZONE_MAP and m.get("spawners"):
            problems.append("%s 是安全区，却配了 %d 个刷怪区" % (m["id"], len(m["spawners"])))

    if problems:
        for p in problems:
            bad += fail(p)
    else:
        print("  [PASS] 所有刷怪区引用的怪都存在；%s 是安全区（不刷怪）" % SAFE_ZONE_MAP)

    combat_maps = [mid for mid in per_map_max if mid]
    if not combat_maps:
        bad += fail("一张会刷怪的图都没有")
    else:
        print("  [PASS] %d 张战斗图：%s" % (len(combat_maps), "、".join(sorted(combat_maps))))

    idle = sorted(ids - set(spawned))
    if idle:
        bad += fail("这些怪没有刷怪区，玩家永远见不到：%s" % idle)
    else:
        print("  [PASS] %d 种怪全部有刷怪区" % len(ids))

    # 难度分层：草原是新手区，洞窟深处必须明显更强
    g = per_map_max.get("map_grassland", 0)
    c = per_map_max.get("map_cave", 0)
    if g > MAX_GRASSLAND_LEVEL:
        bad += fail("草原最高怪到 Lv%d 了（应 <= Lv%d，新手区不能放太狠的）"
                    % (g, MAX_GRASSLAND_LEVEL))
    elif c < MIN_CAVE_LEVEL:
        bad += fail("洞窟最高怪只有 Lv%d（应 >= Lv%d，深处得有点挑战）"
                    % (c, MIN_CAVE_LEVEL))
    else:
        print("  [PASS] 难度分层：草原最高 Lv%d，洞窟最高 Lv%d" % (g, c))

    return bad


# ----------------------------------------------------------------- 主流程

def main():
    write = "--write" in sys.argv

    with open(ITEMS_PATH, encoding="utf-8") as f:
        items = json.load(f)["items"]

    monsters = build_monsters(items)
    print("生成 %d 种怪（装备 %d 件）" % (len(monsters), len([i for i in items if i.get('type') == 'equip'])))

    print()
    bad = validate(monsters, items)
    bad += validate_maps(monsters)
    # 装备那一侧也要认这份掉落表
    bad += gen_items.validate_drops_in({"monsters": monsters}, items)

    if bad:
        print()
        print("%d 项失败 ✗（没有落盘）" % bad)
        return 1

    print()
    print("汇总：")
    for m in monsters:
        band = gen_items.band_for_level(m["level"])
        equip = sum(d["chance"] for d in m["drops"]
                    if d["itemId"] in {i["id"] for i in items if i.get("type") == "equip"})
        print("  %-16s %-6s Lv%-2d 血%-4d 攻%-5s %s  射程%d %s%s  爆装 %.3f"
              % (m["id"], m["tier"], m["level"], m["hp"], "%d-%d" % (m["minDc"], m["maxDc"]),
                 band, m["attackRange"],
                 "群居" if m["packRadius"] else "    ",
                 "主动" if m["aggressive"] else "被动", equip))

    if not write:
        print()
        print("校验通过 ✓（没有落盘；加 --write 才写回 monsters.json）")
        return 0

    with open(MONSTERS_PATH, "w", encoding="utf-8") as f:
        json.dump({"monsters": monsters}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print()
    print("已写回 %s（%d 种怪）" % (os.path.relpath(MONSTERS_PATH, ROOT), len(monsters)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
