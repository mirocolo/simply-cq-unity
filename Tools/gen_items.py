#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
items.json 生成 + 校验（M5c 铺 60 件，M6e 补到 100 件）

为什么不手写：几十上百件装备手敲一定会敲出前后矛盾的数值 ——
同一部位越高级越弱、价格倒挂、掉落表引用了不存在的 id、品质下限和属性不匹配。
这个脚本把「设计表 -> 数值」的规则和 ItemCatalog 的解析规则各实现一遍，
再把 Domain 侧的硬约束全跑一次，默认**只校验并打印**，加 --write 才落盘。

用法：
    python3 Tools/gen_items.py            # 只校验 items.json + 打印阶梯，不落盘
    python3 Tools/gen_items.py --write    # 真的写回 items.json

改完 items.json 记得让掉落表跟上（掉落表在 monsters.json，归另一个脚本管）：
    python3 Tools/gen_monsters.py --write

设计三条轴（和 docs/计划-M5c-铺60件装备.md 一致）：
    部位 × 等级段（Lv1 / Lv4 / Lv7 / Lv10 / Lv13，对上怪的等级分段）
    × 档次（基础=品质下限白 / 上品=下限绿 / 珍品=下限蓝，且基础属性也更高）
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS_PATH = os.path.join(ROOT, "Assets", "StreamingAssets", "Data", "items.json")
MONSTERS_PATH = os.path.join(ROOT, "Assets", "StreamingAssets", "Data", "monsters.json")

# ----------------------------------------------------------------- 设计表

# 等级段 -> 需求等级。b4/b5 是对齐怪的最高等级（Lv15）补的 ——
# 之前装备只到 Lv7，而怪铺到了 Lv15，等于后 8 级没有装备成长，
# 「爆装 -> 换装变强」这条主线在后半程直接断掉。
BANDS = {"b1": 1, "b2": 4, "b3": 7, "b4": 10, "b5": 13}

# 档次 -> (品质下限, 属性预算倍率, 价格倍率)
# 关键：珍品不只是"更容易摇出好品质"，它的**白装基础属性**也比上品高 ——
# 这样"品质阶梯不倒挂"是数据保证的，不靠运气。
TIERS = {
    "base": ("white", 1.00, 1.0),
    "fine": ("green", 1.25, 1.7),
    "rare": ("blue", 1.55, 2.6),
}

# 各部位把"预算点"拆成属性的权重。一个点 = 1 防御 / 4 生命 / 5 魔法 / 2 点攻击（min+max）
SLOT_PROFILE = {
    "weapon":   {"dc": 1.00},
    "armour":   {"ac": 0.55, "hp": 0.45},
    "helmet":   {"ac": 0.75, "hp": 0.25},
    "necklace": {"dc": 0.45, "hp": 0.55},
    "bracelet": {"ac": 0.70, "mp": 0.30},
    "ring":     {"dc": 0.55, "mp": 0.45},
    "belt":     {"ac": 0.60, "hp": 0.40},
    "boots":    {"ac": 0.75, "hp": 0.25},
}

# 价格还要按部位调：武器/衣服是"大件"，鞋帽便宜
SLOT_PRICE = {
    "weapon": 1.0, "armour": 1.1, "helmet": 0.7, "necklace": 0.8,
    "bracelet": 0.8, "ring": 0.8, "belt": 0.7, "boots": 0.6,
}

BASE_POINTS = 3.0      # Lv1 基础款 = 3 个预算点
# 曲线是照着 M0~M3 那批手写的装备标定的：Lv1 木剑 2-4、Lv7 长剑 6-12。
# 0.55 次方 -> Lv1 3.0 / Lv4 6.4 / Lv7 9.1 点，正好落在原来的强度带里，
# 不会因为"一次铺 60 件"顺手把数值整体放大两倍。
LEVEL_POW = 0.55
PRICE_BASE = 120.0
PRICE_LEVEL_POW = 1.0

