# simply-cq-unity

《传奇》风格的 **本地单机** 复刻 —— Unity 6 + 纯 C# 逻辑层。

> 目标不是还原原版，而是把「打怪 → 爆装 → 回城卖 → 换装变强」这条循环做得**手感像传奇**。
> 完整方案见 `docs/设计方案.md`。

---

## 现在能跑什么（M0 ~ M3 进行中）

**世界（M1）**

- 一张 48×48 的「新手草原」：树林、水塘、十字土路、山坡，**斜俯视伪 2.5D** 投影
- WASD / 方向键 **8 方向格子走路**，一格一格，撞墙撞怪会原地转身
- 相机平滑跟随 + 地图边界夹取
- 二十多只怪：**被动怪（鸡）** 在出生点附近游荡；**主动怪（野狼 / 野猪）** 看见你会用 **A\*** 绕过障碍追你，追出一定距离会脱战回家
- 刷怪区自动维持怪物数量，死了会补刷

**战斗与成长（M2）**

- **近战攻击**：空格 / J / 鼠标左键，只打「面向那一侧」，不做背刺；攻击有间隔（`playerAttackInterval` tick）
- **命中 / 暴击 / 护甲** 全套结算，伤害公式全在 `balance.json` 里可调
- **死亡**：怪会留尸体（可配时长）→ 清掉 → 释放格子；击杀者拿经验
- **升级**：经验曲线 `base * Lv^pow`，升级加血量/攻击/防御并回满血
- **掉落**：金币掉在死亡点上，走上去**自动拾取**，飘 `+5 金币`
- **飘字**：伤害数字 / 暴击 / MISS / 挥空 / 升级 / 你死了
- **受击反馈**：中招闪红 + 轻微弹一下；尸体半透明
- **脱战回血**：60 tick 没挨打就开始自动恢复
- **玩家死亡 → 40 tick 后回出生点满血复活**，死亡期间无法移动和攻击
- **HUD**：HP 条 + 经验条 + 等级 / 金币 / 攻防
- 逻辑层 **153 项自动化自检**，而且**不需要打开 Unity** 就能跑

**物品与成长（M3，逻辑层已完成，界面还没做）**

- **背包 48 格**：只有格子会限制你（捡不下了就留在原地，并给一次提示，2 秒节流不刷屏）。**负重机制已按需求移除** —— `items.json` 里不再有重量字段
- **装备 8 个部位**：武器 / 衣服 / 头盔 / 项链 / 手镯 / 戒指 / 腰带 / 靴子
- **属性聚合**：有效属性 = 基础属性 + 装备加成；升级改的是基础值，不会被换装覆盖
- **穿脱安全**：背包满时换装会失败，但**装备不会凭空消失**（有专门用例守着）
- **掉落表**：每只怪一套「掉什么 / 多少几率 / 掉几个」，多件掉落散落在附近格子，不会互相覆盖
- **消耗品**：金创药回血、魔法药回蓝；满血时不浪费
- **新手包**：进游戏背包里就有木剑 / 布衣 / 草鞋 / 3 瓶金创药
- **背包 / 角色面板**：`I` 开关背包、`C` 开关角色；48 格网格、悬停看属性、左键穿戴使用、右键丢弃、点装备栏卸下
- **地面掉落物带名字**：站到附近就显示名称，按类型上色（装备蓝 / 金币金 / 药水绿 / 材料灰），不用捡起来才知道掉了什么
- **属性面板看得懂**：血条 + 经验条；每条属性都给 {@基础 / 装备@} 明细，换装有没有用一眼看得出
- **UI 按 DPI 等比缩放**：基准 1080 高，Retina 屏（back buffer 3456×2160）自动放大 2 倍，字不会小到看不清
- **商店 NPC**：地图上有杂货商，站到旁边按 `E` 开关；左栏买（余额不足标红）、右栏点一下卖（回收价 = 原价 × 0.4）
- **存档**：`F5` 存 / `F9` 读 / `Esc` 退出自动存；进游戏自动读档。只存玩家（属性/位置/背包/装备），怪和掉落物重进重新生成
- **任何拒绝都有可见反馈**：金币不够 / 背包满了 / 附近没商人 / 捡不起来 / 技能冷却中，都会明确告诉你原因

**战士技能（M4，只做战士）**

