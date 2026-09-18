#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 Kenney 的 CC0 音效收进仓库（只收游戏真正用到的那几条，不是整包 418 个文件）。

用法：
    python3 Tools/vendor_audio.py                 # 从缓存目录复制（默认 /tmp/kenney_sfx/x）
    python3 Tools/vendor_audio.py --download      # 先自己下载那几个包再复制
    python3 Tools/vendor_audio.py --check         # 只校验落盘的文件齐不齐

来源（全部 CC0 / Public Domain，署名非必需）：
    Kenney — RPG Audio / Impact Sounds / Interface Sounds / UI Audio / Music Jingles
    https://kenney.nl/assets/rpg-audio 等，见下面 PACKS
    Juhani Junkala [Chiptune Adventures] — 背景音乐（4 首无缝循环；作者 INFO.txt 里写明 CC0）
    https://opengameart.org/content/4-chiptunes-adventure

    注：FreePD.com 已经关站了（2026 查证），所以 BGM 走 OpenGameArt 上的 CC0 资源。

为什么不用整包：这五个包一共 418 个 ogg，全塞进仓库是几 MB 的噪音；
真正接到事件上的只有下面 MAPPING 这些。想加音效就往 MAPPING 里加一行。

每个文件的来源（哪个包的哪个文件名）就是这张表本身 —— 换素材时照着改。
"""

import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST_ROOT = os.path.join(ROOT, "Assets", "Resources", "Audio")
CACHE_DEFAULT = "/tmp/kenney_sfx/x"

PACKS = {
    "rpg": "rpg-audio",
    "impact": "impact-sounds",
    "iface": "interface-sounds",
    "ui": "ui-audio",
    "jingle": "music-jingles",
}

# (源包, 包里的路径) -> 仓库里的相对路径
MAPPING = {
    # ---- 挥砍 / 命中 ----
    ("rpg", "Audio/knifeSlice.ogg"): "swing/swing_1.ogg",
    ("rpg", "Audio/knifeSlice2.ogg"): "swing/swing_2.ogg",
    ("impact", "Audio/impactPunch_medium_000.ogg"): "hit/hit_1.ogg",
    ("impact", "Audio/impactPunch_medium_001.ogg"): "hit/hit_2.ogg",
    ("impact", "Audio/impactPunch_medium_002.ogg"): "hit/hit_3.ogg",
    ("impact", "Audio/impactPunch_heavy_000.ogg"): "hit/crit_1.ogg",
    ("impact", "Audio/impactPunch_heavy_001.ogg"): "hit/crit_2.ogg",
    ("impact", "Audio/impactMetal_light_000.ogg"): "skill/cast_1.ogg",
    ("impact", "Audio/impactMetal_light_001.ogg"): "skill/cast_2.ogg",

    # ---- 死亡 / 复活 / 升级 / 学技能（用 jingle，短乐句）----
    ("jingle", "Audio/Hit jingles/jingles_HIT00.ogg"): "death/monster_1.ogg",
    ("jingle", "Audio/Hit jingles/jingles_HIT04.ogg"): "death/monster_2.ogg",
    ("jingle", "Audio/Steel jingles/jingles_STEEL00.ogg"): "death/player_1.ogg",
    ("jingle", "Audio/8-Bit jingles/jingles_NES02.ogg"): "death/respawn_1.ogg",
    ("jingle", "Audio/8-Bit jingles/jingles_NES05.ogg"): "jingle/levelup_1.ogg",
    ("jingle", "Audio/8-Bit jingles/jingles_NES10.ogg"): "jingle/skill_1.ogg",

    # ---- 物品 / 经济 ----
    ("rpg", "Audio/handleCoins.ogg"): "coin/coin_1.ogg",
    ("rpg", "Audio/handleCoins2.ogg"): "coin/coin_2.ogg",
    ("iface", "Audio/drop_001.ogg"): "loot/loot_1.ogg",
    ("iface", "Audio/drop_002.ogg"): "loot/loot_2.ogg",
    ("rpg", "Audio/cloth1.ogg"): "gear/equip_1.ogg",
    ("iface", "Audio/glass_001.ogg"): "gear/drink_1.ogg",

    # ---- 界面 / 反馈 / 传送 ----
    ("ui", "Audio/click1.ogg"): "ui/click_1.ogg",
    ("iface", "Audio/open_001.ogg"): "ui/open_1.ogg",
    ("iface", "Audio/close_001.ogg"): "ui/close_1.ogg",
    ("iface", "Audio/error_001.ogg"): "ui/refuse_1.ogg",
    ("iface", "Audio/confirmation_001.ogg"): "ui/teleport_1.ogg",

    # ---- 脚步：草地 / 石地各一套（洞窟里踩的是石头）----
    ("impact", "Audio/footstep_grass_000.ogg"): "step/grass_1.ogg",
    ("impact", "Audio/footstep_grass_001.ogg"): "step/grass_2.ogg",
    ("impact", "Audio/footstep_grass_002.ogg"): "step/grass_3.ogg",
    ("impact", "Audio/footstep_grass_003.ogg"): "step/grass_4.ogg",
    ("impact", "Audio/footstep_grass_004.ogg"): "step/grass_5.ogg",
    ("impact", "Audio/footstep_concrete_000.ogg"): "step/stone_1.ogg",
    ("impact", "Audio/footstep_concrete_001.ogg"): "step/stone_2.ogg",
    ("impact", "Audio/footstep_concrete_002.ogg"): "step/stone_3.ogg",
}

# BGM 的来源和音效不是一个包，单独一张表。同样是 CC0。
MUSIC_URL = ("https://opengameart.org/sites/default/files/"
             "Juhani%20Junkala%20%5BChiptune%20Adventures%5D%20OGG.zip")

MUSIC_MAPPING = {
    "Juhani Junkala [Chiptune Adventures] 1. Stage 1.ogg": "Music/grassland.ogg",
    "Juhani Junkala [Chiptune Adventures] 2. Stage 2.ogg": "Music/cave.ogg",
    "Juhani Junkala [Chiptune Adventures] 4. Stage Select.ogg": "Music/town.ogg",
}

LICENSE_TEXT = """# 音频素材来源与许可