# 60 件装备的设计表：id / 名字 / 部位 / 等级段 / 档次
# 带 ★ 的是 M0~M3 就存在的老 id —— 存档、新手包、掉落表都在用，id 必须保住（脚本会校验）。
TABLE = [
    # ---- 武器 ----
    ("wp_wood",    "木剑",       "weapon", "b1", "base"),   # ★ 新手剑
    ("wp_oak",     "橡木剑",     "weapon", "b1", "fine"),
    ("wp_short",   "短剑",       "weapon", "b2", "base"),   # ★
    ("wp_iron",    "精铁剑",     "weapon", "b2", "fine"),
    ("wp_silver",  "银剑",       "weapon", "b2", "rare"),
    ("wp_long",    "长剑",       "weapon", "b3", "base"),   # ★
    ("wp_bronze",  "青铜剑",     "weapon", "b3", "fine"),
    ("wp_black",   "黑铁剑",     "weapon", "b3", "rare"),

    # ---- 衣服 ----
    ("ar_cloth",   "布衣(男)",   "armour", "b1", "base"),   # ★ 新手衣
    ("ar_padded",  "粗皮甲(男)", "armour", "b1", "fine"),
    ("ar_leather", "皮甲(男)",   "armour", "b2", "base"),   # ★
    ("ar_iron",    "铁甲(男)",   "armour", "b2", "fine"),
    ("ar_chain",   "锁子甲(男)", "armour", "b2", "rare"),
    ("ar_bronze",  "青铜甲(男)", "armour", "b3", "base"),   # ★
    ("ar_steel",   "玄铁甲(男)", "armour", "b3", "fine"),
    ("ar_black",   "黑铁甲(男)", "armour", "b3", "rare"),

    # ---- 头盔 ----
    ("he_cap",     "布帽",       "helmet", "b1", "base"),   # ★ 新手帽
    ("he_leather", "皮帽",       "helmet", "b1", "fine"),
    ("he_iron",    "铁盔",       "helmet", "b2", "base"),   # ★
    ("he_silver",  "银盔",       "helmet", "b2", "fine"),
    ("he_bronze",  "青铜盔",     "helmet", "b3", "base"),
    ("he_steel",   "玄铁盔",     "helmet", "b3", "fine"),
    ("he_black",   "黑铁盔",     "helmet", "b3", "rare"),

    # ---- 项链 ----
    ("nk_bead",    "骨项链",     "necklace", "b1", "base"),  # ★
    ("nk_copper",  "铜项链",     "necklace", "b1", "fine"),
    ("nk_fang",    "牙项链",     "necklace", "b2", "base"),
    ("nk_silver",  "银项链",     "necklace", "b2", "fine"),
    ("nk_jade",    "玉项链",     "necklace", "b2", "rare"),
    ("nk_gold",    "金项链",     "necklace", "b3", "base"),
    ("nk_steel",   "玄铁项链",   "necklace", "b3", "fine"),
    ("nk_black",   "黑铁项链",   "necklace", "b3", "rare"),

    # ---- 手镯 ----
    ("br_copper",  "铜手镯",     "bracelet", "b1", "base"),  # ★
    ("br_iron",    "铁手镯",     "bracelet", "b1", "fine"),
    ("br_silver",  "银手镯",     "bracelet", "b2", "base"),
    ("br_jade",    "玉手镯",     "bracelet", "b2", "fine"),
    ("br_gold",    "金手镯",     "bracelet", "b3", "base"),
    ("br_steel",   "玄铁手镯",   "bracelet", "b3", "fine"),
    ("br_black",   "黑铁手镯",   "bracelet", "b3", "rare"),

    # ---- 戒指 ----
    ("rg_copper",  "铜戒指",     "ring", "b1", "base"),      # ★
    ("rg_iron",    "铁戒指",     "ring", "b1", "fine"),
    ("rg_silver",  "银戒指",     "ring", "b2", "base"),
    ("rg_jade",    "玉戒指",     "ring", "b2", "fine"),
    ("rg_gem",     "宝石戒指",   "ring", "b2", "rare"),
    ("rg_gold",    "金戒指",     "ring", "b3", "base"),
    ("rg_steel",   "玄铁戒指",   "ring", "b3", "fine"),
    ("rg_black",   "黑铁戒指",   "ring", "b3", "rare"),

    # ---- 腰带 ----
    ("be_cloth",   "布腰带",     "belt", "b1", "base"),      # ★
    ("be_leather", "皮腰带",     "belt", "b1", "fine"),
    ("be_iron",    "铁腰带",     "belt", "b2", "base"),
    ("be_silver",  "银腰带",     "belt", "b2", "fine"),
    ("be_bronze",  "青铜腰带",   "belt", "b3", "base"),
    ("be_steel",   "玄铁腰带",   "belt", "b3", "fine"),
    ("be_black",   "黑铁腰带",   "belt", "b3", "rare"),

    # ---- 靴子 ----
    ("bt_straw",   "草鞋",       "boots", "b1", "base"),     # ★ 新手鞋
    ("bt_cloth",   "布靴",       "boots", "b1", "fine"),
    ("bt_leather", "皮靴",       "boots", "b2", "base"),
    ("bt_iron",    "铁靴",       "boots", "b2", "fine"),
    ("bt_bronze",  "青铜靴",     "boots", "b3", "base"),
    ("bt_steel",   "玄铁靴",     "boots", "b3", "fine"),
    ("bt_black",   "黑铁靴",     "boots", "b3", "rare"),
]

