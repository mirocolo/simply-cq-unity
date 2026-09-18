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
  critBonus?: number;
  hasteBonus?: number;
  lifestealBonus?: number; // 稀有生命吸血百分比加成 (如 2 代表 +2%)
  recoverHp?: number;
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
  lifestealBonus?: number; // 稀有生命吸血百分比加成 (如 2 代表 +2%)
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
  critRate: number;
  critMult: number;
  haste: number;
  dodgeRate: number;
  lifestealRate: number; // 稀有生命吸血率 (出厂 0.02 即 2%)
  baseAttackInterval: number; // 默认 4~5 ticks
  effectiveAttackInterval: number;
  phantomStrikeRate: number; // 攻速溢出转化的风雷残影连击率 (0 ~ 1.0+)
  combatPower: number;
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
  moveProgress: number;
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
  // 打击物理反馈
  hitStunTicks?: number; // 受击硬直与泛红倒计时
  knockbackOffset?: { x: number; y: number }; // 受击微后退位移
  // 技能与增益效果
  shieldAegisTicks?: number; // 护体神盾持续时间
  poisonTicks?: number; // 中毒持续时间
  isBossEnraged?: boolean; // Boss生命低狂暴
  bossSkillTimer?: number; // Boss技能施放计时
}

export type SkillId = 
  | 'basic_slash' 
  | 'power_slash' 
  | 'assassinate' 
  | 'shield_aegis' 
  | 'fire_slash' 
  | 'heaven_splitter' 
  | 'sun_slash';

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  desc: string;
  level: number;
  proficiency: number;
  maxProficiency: number;
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
  beamColor: string | null;
  // 大爆喷泉动画参数
  burstOrigin?: { x: number; y: number };
  burstProgress?: number; // 0 ~ 1 抛物线动画
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
  scale?: number;
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
  autoHpPotion: boolean;
  autoPotionHpPercent: number;
  autoMpPotion: boolean;
  autoPotionMpPercent: number;
  autoSkill: boolean;
  autoPickup: boolean;
  autoRecycleWeaker: boolean;
  searchRadius: number;
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
