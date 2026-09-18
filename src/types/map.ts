import { GridCoord } from './game';
export type { GridCoord };

export interface PortalDef {
  id: string;
  name: string;               // 传送门显示名称 (如："前往沃玛神殿")
  pos: GridCoord;             // 本图中的网格坐标
  targetMapId: string;        // 目标位面 ID
  targetPos: GridCoord;       // 传送到目标地图的出生坐标
  requiredTier: number;       // 准入所需飞升阶数 (0 ~ 9)
  requiredLevel: number;      // 准入最低角色等级
  beamColor?: string;         // 光柱与光涡主色调 (Hex)
}

export interface SafeZoneDef {
  center: GridCoord;
  radius: number;             // 安全区切比雪夫半径
}

export interface MonsterSpawnRule {
  templateId: string;
  count: number;
  center: GridCoord;
  radius: number;
  respawnTicks: number;       // 独立刷新倒计时 (ticks)
  isGuaranteedBoss?: boolean; // 守关首领标记
}

export interface MapTheme {
  primaryColor: string;       // 地砖主色 (地面基础)
  secondaryColor: string;     // 地砖次色 (噪点/纹理)
  accentColor: string;        // 点缀特征色 (如地裂、青苔、熔浆痕迹)
  wallBaseColor: string;      // 障碍物底座色
  wallTopColor: string;       // 障碍物顶面色
  wallBorderColor: string;    // 障碍物描边色
  ambientLight: string;       // 全屏环境光色调 (RGBA)
  vignetteStrength: number;   // 边缘暗角/迷雾浓度 (0 ~ 1.0)
  groundDetailType: 'grass' | 'stone' | 'blood' | 'lava' | 'void';
}

export interface MapDefinition {
  id: string;
  name: string;
  tier: number;               // 位面阶数 (0 ~ 9)
  recommendedLevel: string;   // 推荐等级 (展示用)
  width: number;              // 网格宽度 (36)
  height: number;             // 网格高度 (36)
  theme: MapTheme;
  spawnPoint: GridCoord;      // 回城/登入默认坐标
  safeZone?: SafeZoneDef;     // 安全区
  fixedObstacles: GridCoord[];// 静态障碍物列表
  portals: PortalDef[];       // 传送门列表
  spawns: MonsterSpawnRule[]; // 怪物群落刷新规则
  desc: string;               // 位面背景故事介绍
}