- **普攻有动作了**：每次挥砍都会朝面向方向前冲一下 + 一道旋转刀光（之前扣了血但屏幕上什么都没发生）
- **攻速看得见**：按住攻击键持续出手，按 @@AttackInterval@@ 节流；角色面板显示 @@1.4 次/秒 / 间隔 7 tick@@
- **4 个技能**（按等级自动学会，技能书留到以后）：
  | 技能 | 学会等级 | 效果 |
  | --- | --- | --- |
  | 基本剑术 | 1 | 被动：命中 +3，攻击 +1 |
  | 攻杀剑术 | 1 | 身前单体，220% 伤害，3 蓝，1.8 秒冷却 |
  | 刺杀剑术 | 3 | 身前两格直线，150%，5 蓝 |
  | 烈火剑法 | 6 | 自身周围范围斩，180%，9 蓝 |
- **底部快捷栏**：显示技能名 / 蓝耗 / 冷却倒计时，冷却中会盖一层遮罩并显示剩余秒数
- 逻辑层 **153 项自动化自检**，而且**不需要打开 Unity** 就能跑

**还没做**：背包界面、角色面板、商店 NPC、存档 → M3 剩下的部分；技能在 M4。

---

## 环境要求

| 项 | 要求 |
| --- | --- |
| Unity | **6000.6.1f1**（实测通过；同为 6000.x 系列也可，用 Unity Hub 装） |
| 模板 | 已内建 **Universal 2D**（URP 2D Renderer 已挂到 QualitySettings，无需再建工程） |
| 输入 | Active Input Handling 已设为 **Both**；键盘操作走旧 Input，零配置 |
| 可选 | .NET SDK 8，用来无头跑逻辑自检（仓库内 `LocalTools/` 下已装了一份本地 SDK） |

> **这个仓库本身就是一个可以直接打开的 Unity 工程**（ProjectSettings / Packages / Assets 齐全，版本锁在 `ProjectSettings/ProjectVersion.txt`）。

---

## 2 分钟跑起来

1. **Unity Hub → Add → Add project from disk** → 选这个仓库根目录（不是 `Assets/`）
2. 用 **6000.6.1f1** 打开（其它 6000.x 会提示升级，点确认即可），等首次导入完成
3. 打开 `Assets/Scenes/GameM1.unity` → 点 **Play**

场景已经在仓库里，**不需要**再手动建工程、拷目录或搭场景。
如果想从零重建，菜单 **SimplyCQ → ① 搭建 M1 场景（并设为启动场景）** 会重新生成它。

开机先自检（可选但推荐）：菜单 **SimplyCQ → ④ 运行 Domain 冒烟自检**。

> 场景里只有两样东西：一个正交相机 + 一个挂着 `GameBootstrap` 的空物体。
> 地图、怪物、相机跟随、调试 HUD 全是运行时按数据生成的 —— 所以**没有需要手动拖拽的引用**，也不会有场景合并冲突。

### 操作

| 按键 | 动作 |
| --- | --- |
| W A S D / ↑ ↓ ← → | 8 方向走一格（按住连续走） |
| 空格 / J / 鼠标左键 | 攻击（朝当前朝向；按着方向键打就往那个方向打） |
| **按住**空格 / J / 左键 | **持续普攻**，按攻击间隔自动出手（攻速手感就靠这个） |
| 1 / 2 / 3 | 释放快捷栏技能（战士：攻杀剑术 / 刺杀剑术 / 烈火剑法） |
| I 或 B | 开关背包：左键穿戴/使用，右键丢地上，鼠标悬停看属性 |
| C | 开关角色面板：属性 + 8 个部位，左键点装备栏 = 卸下 |
| E | 站在商人旁边开关商店：左栏买、右栏点一下卖 |
| F5 / F9 | 手动存档 / 读档（Esc 退出会自动存一次） |

---

## 代码结构

```
Assets/
├── Scripts/
│   ├── Domain/          # 纯 C#，asmdef 里 noEngineReferences=true，禁止 using UnityEngine
│   │   ├── Core/        #   TilePos / Dir / Rng / EntityId / Entity / Intent / Events
│   │   ├── Map/         #   GameMap（通行表 / 传送点 / 刷怪区）
│   │   ├── World/       #   World / EventBus / PathFinder / ISystem
│   │   ├── Systems/     #   MovementSystem / AiSystem / SpawnerSystem
│   │   └── Simulation.cs
│   ├── Data/            # JSON DTO + 加载（唯一用 JsonUtility 的地方）
│   ├── Unity/           # 视图 / 输入 / 组装：唯一允许碰 UnityEngine 的业务层
│   │   ├── View/        #   Projection / PlaceholderArt / TileViewPool / EntityViewRegistry / CameraRig
│   │   ├── Input/       #   PlayerInputSource
│   │   └── Bootstrap/   #   GameBootstrap（组装 + 固定 tick 循环 + 调试 HUD）
│   └── Editor/          # 一键搭场景 / 冒烟自检
└── StreamingAssets/Data/  # balance.json / monsters.json / maps/*.json
```

