import { EntityStats, EquipSlot, ItemInstance } from '../types/game';

export class StatCalculator {
  static getBaseStatsForLevel(level: number): EntityStats {
    const baseHp = 150 + (level - 1) * 45;
    const baseMp = 80 + (level - 1) * 20;
    const minDC = 6 + Math.floor(level * 2.2);
    const maxDC = 12 + Math.floor(level * 3.5);
    const minAC = 2 + Math.floor(level * 1.0);
    const maxAC = 4 + Math.floor(level * 1.6);
    const maxExp = Math.floor(80 * Math.pow(1.3, level - 1));

    return {
      level,
      hp: baseHp,
      maxHp: baseHp,
      mp: baseMp,
      maxMp: baseMp,
      minDC,
      maxDC,
      minAC,
      maxAC,
      critRate: 0.08, // 基础 8% 暴击率
      critMult: 1.6,  // 基础 160% 暴击伤害
      haste: 0,
      baseAttackInterval: 4, // 默认加快至 4 ticks (400ms 一刀，爽快节奏！)
      effectiveAttackInterval: 4,
      combatPower: 0,
      gold: 0,
      exp: 0,
      maxExp
    };
  }

  static applyEquipment(
    baseStats: EntityStats, 
    equipped: Partial<Record<EquipSlot, ItemInstance>>
  ): EntityStats {
    let addMinDC = 0;
    let addMaxDC = 0;
    let addMinAC = 0;
    let addMaxAC = 0;
    let addHp = 0;
    let addMp = 0;
    let addCritBonus = 0;
    let addHasteBonus = 0;

    for (const item of Object.values(equipped)) {
      if (!item) continue;
      addMinDC += item.minDC;
      addMaxDC += item.maxDC;
      addMinAC += item.minAC;
      addMaxAC += item.maxAC;
      addHp += item.maxHp;
      addMp += item.maxMp;
      addCritBonus += item.critBonus;
      addHasteBonus += item.hasteBonus;
    }

    const maxHp = baseStats.maxHp + addHp;
    const maxMp = baseStats.maxMp + addMp;
    const minDC = baseStats.minDC + addMinDC;
    const maxDC = baseStats.maxDC + addMaxDC;
    const minAC = baseStats.minAC + addMinAC;
    const maxAC = baseStats.maxAC + addMaxAC;

    const critRate = Math.min(0.80, baseStats.critRate + addCritBonus / 100);
    const haste = baseStats.haste + addHasteBonus;

    // 有效出手间隔：最低 2 ticks (200ms 一刀，极速如风)
    const effectiveAttackInterval = Math.max(
      2, 
      Math.floor((baseStats.baseAttackInterval * 100) / (100 + haste))
    );

    const midDC = (minDC + maxDC) / 2;
    const midAC = (minAC + maxAC) / 2;
    const combatPower = Math.floor(
      midDC * 3.8 + 
      midAC * 2.8 + 
      maxHp * 0.45 + 
      maxMp * 0.25 + 
      critRate * 1500 + 
      haste * 10 +
      baseStats.level * 30
    );

    return {
      ...baseStats,
      hp: Math.min(baseStats.hp, maxHp),
      maxHp,
      mp: Math.min(baseStats.mp, maxMp),
      maxMp,
      minDC,
      maxDC,
      minAC,
      maxAC,
      critRate,
      haste,
      effectiveAttackInterval,
      combatPower
    };
  }

  /**
   * 计算单件装备战力评分
   */
  static getItemCombatPower(item: ItemInstance): number {
    if (item.type !== 'equipment') return 0;
    const midDC = (item.minDC + item.maxDC) / 2;
    const midAC = (item.minAC + item.maxAC) / 2;
    return Math.floor(
      midDC * 3.8 +
      midAC * 2.8 +
      (item.maxHp || 0) * 0.45 +
      (item.maxMp || 0) * 0.25 +
      (item.critBonus || 0) * 15 +
      (item.hasteBonus || 0) * 10 +
      (item.quality || 0) * 25
    );
  }
}
