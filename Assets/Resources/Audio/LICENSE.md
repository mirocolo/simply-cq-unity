# 音频素材来源与许可

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

这五个包加起来 418 个 ogg，仓库里只放了游戏真正接到事件上的那 34 个。
哪个文件来自哪个包，看 `Tools/vendor_audio.py` 里的 `MAPPING` 表 —— 那也是重新拉取/替换音效的脚本。

## 关于音乐

BGM 三首（Juhani Junkala 的 Chiptune Adventures 里挑了 3 首，无缝循环）：
草原 / 洞窟 / 城镇各一首，**哪张图放哪首写在 `maps/*.json` 的 `music` 字段里** —— 换曲子只改数据。
没有跟音效混在一起播：音乐走独立音量，`N` 单独开关。

## 还没有的

- 战斗音乐（进战斗切一首）；现在只有按地图的循环 BGM
- 脚步只按"草地 / 石地"两类分，不是每张图一套