### 一条铁律

**`Assets/Scripts/Domain` 里不允许出现 `using UnityEngine`。**
由 `SimplyCQ.Domain.asmdef` 的 `noEngineReferences: true` 强制保证，写错直接编译不过。

数据流是单向的：

```
输入 ──► Intent ──► Domain（固定 10Hz tick）──► 事件 ──► 视图 / UI / 音效
                                                    ▲
                                            表现层只读 World、只订阅事件
```

这么做的收益，现在就能看到三条：**能无头自检**、**存档只差序列化 World**、**以后要上服务端可以直接把 Domain 搬过去**。

---

## 改数据（不用写一行代码）

改完直接点 Play 就生效，不用重启 Unity。

### `Data/maps/map_grassland.json` —— 用字符画地图

```
.  草地        ,  草地(亮)     =  土路
#  树林(阻挡)   ~  水(阻挡)     ^  山(阻挡)      +  石板
```

```json
{
  "spawnX": 24, "spawnY": 40,
  "rows": [ "###...", "..." ],
  "spawners": [ { "x": 4, "y": 4, "w": 14, "h": 12, "monsterId": "mon_hen", "max": 8, "intervalTicks": 20 } ],
  "portals":  [ { "x": 24, "y": 46, "targetMap": "map_town", "targetX": 16, "targetY": 4 } ]
}
```

### `Data/monsters.json` —— 属性 / AI / 掉落（掉落字段 M2 加）

```json
{ "id": "mon_wolf", "name": "野狼", "sprite": "mon_wolf",
  "level": 4, "hp": 70, "ac": 1, "minDc": 3, "maxDc": 6, "exp": 18,
  "moveSpeed": 4, "attackInterval": 10, "attackRange": 1,
  "vision": 7, "aggressive": true, "leash": 14 }
```

### `Data/balance.json` —— 手感全在这里

```json
{ "tickPerSecond": 10, "playerMoveSpeed": 3,
  "tileWidthPx": 48, "tileHeightPx": 32, "pixelsPerUnit": 32,
  "visibleTilesVertically": 15, "cameraSmoothTime": 0.12, "worldSeed": 20240617 }
```

**调手感就看这几个**：`tickPerSecond`（逻辑频率）、`playerMoveSpeed`（走一格要几个 tick）、`monsters.json` 里的 `moveSpeed` / `attackInterval`。
传奇那种「一格一格的顿挫感」就是这几个数调出来的。

---

## 换美术（CC0 素材的接入点）

现在全部是 `PlaceholderArt` 运行时画的图。换成真素材只需要动两个地方：

1. 把 `PlaceholderArt` 换成按 `spriteId` 查图的 `SpriteLibrary`（从 `Assets/Art` 或 Addressables 读 `Sprite`）
2. 数据表里的 `sprite` 字段填资源名 —— 它已经通过 `Entity.SpriteId` 一路传到视图层了

**不需要改 Domain，不需要改任何玩法代码。** `TileViewPool` 和 `EntityViewRegistry` 是仅有的两个调用点。

素材规格（先定死，避免返工）：

| 项 | 规格 |
| --- | --- |
| 地表 tile | 48 × 32 px，PPU 32，Point 过滤 |
| 角色 / 怪物 | 32 × 48 px，pivot 在**底部中心** |
| 朝向 | 8 方向，每向 4~8 帧 |
| 命名 | `Kind_Id_Action_Dir_Frame`，例：`mon_wolf_walk_down_2` |

---

## 自检

### 无头跑（不需要 Unity，秒级）

```bash
bash Tools/run-domain-check.sh
```

编译的是纯 C# 的 `Assets/Scripts/Domain`，覆盖 TilePos / Rng / EventBus / A\* / 占位 / 移动冷却 / 碰撞 / AI 追击 / 刷怪上限，
每一步都检查「不越界、不站在墙里、两个实体不同格」这三条不变量。

### 无头编译检查（不需要 Unity）

```bash
bash Tools/run-compile-check.sh
```