# ---- b4 / b5 两个后期等级段 ----
#
# 前三个段（Lv1/4/7）是逐条手写的，因为那时候还在摸数值曲线。
# 到了 b4/b5，形状已经固定成"每部位 基础款 + 上品款，武器/衣服/项链/戒指再各加一个珍品款"，
# 手抄 40 行只会抄错，所以用命名表生成 —— 数值照样由公式推，校验照样全跑。
SLOT_NOUN = {
    "weapon": "剑", "armour": "甲(男)", "helmet": "盔", "necklace": "项链",
    "bracelet": "手镯", "ring": "戒指", "belt": "腰带", "boots": "靴",
}

LATE_BANDS = [
    ("b4", "寒铁", "coldiron", "秘银", "mithril",
     {"weapon": "霜刃剑", "armour": "霜甲(男)", "necklace": "霜牙项链", "ring": "霜纹指环"}),
    ("b5", "龙骨", "dragonbone", "玄天", "sky",
     {"weapon": "龙牙剑", "armour": "龙鳞甲(男)", "necklace": "龙瞳项链", "ring": "龙纹指环"}),
]


def all_rows():
    """全部装备的设计行：手写的前三段 + 生成的后期两段。
    别的脚本（gen_monsters）也要用，所以只在这里拼一次。"""
    return TABLE + build_late_rows()


# 部位 -> id 前缀。必须和手写那批老 id 完全一致，所以不能简单取前两个字母
# （boots 的老 id 是 bt_straw，不是 bo_*）。
SLOT_ID_PREFIX = {
    "weapon": "wp_", "armour": "ar_", "helmet": "he_", "necklace": "nk_",
    "bracelet": "br_", "ring": "rg_", "belt": "be_", "boots": "bt_",
}


# ---- 词条（暴击 / 攻速）----
#
# 词条挂在物品上、随品质放大（同一把剑，紫出货比蓝出货词条更高），
# 但**只有上品(绿底)和珍品(蓝底)档有**：基础款没词条，好东西才配额外属性。
# 部位分工照传奇的习惯：武器/戒指长暴击，项链/手镯长攻速，防御件不长。
AFFIX_CRIT_SLOTS = ("weapon", "ring")
AFFIX_HASTE_SLOTS = ("necklace", "bracelet")
AFFIX_BY_TIER = {"base": (0, 0), "fine": (1, 3), "rare": (2, 6)}   # (暴击百分点, 急速点)


def affix_for(slot_key, tier):
    """(暴击百分点, 急速点)。没分到词条的部位返回 (0, 0)。"""
    crit, haste = AFFIX_BY_TIER.get(tier, (0, 0))
    if slot_key in AFFIX_CRIT_SLOTS:
        return (crit, 0)
    if slot_key in AFFIX_HASTE_SLOTS:
        return (0, haste)
    return (0, 0)