**这里所有音效都不是原创、也不是从任何商业游戏里扒的**，而是 Kenney 以 **CC0 / Public Domain**
发布的免费素材。CC0 的含义是可以商用、可以修改、可以再分发，**署名不是必须的**（这里仍然署名）。

| 包 | 用途 | 链接 |
| --- | --- | --- |
| RPG Audio | 挥砍、金币、穿装备 | https://kenney.nl/assets/rpg-audio |
| Impact Sounds | 命中、暴击、技能、脚步 | https://kenney.nl/assets/impact-sounds |
| Interface Sounds | 拾取、喝药、开/关面板、拒绝、传送 | https://kenney.nl/assets/interface-sounds |
| UI Audio | 面板点击 | https://kenney.nl/assets/ui-audio |
| Music Jingles | 升级、学技能、死亡、复活 | https://kenney.nl/assets/music-jingles |
| Chiptune Adventures | **背景音乐**（草原 / 洞窟 / 城镇三首循环） | https://opengameart.org/content/4-chiptunes-adventure |

作者：Kenney（https://kenney.nl）· 许可：CC0 1.0 Universal
（https://creativecommons.org/publicdomain/zero/1.0/）

背景音乐：Juhani Junkala（https://juhanijunkala.com/）· 许可：CC0
（作者在包内 INFO.txt 里写明"released under CC0 creative commons license. You can do anything you want with these tunes."）

## 只收了用到的

这五个包加起来 418 个 ogg，仓库里只放了游戏真正接到事件上的那 %d 个。
哪个文件来自哪个包，看 `Tools/vendor_audio.py` 里的 `MAPPING` 表 —— 那也是重新拉取/替换音效的脚本。

## 关于音乐

BGM 三首（Juhani Junkala 的 Chiptune Adventures 里挑了 3 首，无缝循环）：
草原 / 洞窟 / 城镇各一首，**哪张图放哪首写在 `maps/*.json` 的 `music` 字段里** —— 换曲子只改数据。
没有跟音效混在一起播：音乐走独立音量，`N` 单独开关。

## 还没有的

