import { EntityStats, EquipSlot, ItemInstance } from '../types/game';

export interface LevelMilestone {
  title: string;
  haste: number;
  critRate: number;
  critMult: number;
  dodgeRate: number;
}

export class StatCalculator {
  /**
   * 等级境界里程碑加成 (达到特定等级大幅提升人物攻速急速、暴击率、暴击伤害与闪避率)
   */
  static getLevelMilestone(level: number): LevelMilestone {
    if (level >= 40) return { title: '绝世天尊', haste: 45, critRate: 0.18, critMult: 0.60, dodgeRate: 0.20 };
    if (level >= 35) return { title: '烈火战神', haste: 36, critRate: 0.15, critMult: 0.50, dodgeRate: 0.16 };
    if (level >= 30) return { title: '傲视群雄', haste: 28, critRate: 0.12, critMult: 0.40, dodgeRate: 0.14 };
    if (level >= 25) return { title: '所向披靡', haste: 22, critRate: 0.10, critMult: 0.30, dodgeRate: 0.12 };
    if (level >= 20) return { title: '名震沙城', haste: 16, critRate: 0.08, critMult: 0.20, dodgeRate: 0.10 };
    if (level >= 15) return { title: '身手敏捷', haste: 12, critRate: 0.06, critMult: 0.10, dodgeRate: 0.08 };
    if (level >= 10) return { title: '锋芒毕露', haste: 8, critRate: 0.04, critMult: 0.05, dodgeRate: 0.05 };
    if (level >= 5) return { title: '初涉江湖', haste: 5, critRate: 0.02, critMult: 0, dodgeRate: 0.03 };
    return { title: '初出茅庐', haste: 0, critRate: 0, critMult: 0, dodgeRate: 0.02 };
  }

  static getBaseStatsForLevel(level: number): EntityStats {
    const baseHp = 150 + (level - 1) * 45;
    const baseMp = 80 + (level - 1) * 20;
    const minDC = 6 + Math.floor(level * 2.2);
    const maxDC = 12 + Math.floor(level * 3.5);
    const minAC = 2 + Math.floor(level * 1.0);
    const maxAC = 4 + Math.floor(level * 1.6);
    const maxExp = Math.floor(80 * Math.pow(1.3, level - 1));

    const milestone = this.getLevelMilestone(level);
    const critRate = 0.08 + milestone.critRate;
    const critMult = 1.6 + milestone.critMult;
    const haste = milestone.haste;
    const dodgeRate = milestone.dodgeRate;

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
      critRate,
      critMult,
      haste,
      dodgeRate,
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

    const critRate = Math.min(0.85, baseStats.critRate + addCritBonus / 100);
    const haste = baseStats.haste + addHasteBonus;
    const dodgeRate = baseStats.dodgeRate;
    const critMult = baseStats.critMult;

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
      critRate * 1600 + 
      (critMult - 1) * 200 +
      dodgeRate * 1400 +
      haste * 12 +
      baseStats.level * 35
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
      critMult,
      haste,
      dodgeRate,
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