def id_prefix(slot_key):
    """部位 -> id 前缀，和手写的那批老 id 保持一致。"""
    return SLOT_ID_PREFIX.get(slot_key, slot_key[:2] + "_")


def build_late_rows():
    """把 b4/b5 的装备行摊成和前三个段一样的 (id, 名字, 部位, 等级段, 档次) 形式。"""
    rows = []
    for band, base_name, base_id, fine_name, fine_id, rare_names in LATE_BANDS:
        for slot, noun in SLOT_NOUN.items():
            prefix = id_prefix(slot)
            rows.append((prefix + base_id, base_name + noun, slot, band, "base"))
            rows.append((prefix + fine_id, fine_name + noun, slot, band, "fine"))
        # 珍品款只给"大件"：武器/衣服/项链/戒指（和 b2 的处理一致）
        for slot, name in rare_names.items():
            rows.append((id_prefix(slot) + fine_id + "_rare", name, slot, band, "rare"))
    return rows


# 非装备物品原样保留（消耗品 / 材料），这一版不动它们
KEEP_KINDS = ("consumable", "material")

# 等级段 ← 怪的等级。这条规则只在这里定义一次，gen_monsters.py 直接 import 用，
# 两个脚本不会各自维护一份"哪只怪掉哪一段"。
# 幽暗石洞里野狼和野猪的刷怪区最多，所以越深越出好东西，不用另加"地图等级"机制。


def band_for_level(level):
    """怪的等级 -> 它掉哪个等级段的装备。分段和 BANDS 一一对应。"""
    if level <= 3:
        return "b1"
    if level <= 6:
        return "b2"
    if level <= 9:
        return "b3"
    if level <= 12:
        return "b4"
    return "b5"


# 掉落表的概率调参属于怪那一侧，放在 gen_monsters.py 里

# 老 id 必须还在 —— 存档、新手包、掉落表都按 id 引用，改名等于把玩家的东西弄丢
REQUIRED_IDS = [
    "wp_wood", "ar_cloth", "bt_straw", "pot_hp_s",
    "wp_short", "wp_long", "ar_leather", "ar_bronze",
    "he_cap", "he_iron", "nk_bead", "br_copper", "rg_copper", "be_cloth",
]


# ----------------------------------------------------------------- 数值

def slot_of(slot_key):
    return SLOT_PROFILE[slot_key]


def points_of(band, tier):
    """这个等级段 + 档次拿到多少预算点。"""
    level = BANDS[band]
    return BASE_POINTS * (level ** LEVEL_POW) * TIERS[tier][1]


def allocate(slot_key, points):
    """把预算点拆成属性。一个点 = 1 防御 / 4 生命 / 5 魔法 / 2 点攻击(min+max)。"""
    out = {}
    profile = SLOT_PROFILE[slot_key]

    dc_points = profile.get("dc", 0.0) * points
    if dc_points > 0:
        # 一个点 = 2 点攻击总量，下限拿 40%、上限拿 60%
        total_dc = dc_points * 2.0
        out["minDc"] = int(round(total_dc * 0.4))
        out["maxDc"] = int(round(total_dc * 0.6))
        if out["maxDc"] < out["minDc"]:
            out["maxDc"] = out["minDc"]

    ac = int(round(profile.get("ac", 0.0) * points))
    if ac > 0:
        out["ac"] = ac

    hp = int(round(profile.get("hp", 0.0) * points * 4.0))
    if hp > 0:
        out["bonusHp"] = hp

    mp = int(round(profile.get("mp", 0.0) * points * 5.0))
    if mp > 0:
        out["bonusMp"] = mp

    # 防御类装备别出现"只有 0 防御"的空壳（低等级 + 低权重时会四舍五入到 0）
    if not out:
        out["ac"] = 1
    return out


def price_of(slot_key, band, tier):
    level = BANDS[band]
    raw = PRICE_BASE * (level ** PRICE_LEVEL_POW) * SLOT_PRICE[slot_key] * TIERS[tier][2]
    return int(round(raw / 10.0)) * 10      # 取整到 10，价格表好看一点


