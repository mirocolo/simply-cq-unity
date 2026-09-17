# simply-cq-unity

《传奇》风格的 **本地单机** 复刻 —— Unity 6 + 纯 C# 逻辑层。

> 目标不是还原原版，而是把「打怪 → 爆装 → 回城卖 → 换装变强」这条循环做得**手感像传奇**。
> 完整方案见 `docs/设计方案.md`。

---

## 现在能跑什么（M0 + M1 已完成）

- 一张 48×48 的「新手草原」：树林、水塘、十字土路、山坡，**斜俯视伪 2.5D** 投影
- WASD / 方向键 **8 方向格子走路**，一格一格，撞墙撞怪会原地转身
- 相机平滑跟随 + 地图边界夹取
- 二十多只怪：**被动怪（鸡）** 在出生点附近游荡；**主动怪（野狼 / 野猪）** 看见你会用 **A\*** 绕过障碍追你，追出一定距离会脱战回家
- 刷怪区自动维持怪物数量（死亡补刷的逻辑已就位，战斗在 M2）
- 地形和角色**全部是运行时程序画的占位图**，零美术资源依赖
- 左上角调试信息：tick / 逻辑帧率 / FPS / 实体数 / 可见格数 / 对象池大小
- 逻辑层有 **60 项自动化自检**，而且**不需要打开 Unity** 就能跑

**还没做**：战斗、伤害、掉落、背包、装备、NPC、商店、技能、存档 → 里程碑 M2~M6。

---

## 环境要求

| 项 | 要求 |
| --- | --- |
| Unity | **6.3 LTS（6000.3.x）**，**Universal 2D** 模板（6.0 LTS 也可） |
| 输入 | Project Settings → Player → Other Settings → Active Input Handling 设为 **Both**（或 Input Manager (Old)） |
| 可选 | .NET SDK 8，用来无头跑逻辑自检（本仓库 `.tools/` 下已装了一份本地 SDK） |

> 本机当前**没有安装 Unity**，第一步是装 Unity Hub。

---

## 5 分钟跑起来

1. 装 **Unity Hub** + **Unity 6.3 LTS**（勾选 macOS/Windows 构建支持）
2. Hub → **New project** → 模板选 **Universal 2D** → 工程名 `simply-cq-unity`
3. 把本仓库的这两个目录**合并**进新工程的 `Assets/`：
   - `Assets/Scripts` → `Assets/Scripts`
   - `Assets/StreamingAssets` → `Assets/StreamingAssets`
4. 回到 Unity，等编译完成（Console 不能有红色报错）
5. 菜单 **SimplyCQ → ① 搭建 M1 场景（并设为启动场景）**
6. 打开 `Assets/Scenes/GameM1.unity` → 点 **Play**
7. （可选）菜单 **SimplyCQ → ④ 运行 Domain 冒烟自检** 先验证数据和逻辑

> 场景里只有两样东西：一个正交相机 + 一个挂着 `GameBootstrap` 的空物体。
> 地图、怪物、相机跟随、调试 HUD 全是运行时按数据生成的 —— 所以**没有需要手动拖拽的引用**，也不会有场景合并冲突。

### 操作

| 按键 | 动作 |
| --- | --- |
| W A S D / ↑ ↓ ← → | 8 方向走一格（按住连续走） |

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

## 里程碑

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| **M0** 环境 | 工程结构 / asmdef 分层 / JSON 加载 / 占位图生成 | ✅ 完成 |
| **M1** 世界 | 通行表 + 斜视投影 + 8 向格子移动 + 相机 + 怪物游荡/追击 | ✅ 完成 |
| **M2** 战斗 | 伤害公式、命中/暴击、死亡、掉落、飘字、刷怪补位 | ⬜ 下一步 |
| **M3** 成长 | 经验升级、背包（负重）、装备 8 格、属性面板、商店、存档 | ⬜ |
| **M4** 技能 | 技能系统 + 三职业 + 快捷栏 + 投射物 | ⬜ |
| **M5** 内容 | 3 张图、15~20 种怪、60 件装备、NPC 与传送 | ⬜ |
| **M6** 打磨 | UI 皮肤、音效、特效、数值平衡、手感调参面板 | ⬜ |

---

## 已知限制

- 没有战斗：怪物会追到身边并置位 `WantsAttack`，但伤害结算在 M2
- 只有键盘输入；新 Input System 没接（`PlayerInputSource` 里留了 `#if` 分支，切过去会打明确警告而不是崩）
- 只有一张地图：`portals` 数据已就位，切图逻辑在 M2
- 占位美术、没有音效
- 不含任何原版素材、地图文件、名称或 LOGO