- 战斗音乐（进战斗切一首）；现在只有按地图的循环 BGM
- 脚步只按"草地 / 石地"两类分，不是每张图一套
""" % len(MAPPING)


def download(cache):
    os.makedirs(cache, exist_ok=True)
    for key, pack in PACKS.items():
        url = None
        try:
            html = subprocess.check_output(
                ["curl", "-sL", "https://kenney.nl/assets/" + pack], text=True)
        except Exception as ex:
            print("  取 %s 页面失败：%s" % (pack, ex))
            continue
        for token in html.split('"'):
            if token.startswith("https://kenney.nl/media/pages/assets/") and token.endswith(".zip"):
                url = token
                break
        if url is None:
            print("  [FAIL] 找不到 %s 的下载地址" % pack)
            return False
        dest = os.path.join(cache, pack + ".zip")
        print("  下载 %-18s %s" % (pack, url))
        subprocess.check_call(["curl", "-sL", url, "-o", dest])
        subprocess.check_call(["unzip", "-qo", dest, "-d", cache])

    print("  下载 %-18s %s" % ("chiptune-adventure", MUSIC_URL))
    music_zip = os.path.join(cache, "chiptune-adventure.zip")
    subprocess.check_call(["curl", "-sL", MUSIC_URL, "-o", music_zip])
    subprocess.check_call(["unzip", "-qo", music_zip, "-d", cache])
    return True


def vendor(cache):
    written, missing = 0, []
    for (key, src), rel in sorted(MAPPING.items()):
        src_path = os.path.join(cache, src)
        dst_path = os.path.join(DEST_ROOT, rel)
        if not os.path.exists(src_path):
            missing.append("%s（来自 %s）" % (src, PACKS[key]))
            continue
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        shutil.copyfile(src_path, dst_path)
        written += 1

    # 音乐单独一个来源（另一个 zip），所以放在同一个缓存目录下解压
    for src, rel in sorted(MUSIC_MAPPING.items()):
        src_path = os.path.join(cache, src)
        dst_path = os.path.join(DEST_ROOT, rel)
        if not os.path.exists(src_path):
            missing.append("%s（来自 Chiptune Adventures）" % src)
            continue
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        shutil.copyfile(src_path, dst_path)
        written += 1
    return written, missing


def check():
    wanted = list(MAPPING.values()) + list(MUSIC_MAPPING.values())
    missing = [rel for rel in wanted
               if not os.path.exists(os.path.join(DEST_ROOT, rel))]
    extra = []
    for group in sorted(os.listdir(DEST_ROOT)) if os.path.isdir(DEST_ROOT) else []:
        gpath = os.path.join(DEST_ROOT, group)
        if not os.path.isdir(gpath):
            continue
        for name in sorted(os.listdir(gpath)):
            if not name.endswith(".ogg"):
                continue
            rel = "%s/%s" % (group, name)
            if rel not in wanted:
                extra.append(rel)
    return missing, extra


def main():
    if "--check" in sys.argv:
        missing, extra = check()
        print("应落盘 %d 个音频（%d 音效 + %d 音乐）"
              % (len(MAPPING) + len(MUSIC_MAPPING), len(MAPPING), len(MUSIC_MAPPING)))
        for m in missing:
            print("  [FAIL] 少了 " + m)
        for e in extra:
            print("  [WARN] 多了一个没人用的文件：" + e)
        if missing:
            print("%d 个缺失 ✗" % len(missing))
            return 1
        print("全部就位 ✓" + ("" if not extra else "（但有 %d 个多余的）" % len(extra)))
        return 0

    cache = CACHE_DEFAULT
    if "--download" in sys.argv:
        print("下载 Kenney 音效包（CC0）...")
        if not download(cache):
            print("下载失败 ✗")
            return 1

    if not os.path.isdir(cache):
        print("缓存目录不存在：%s" % cache)
        print("先跑 python3 Tools/vendor_audio.py --download，或把解压好的包放到那个目录")
        return 1

    written, missing = vendor(cache)
    print("复制了 %d 个音效 -> %s" % (written, os.path.relpath(DEST_ROOT, ROOT)))
    for m in missing:
        print("  [FAIL] 源文件没有：" + m)

    os.makedirs(DEST_ROOT, exist_ok=True)
    with open(os.path.join(DEST_ROOT, "LICENSE.md"), "w", encoding="utf-8") as f:
        f.write(LICENSE_TEXT)
    print("写了 LICENSE.md（CC0 声明 + 来源）")

    if missing:
        print("%d 个失败 ✗" % len(missing))
        return 1
    print("完成 ✓（新文件的 .meta 由 Unity 首次导入时生成，记得一起提交）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