def points_from_stats(stats):
    """从生成的数值反推预算点，用来验证"档次越高越强"没有写反。"""
    return (stats.get("ac", 0)
            + stats.get("minDc", 0) / 2.0 + stats.get("maxDc", 0) / 2.0
            + stats.get("bonusHp", 0) / 4.0
            + stats.get("bonusMp", 0) / 5.0)


def build_equip(item_id, name, slot_key, band, tier):
    points = points_of(band, tier)
    stats = allocate(slot_key, points)
    quality, _, _ = TIERS[tier]

    dto = {"id": item_id, "name": name, "type": "equip", "slot": slot_key}
    dto["price"] = price_of(slot_key, band, tier)
    dto["levelReq"] = BANDS[band]
    if quality != "white":
        dto["minQuality"] = quality
    for key in ("minDc", "maxDc", "mc", "sc", "ac", "mac", "bonusHp", "bonusMp"):
        if stats.get(key):
            dto[key] = stats[key]

    # 词条：上品/珍品才有（基础款没有），随品质再放大
    crit, haste = affix_for(slot_key, tier)
    if crit > 0:
        dto["critBonus"] = crit
    if haste > 0:
        dto["hasteBonus"] = haste
    return dto, points


# ----------------------------------------------------------------- 校验

def fail(msg):
    print("  [FAIL] " + msg)
    return 1


def validate(items, keepers):
    bad = 0
    equips = [i for i in items if i.get("type") == "equip"]
    rows = all_rows()
    tier_of = {item_id: tier for item_id, _, _, _, tier in rows}
    band_of = {item_id: band for item_id, _, _, band, _ in rows}

    print("[数量]")
    if len(equips) < 60:
        bad += fail("装备只铺了 %d 件，目标是 >= 60" % len(equips))
    else:
        print("  [PASS] 装备 %d 件（目标 >= 60）" % len(equips))

    ids = [i["id"] for i in items]
    if len(ids) != len(set(ids)):
        dupes = sorted({x for x in ids if ids.count(x) > 1})
        bad += fail("id 有重复：%s" % dupes)
    else:
        print("  [PASS] %d 个 id 全不重复" % len(ids))

    missing = [x for x in REQUIRED_IDS if x not in ids]
    if missing:
        bad += fail("老 id 丢了（存档/新手包/掉落表会引用不到）：%s" % missing)
    else:
        print("  [PASS] %d 个老 id 全部保留" % len(REQUIRED_IDS))

    print("[部位覆盖]")
    by_slot_band = {}
    for dto in equips:
        by_slot_band.setdefault((dto["slot"], dto["levelReq"]), []).append(dto)
    for slot in SLOT_PROFILE:
        levels = sorted(lv for (s, lv) in by_slot_band if s == slot)
        if levels != sorted(BANDS.values()):
            bad += fail("部位 %s 的等级段不全：%s" % (slot, levels))
    if not bad:
        print("  [PASS] 8 个部位在 %s 每个等级段都有货" % sorted(BANDS.values()))

    print("[数值单调]")
    problems = []
    for slot in SLOT_PROFILE:
        # 同一档次，等级越高必须越强、越贵
        for tier in TIERS:
            prev_p = prev_price = None
            for band in sorted(BANDS, key=lambda b: BANDS[b]):
                dto = next((d for d in equips
                            if d["slot"] == slot and d["levelReq"] == BANDS[band]
                            and d.get("minQuality", "white") == TIERS[tier][0]), None)
                if dto is None:
                    continue
                p = points_from_stats(dto)
                if prev_p is not None and p <= prev_p:
                    problems.append("%s 的 %s 款：Lv%d 不比上一段强（%.2f -> %.2f）"
                                    % (slot, tier, dto["levelReq"], prev_p, p))
                if prev_price is not None and dto["price"] <= prev_price:
                    problems.append("%s 的 %s 款：Lv%d 反而不值钱（%d -> %d）"
                                    % (slot, tier, dto["levelReq"], prev_price, dto["price"]))
                prev_p, prev_price = p, dto["price"]

        # 同一等级段，档次越高（品质下限越高）必须越强
        for band in BANDS:
            cell = [d for d in equips
                    if d["slot"] == slot and d["levelReq"] == BANDS[band]]
            cell.sort(key=lambda d: ("white", "green", "blue", "purple").index(d.get("minQuality", "white")))
            prev = None
            for dto in cell:
                p = points_from_stats(dto)
                if prev is not None and p < prev:
                    problems.append("%s Lv%d：品质下限更高的反而更弱（%.2f -> %.2f）"
                                    % (slot, dto["levelReq"], prev, p))
                prev = p

    if problems:
        for p in problems:
            bad += fail(p)
    else:
        print("  [PASS] 同档次越高等级越强越贵；同等级段里品质下限越高越强（品质阶梯不倒挂）")

    print("[品质与价格]")
    price_problems = []
    for dto in equips:
        q = dto.get("minQuality", "white")
        if q not in ("white", "green", "blue"):
            price_problems.append("%s 的 minQuality 是 %s（商店规则只允许白/绿下限，蓝以上只能怪掉）"
                                  % (dto["id"], q))
        if dto["price"] <= 0:
            price_problems.append("%s 没价格" % dto["id"])
        if dto.get("minDc", 0) > dto.get("maxDc", 0):
            price_problems.append("%s 的攻击下限大于上限" % dto["id"])
        if dto.get("levelReq", 1) < 1:
            price_problems.append("%s 的需求等级不合法" % dto["id"])
    if price_problems:
        for p in price_problems:
            bad += fail(p)
    else:
        print("  [PASS] 品质下限只用 白/绿/蓝，价格与攻防上下限都合法")

    # 词条：基础款没有；上品/珍品只长在指定部位，且数值随档次递增
    bad_affix = []
    for item in equips:
        tier = tier_of.get(item["id"], "base")
        crit = item.get("critBonus", 0)
        haste = item.get("hasteBonus", 0)
        exp_crit, exp_haste = affix_for(item.get("slot", ""), tier)
        if crit != exp_crit or haste != exp_haste:
            bad_affix.append("%s(%s/%s) 词条不对：暴击 %d/%d 攻速 %d/%d"
                             % (item["id"], item.get("slot"), tier, crit, exp_crit, haste, exp_haste))
    if bad_affix:
        for p in bad_affix[:6]:
            bad += fail(p)
    else:
        print("  [PASS] 词条：基础款没有；绿底起长在武器/戒指（暴击）和项链/手镯（攻速）")

    print("[非装备物品]")
    if len(keepers) == 0:
        bad += fail("消耗品 / 材料被弄丢了")
    else:
        print("  [PASS] 原样保留 %d 件消耗品 / 材料：%s"
              % (len(keepers), "、".join(k["id"] for k in keepers)))

    return bad


