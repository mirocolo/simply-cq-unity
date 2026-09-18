import { EquipSlot } from '../../types/game';

export const ENHANCEABLE_SLOTS: EquipSlot[] = [
  'weapon',
  'armor',
  'helmet',
  'necklace',
  'bracelet_l',
  'bracelet_r',
  'ring_l',
  'ring_r'
];

export const MAX_ENHANCE_LEVEL = 15;

export interface EnhanceCost {
  gold: number;
  ironOre: number;      // mat_iron_ore (黑铁矿石)
  pureIron: number;     // mat_pure_iron (纯黑玄铁)
  godStone: number;     // mat_god_stone (天工神石)
  baseSuccessRate: number; // 0.0 ~ 1.0
}

export const ENHANCE_COSTS: Record<number, EnhanceCost> = {
  // 当前等级 -> 目标等级 (+1 ~ +15)
  0:  { gold: 10000,    ironOre: 3,  pureIron: 0,  godStone: 0, baseSuccessRate: 1.00 },
  1:  { gold: 25000,    ironOre: 5,  pureIron: 0,  godStone: 0, baseSuccessRate: 1.00 },
  2:  { gold: 50000,    ironOre: 8,  pureIron: 0,  godStone: 0, baseSuccessRate: 1.00 },
  3:  { gold: 100000,   ironOre: 12, pureIron: 0,  godStone: 0, baseSuccessRate: 0.85 },
  4:  { gold: 180000,   ironOre: 16, pureIron: 0,  godStone: 0, baseSuccessRate: 0.75 },
  5:  { gold: 300000,   ironOre: 20, pureIron: 0,  godStone: 0, baseSuccessRate: 0.65 },
  6:  { gold: 500000,   ironOre: 25, pureIron: 2,  godStone: 0, baseSuccessRate: 0.55 },
  7:  { gold: 800000,   ironOre: 30, pureIron: 4,  godStone: 0, baseSuccessRate: 0.45 },
  8:  { gold: 1200000,  ironOre: 35, pureIron: 6,  godStone: 0, baseSuccessRate: 0.40 },
  9:  { gold: 2000000,  ironOre: 0,  pureIron: 10, godStone: 1, baseSuccessRate: 0.35 },
  10: { gold: 3500000,  ironOre: 0,  pureIron: 15, godStone: 2, baseSuccessRate: 0.30 },
  11: { gold: 5500000,  ironOre: 0,  pureIron: 20, godStone: 3, baseSuccessRate: 0.25 },
  12: { gold: 8000000,  ironOre: 0,  pureIron: 28, godStone: 4, baseSuccessRate: 0.20 },
  13: { gold: 12000000, ironOre: 0,  pureIron: 38, godStone: 6, baseSuccessRate: 0.15 },
  14: { gold: 18000000, ironOre: 0,  pureIron: 50, godStone: 8, baseSuccessRate: 0.12 }
};

export interface SlotEnhanceStats {
  minDC: number;
  maxDC: number;
  minAC: number;
  maxAC: number;
  maxHp: number;
  critBonus?: number;
}

export function getSlotEnhanceStats(slot: EquipSlot, level: number): SlotEnhanceStats {
  if (level <= 0) return { minDC: 0, maxDC: 0, minAC: 0, maxAC: 0, maxHp: 0 };

  switch (slot) {
    case 'weapon':
      return {
        minDC: level * 8,
        maxDC: level * 16,
        minAC: 0,
        maxAC: 0,
        maxHp: 0,
        critBonus: level >= 10 ? (level - 9) * 2 : 0
      };
    case 'armor':
      return {
        minDC: 0,
        maxDC: 0,
        minAC: level * 6,
        maxAC: level * 12,
        maxHp: level * 120
      };
    case 'helmet':
      return {
        minDC: 0,
        maxDC: 0,
        minAC: level * 4,
        maxAC: level * 8,
        maxHp: level * 80
      };
    case 'necklace':
      return {
        minDC: level * 6,
        maxDC: level * 12,
        minAC: 0,
        maxAC: 0,
        maxHp: 0,
        critBonus: level >= 7 ? Math.floor(level / 2) : 0
      };
    case 'bracelet_l':
    case 'bracelet_r':
      return {
        minDC: level * 3,
        maxDC: level * 6,
        minAC: level * 3,
        maxAC: level * 6,
        maxHp: level * 60
      };
    case 'ring_l':
    case 'ring_r':
      return {
        minDC: level * 7,
        maxDC: level * 14,
        minAC: 0,
        maxAC: 0,
        maxHp: 0
      };
    default:
      return { minDC: 0, maxDC: 0, minAC: 0, maxAC: 0, maxHp: 0 };
  }
}

export interface EnhancementResonance {
  reqLevel: number;
  title: string;
  desc: string;
  dcMult: number;
  acMult: number;
  hpMult: number;
  lifestealRate?: number;
  defenseIgnoreRate?: number;
  damageMultRatio?: number;
  glowColor: string;
}

export const ENHANCEMENT_RESONANCES: EnhancementResonance[] = [
  {
    reqLevel: 7,
    title: '✨【流光护体】',
    desc: '全套强化+7：全属性提升 8%，伤害减免 +5%',
    dcMult: 0.08,
    acMult: 0.08,
    hpMult: 0.08,
    glowColor: '#38bdf8'
  },
  {
    reqLevel: 10,
    title: '🔥【神威赫赫】',
    desc: '全套强化+10：全属性提升 15%，刀刀吸血 +3%',
    dcMult: 0.15,
    acMult: 0.15,
    hpMult: 0.15,
    lifestealRate: 0.03,
    glowColor: '#f59e0b'
  },
  {
    reqLevel: 13,
    title: '⚡【太古玄灵】',
    desc: '全套强化+13：全属性提升 22%，无视防御 +10%',
    dcMult: 0.22,
    acMult: 0.22,
    hpMult: 0.22,
    lifestealRate: 0.03,
    defenseIgnoreRate: 0.10,
    glowColor: '#a855f7'
  },
  {
    reqLevel: 15,
    title: '👑【万界至尊】',
    desc: '全套强化+15：全属性提升 35%，终极倍攻 +20%，破甲 +15%',
    dcMult: 0.35,
    acMult: 0.35,
    hpMult: 0.35,
    lifestealRate: 0.05,
    defenseIgnoreRate: 0.15,
    damageMultRatio: 0.20,
    glowColor: '#ef4444'
  }
];

export function getActiveResonance(slotEnhancements: Partial<Record<EquipSlot, number>>): EnhancementResonance | null {
  const levels = ENHANCEABLE_SLOTS.map(s => slotEnhancements[s] || 0);
  const minLevel = Math.min(...levels);

  for (let i = ENHANCEMENT_RESONANCES.length - 1; i >= 0; i--) {
    if (minLevel >= ENHANCEMENT_RESONANCES[i].reqLevel) {
      return ENHANCEMENT_RESONANCES[i];
    }
  }
  return null;
}
