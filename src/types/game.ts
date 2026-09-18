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
  | 'ring_r'
  | 'special_paralyze'
  | 'special_revive'
  | 'special_protect'
  | 'special_wind'
  | 'special_luck'
  | 'special_greed';

export type ItemType = 'equipment' | 'potion' | 'material';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  slot?: EquipSlot;
  tier: number; // 0 ~ 9 飞升阶数
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
  luck?: number; // 永久幸运加成
  damageMultRatio?: number; // 终极倍攻加成
  defenseIgnoreRate?: number; // 破甲无视防御率
  setName?: string; // 套装标识 (如 'wooma', 'zuma', 'shengzhan', 'leiting', 'zhanshen', 'hongmeng')
  specialEffect?: string; // 特戒特效 (如 'paralyze', 'revive', 'protect', 'wind', 'luck', 'greed')
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
  tier: number; // 0 ~ 9 飞升阶数
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
  luck?: number;
  damageMultRatio?: number;
  defenseIgnoreRate?: number;
  setName?: string;
  specialEffect?: string;
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
  ascensionTier: number; // 0 ~ 9 飞升阶数
  luck: number; // 幸运值 (达到 9 刀刀发挥最大攻击上限)
  damageMultRatio: number; // 稀有倍攻乘数 (0.15 = +15% 倍攻)
  defenseIgnoreRate: number; // 破甲无视防御率 (0 ~ 1.0)
  thornsRate?: number; // 荆棘反震率 (0 ~ 1.0)
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
  templateId?: string;
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
  affixes?: import('./affix').MonsterAffixType[];
  shieldHp?: number;
  maxShieldHp?: number;
  shieldTicks?: number;
  isWeakened?: boolean;
  weakenTicks?: number;
  isGoblin?: boolean;
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
  frostTicks?: number; // 极寒减速时间
  isBossEnraged?: boolean; // Boss生命低狂暴
  bossSkillTimer?: number; // Boss技能施放计时
  reviveCooldownTicks?: number; // 复活特戒冷却 (900 ticks = 90秒)
  invincibleTicks?: number; // 无敌金身保护倒计时
  hasBeenAttackedByPlayer?: boolean; // 是否已被玩家主动攻击过 (低级保护判定)
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
  isAwakened?: boolean; // 是否已飞升觉醒
  awakenedName?: string; // 觉醒后专属神通名
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
  autoRecycleMaxQuality?: number; // 自动熔炼最高品质: 1=白绿, 2=蓝装及以下(默认推荐), 3=紫装及以下
  searchRadius: number;
  progressionMode?: boolean; // 是否开启自动破境推图 (遇传送门自动下层)
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