def validate_drops_in(monsters_data, items):
    """校验【gen_monsters.py 将要落盘的】掉落表。
    这一版起 monsters.json 归 gen_monsters.py 写，这里只读它、只校验，不再写。"""
    bad = 0
    catalog = {i["id"]: i for i in items}
    monsters = monsters_data["monsters"]

    print("[掉落表]")
    ref_problems = []
    coverage = {}
    band_problems = []
    band_of = {item_id: band for item_id, _, _, band, _ in all_rows()}

    for mon in monsters:
        for drop in mon.get("drops", []):
            item_id = drop["itemId"]
            if item_id not in catalog:
                ref_problems.append("%s 掉了不存在的物品 %s" % (mon["id"], item_id))
                continue
            dto = catalog[item_id]
            if dto.get("type") != "equip":
                continue
            coverage.setdefault(item_id, []).append(mon)

            # 每只怪只出自己等级段的装备 —— 别让鸡掉 Lv7 的剑
            want = band_for_level(mon["level"])
            if band_of.get(item_id) != want:
                band_problems.append("%s(Lv%d，%s 段) 的掉落里混进了 %s(%s 段)"
                                     % (mon["id"], mon["level"], want, item_id, band_of.get(item_id)))

    if ref_problems:
        for p in ref_problems:
            bad += fail(p)
    else:
        print("  [PASS] %d 只怪的掉落表引用全部存在" % len(monsters))

    if band_problems:
        for p in band_problems:
            bad += fail(p)
    else:
        print("  [PASS] 每只怪只出自己等级段的装备，没有跨段乱掉")

    equips = [i for i in items if i.get("type") == "equip"]
    orphans = [i["id"] for i in equips if i["id"] not in coverage]
    if orphans:
        bad += fail("%d 件装备没有任何怪掉（等于死数据）：%s" % (len(orphans), orphans[:8]))
    else:
        print("  [PASS] %d 件装备每件都有出处" % len(equips))

    return bad


