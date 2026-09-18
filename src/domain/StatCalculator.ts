import { EntityStats, EquipSlot, ItemInstance } from '../types/game';

export class StatCalculator {
  /**
   * 基础角色初始属性 (按等级成长)
   */
  static getBaseStatsForLevel(level: number): EntityStats {
    const baseHp = 100 + (level - 1) * 35;
    const baseMp = 50 + (level - 1) * 15;
    const minDC = 3 + Math.floor(level * 1.5);
    const maxDC = 7 + Math.floor(level * 2.5);
    const minAC = 1 + Math.floor(level * 0.8);
    const maxAC = 2 + Math.floor(level * 1.2);
    const maxExp = Math.floor(100 * Math.pow(1.35, level - 1));

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
      critRate: 0.05, // 基础 5% 暴击率
      critMult: 1.5,  // 基础 150% 暴击伤害
      haste: 0,
      baseAttackInterval: 7, // 基础出手间隔 7 ticks (700ms)
      effectiveAttackInterval: 7,
      combatPower: 0,
      gold: 0,
      exp: 0,
      maxExp
    };
  }

  /**
   * 聚合计算穿戴装备后的最终属性
   */
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

    // 暴击率封顶 75%
    const critRate = Math.min(0.75, baseStats.critRate + addCritBonus / 100);
    const haste = baseStats.haste + addHasteBonus;

    // 有效出手间隔公式：base * 100 / (100 + haste)，最低 2 tick (200ms 一刀)
    const effectiveAttackInterval = Math.max(
      2, 
      Math.floor((baseStats.baseAttackInterval * 100) / (100 + haste))
    );

    // 综合战力值 CombatPower 计算 (经典传奇加权)
    // 物理均伤*3 + 双防均值*2 + 生命*0.5 + 暴击率*1200 + 急速*8
    const midDC = (minDC + maxDC) / 2;
    const midAC = (minAC + maxAC) / 2;
    const combatPower = Math.floor(
      midDC * 3.5 + 
      midAC * 2.5 + 
      maxHp * 0.4 + 
      maxMp * 0.2 + 
      critRate * 1200 + 
      haste * 8 +
      baseStats.level * 25
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
}