用 `Tools/UnityCompileCheck/Stubs` 里的最小 UnityEngine / UnityEditor 桩，把 **Domain + Data + Unity + Editor 四层一起编译**，
抓的是拼写错误、重构残留（比如把 `evt` 改名成 `e` 之后漏改一处）、Unity API 用错这类问题 ——
搭这个骨架的过程中它真的抓到过一个。

> `Tools/` 在 `Assets/` 之外，Unity 不会导入，不会污染游戏工程。

### 在 Unity 里跑

菜单 **SimplyCQ → ④ 运行 Domain 冒烟自检** —— 它会真的读 `StreamingAssets` 里那几张表，
所以能同时抓出**逻辑 bug** 和**数据填错**（比如刷怪区里一格可站的都没有）。

---

## 打包成可双击运行的游戏

菜单 **SimplyCQ → 构建 macOS 可执行版**，产物在 `Builds/mac/simply-cq.app`（约 80MB，首次约 40 秒）。
命令行版本：

```bash
/Applications/Unity/Hub/Editor/6000.6.1f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics -quit -projectPath . \
  -executeMethod SimplyCQ.EditorTools.BuildScript.BuildMacBatch \
  -logFile LocalTools/unity-build.log
```

`Builds/` 已经在 `.gitignore` 里，不进版本库。

---

## 里程碑

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| **M0** 环境 | 工程结构 / asmdef 分层 / JSON 加载 / 占位图生成 | ✅ 完成 |
| **M1** 世界 | 通行表 + 斜视投影 + 8 向格子移动 + 相机 + 怪物游荡/追击 | ✅ 完成 |
| **M2** 战斗 | 伤害公式、命中/暴击、死亡、尸体、金币掉落与拾取、升级、飘字、受击反馈、HUD、玩家复活 | ✅ 完成 |
| **M3** 成长 | 背包（48 格）、装备 8 部位、属性聚合、掉落表、消耗品（负重已移除） | 🟡 逻辑层完成（153 项用例） |
| **M3b** 界面 | 背包/角色面板、掉落物名字、属性明细、DPI 缩放、Linear 色彩空间修正 | ✅ 完成 |
| **M3c** 经济与存档 | 商店 NPC 买卖、JSON 存读档 | ✅ 完成 |
| **M4** 战士技能 | 普攻动作/攻速、4 个战士技能、快捷栏 + 冷却显示 | ✅ 完成（按需求只做战士） |
| **M4b** 法师 / 道士 | 火球术等投射物、召唤、施毒 | ⏸ 暂缓（按需求只做战士） |
| **M5** 内容 | 3 张图、15~20 种怪、60 件装备、NPC 与传送 | ⬜ |
| **M6** 打磨 | UI 皮肤、音效、特效、数值平衡、手感调参面板 | ⬜ |

### 已通过的真实验证（Unity 6000.6.1f1 批处理）

```
四层程序集编译：SimplyCQ.Domain / .Data / .Unity / .Editor 全部 0 error
场景生成：      Assets/Scenes/GameM1.unity（Main Camera + CQ.Bootstrap）
内建冒烟自检：  全部通过（地图/刷怪区/寻路/600 tick 不变量/输入宏）
Unity 退出码：  0
```

一条命令复跑（需要能写 ~/Library/Caches/Unity 的权限）：

```bash
/Applications/Unity/Hub/Editor/6000.6.1f1/Unity.app/Contents/MacOS/Unity \\
  -batchmode -nographics -quit -projectPath . \\
  -executeMethod SimplyCQ.EditorTools.BatchRunner.RunAll -logFile LocalTools/unity.log
```

---

## 已知限制

- **存档只有一个槽位**，而且只存玩家：怪物、地面掉落物、刷怪进度都不存（重进重新生成）
- **商店只有买卖**：还没有修理 / 耐久 / 仓库
- **面板是 IMGUI 画的**：能玩、零资源，但不是最终形态；换 UGUI / UI Toolkit 只需要替掉 `InventoryUi` 一个类
- **没有药水**：靠脱战回血和升级回满，所以现在偏"能打"而不是"传奇那种要囤药"
- 只有键盘 + 鼠标左键；新 Input System 没接（`PlayerInputSource` 里留了 `#if` 分支，切过去会打明确警告而不是崩）
- 只有一张地图：`portals` 数据已就位，切图逻辑还没做
- 占位美术、没有音效
- 不含任何原版素材、地图文件、名称或 LOGO