# ----------------------------------------------------------------- 主流程

def load_existing():
    with open(ITEMS_PATH, encoding="utf-8") as f:
        return json.load(f)["items"]


def generate(existing):
    keepers = [i for i in existing if i.get("type") in KEEP_KINDS]

    equips, points = [], {}
    for item_id, name, slot, band, tier in all_rows():
        dto, p = build_equip(item_id, name, slot, band, tier)
        equips.append(dto)
        points[item_id] = p

    # 装备按 部位 -> 等级段 -> 档次 排，读起来顺；消耗品/材料放最前面（和原来一样）
    rows = all_rows()
    order_tier = {"base": 0, "fine": 1, "rare": 2}
    tier_of = {item_id: tier for item_id, _, _, _, tier in rows}
    band_of = {item_id: band for item_id, _, _, band, _ in rows}
    equips.sort(key=lambda d: (d["slot"], BANDS[band_of[d["id"]]], order_tier[tier_of[d["id"]]]))

    return keepers + equips


def main():
    write = "--write" in sys.argv

    existing = load_existing()
    print("读入 %s：%d 件物品" % (os.path.relpath(ITEMS_PATH, ROOT), len(existing)))

    items = generate(existing)
    keepers = [i for i in items if i.get("type") in KEEP_KINDS]
    equips = [i for i in items if i.get("type") == "equip"]

    # monsters.json 归 gen_monsters.py 写；这里只读它来校验掉落表
    monsters_data = json.load(open(MONSTERS_PATH, encoding="utf-8")) if os.path.exists(MONSTERS_PATH) else {"monsters": []}

    print()
    # 只管 items.json 自己的校验：monsters.json 的掉落表是 gen_monsters.py 的产物，
    # 它还没重新生成时不该拦住 items.json 落盘（否则两个脚本会互相卡住）
    bad = validate(items, keepers)

    print()
    drop_problems = validate_drops_in(monsters_data, items)
    if drop_problems:
        print()
        print("注意：掉落表还是旧的。items.json 改过之后要跑一次：")
        print("    python3 Tools/gen_monsters.py --write")

    print()
    print("汇总：装备 %d 件 + 消耗品/材料 %d 件 = %d 件" % (len(equips), len(keepers), len(items)))

    # 打印一下阶梯，肉眼确认没有倒挂
    print()
    print("等级段 / 部位阶梯（预算点）：")
    for slot in SLOT_PROFILE:
        row = []
        for band in sorted(BANDS, key=lambda b: BANDS[b]):
            cell = [points_of(band, t) for t in ("base", "fine", "rare") if any(
                d["slot"] == slot and d["levelReq"] == BANDS[band]
                and d.get("minQuality", "white") == TIERS[t][0] for d in equips)]
            row.append("Lv%d: %s" % (BANDS[band], "/".join("%.1f" % p for p in cell)))
        print("  %-9s %s" % (slot, "   ".join(row)))

    if bad:
        print()
        print("%d 项失败 ✗（没有落盘）" % bad)
        return 1

    if not write:
        print()
        print("校验通过 ✓（没有落盘；加 --write 才写回 items.json）")
        return 0

    with open(ITEMS_PATH, "w", encoding="utf-8") as f:
        json.dump({"items": items}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print()
    print("已写回 %s（%d 件物品）" % (os.path.relpath(ITEMS_PATH, ROOT), len(items)))
    print("掉落表在 monsters.json，归 Tools/gen_monsters.py 写 —— 改完记得也跑一下它")
    return 0


if __name__ == "__main__":
    sys.exit(main())
