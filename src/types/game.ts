export type Direction8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
// 0: 上(N), 1: 东北(NE), 2: 东(E), 3: 东南(SE), 4: 南(S), 5: 西南(SW), 6: 西(W), 7: 西北(NW)

export interface GridCoord {
  x: number;
  y: number;
}

export interface ScreenCoord {
  x: number;
  y: number;
}

export type ItemQuality = 0 | 1 | 2 | 3 | 4; 
// 0: 普通(白), 1: 优秀(绿), 2: 精良(蓝), 3: 史诗(紫), 4: 传说(橙)

export type EquipSlot = 
  | 'weapon' 
  | 'armor' 
  | 'helmet' 
  | 'necklace' 
  | 'bracelet_l' 
  | 'bracelet_r' 
  | 'ring_l' 
  | 'ring_r';

export type ItemType = 'equipment' | 'potion';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  slot?: EquipSlot;
  baseQuality: ItemQuality;
  minDC: number;
  maxDC: number;
  minAC: number;
  maxAC: number;
  maxHp: number;
  maxMp: number;
  critBonus?: number; // 百分点，如 3 代表 +3% 暴击率
  hasteBonus?: number; // 急速点数，如 10 代表 +10 急速
  recoverHp?: number; // 药水恢复量
  recoverMp?: number;
  levelReq: number;
  price: number;
  icon: string;
  desc: string;
}

export interface ItemInstance {
  instanceId: string;
  defId: string;
  name: string;
  type: ItemType;
  slot?: EquipSlot;
  quality: ItemQuality;
  minDC: number;
  maxDC: number;
  minAC: number;
  maxAC: number;
  maxHp: number;
  maxMp: number;
  critBonus: number;
  hasteBonus: number;
  recoverHp?: number;
  recoverMp?: number;
  levelReq: number;
  price: number;
  icon: string;
  desc: string;
  count: number;
}

export interface EntityStats {
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  minDC: number;
  maxDC: number;
  minAC: number;
  maxAC: number;
  critRate: number; // 0 ~ 0.75
  critMult: number; // 1.5 ~ 2.5
  haste: number; // 急速点数
  baseAttackInterval: number; // 基础 tick 数 (默认 7 ticks = 700ms)
  effectiveAttackInterval: number; // 计算急速后的实际 tick 间隔
  combatPower: number; // 综合战力值
  gold: number;
  exp: number;
  maxExp: number;
}

export interface Entity {
  id: string;
  name: string;
  isPlayer: boolean;
  gridPos: GridCoord;
  targetGridPos: GridCoord | null;
  moveProgress: number; // 0 ~ 1 平滑插值
  direction: Direction8;
  stats: EntityStats;
  targetEntityId: string | null;
  lastAttackTick: number;
  state: 'idle' | 'walking' | 'attacking' | 'dead';
  stateTicks: number;
  isBoss?: boolean;
  isElite?: boolean;
  respawnTicks?: number;
  maxRespawnTicks?: number;
  spawnOrigin?: GridCoord;
  color?: string;
  icon?: string;
}

export type SkillId = 'basic_slash' | 'power_slash' | 'assassinate' | 'fire_slash';

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  desc: string;
  level: number;
  damageMult: number;
  cdTicks: number;
  manaCost: number;
  unlockLevel: number;
  currentCdTicks: number;
}

export interface GroundItem {
  id: string;
  item: ItemInstance;
  gridPos: GridCoord;
  dropTick: number;
  beamColor: string | null; // 冲天光柱颜色，白/绿为 null
}

export interface DamagePopup {
  id: string;
  text: string;
  worldX: number;
  worldY: number;
  color: string;
  isCrit: boolean;
  isHeal?: boolean;
  life: number;
  maxLife: number;
  vy: number;
}

export interface BattleLog {
  id: string;
  text: string;
  type: 'kill' | 'drop' | 'system' | 'damage';
  quality?: ItemQuality;
  timestamp: string;
}

export interface AutoPilotConfig {
  enabled: boolean;
  autoPotionHpPercent: number; // 默认 50%
  autoPotionMpPercent: number; // 默认 30%
  autoSkill: boolean;
  autoPickup: boolean;
  searchRadius: number; // 默认 12 格
}

export interface AutoPilotStats {
  activeTimeSeconds: number;
  killCount: number;
  expGained: number;
  goldGained: number;
  blueDrops: number;
  purpleDrops: number;
  orangeDrops: number;
}
