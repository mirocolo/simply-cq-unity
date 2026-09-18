import { EntityStats, EquipSlot, ItemInstance } from '../types/game';
import { ASCENSION_DEFINITIONS } from './definitions/ascension';
import { SET_DEFINITIONS, SetBonus, SetDef } from './definitions/sets';
import { getSlotEnhanceStats, getActiveResonance } from './definitions/enhancement';

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

  static getBaseStatsForLevel(level: number, ascensionTier = 0): EntityStats {
    let baseHp = 380 + (level - 1) * 55;
    let baseMp = 120 + (level - 1) * 25;
    let minDC = 10 + Math.floor(level * 2.5);
    let maxDC = 18 + Math.floor(level * 4.0);
    let minAC = 4 + Math.floor(level * 1.2);
    let maxAC = 8 + Math.floor(level * 1.8);
    const maxExp = Math.floor(60 * Math.pow(1.22, level - 1));

    const milestone = this.getLevelMilestone(level);
    let critRate = 0.08 + milestone.critRate;
    let critMult = 1.6 + milestone.critMult;
    let haste = milestone.haste;
    let dodgeRate = milestone.dodgeRate;
    let lifestealRate = 0.05; // 出厂 5% (前期稳健续航)
    let luck = 0;
    let damageMultRatio = 0;
    let defenseIgnoreRate = 0;

    // 飞升阶数全面增益与质变
    if (ascensionTier > 0) {
      const ascDef = ASCENSION_DEFINITIONS[ascensionTier];
      if (ascDef) {
        // 基础四维乘数缩放
        const mult = 1 + ascDef.statMultiplier;
        baseHp = Math.floor(baseHp * mult);
        baseMp = Math.floor(baseMp * mult);
        minDC = Math.floor(minDC * mult);
        maxDC = Math.floor(maxDC * mult);
        minAC = Math.floor(minAC * mult);
        maxAC = Math.floor(maxAC * mult);

        // 累积全阶数幸运与稀有词条
        for (let t = 1; t <= ascensionTier; t++) {
          const prev = ASCENSION_DEFINITIONS[t];
          if (prev) {
            luck += prev.luckBonus;
            lifestealRate += prev.lifestealBonus;
            critRate += prev.critRateBonus;
            critMult += prev.critMultBonus;
          }
        }
        damageMultRatio = ascDef.damageMultRatio;
        defenseIgnoreRate = ascDef.defenseIgnoreRate;
      }
    }

    const baseAttackInterval = 4; // 默认 400ms 一刀
    const effectiveAttackInterval = Math.max(
      2,
      Math.floor((baseAttackInterval * 100) / (100 + haste))
    );
    const overflowHaste = Math.max(0, haste - 34);
    const phantomStrikeRate = overflowHaste > 0 ? Number((overflowHaste * 0.015).toFixed(3)) : 0;

    return {
      level,
      ascensionTier,
      luck,
      damageMultRatio,
      defenseIgnoreRate,
      hp: baseHp,
      maxHp: baseHp,
      mp: baseMp,
      maxMp: baseMp,
      minDC,
      maxDC,
      minAC,
      maxAC,
      critRate: Math.min(0.85, critRate),
      critMult,
      haste,
      dodgeRate,
      lifestealRate: Number(lifestealRate.toFixed(3)),
      baseAttackInterval,
      effectiveAttackInterval,
      phantomStrikeRate,
      combatPower: 0,
      gold: 0,
      exp: 0,
      maxExp
    };
  }

  /**
   * 收集当前穿戴激活的所有套装羁绊
   */
  static getActiveSets(equipped: Partial<Record<EquipSlot, ItemInstance>>) {
    const counts: Record<string, number> = {};
    for (const it of Object.values(equipped)) {
      if (it && it.setName) {
        counts[it.setName] = (counts[it.setName] || 0) + 1;
      }
    }
    const result: { set: SetDef; count: number; activeBonuses: SetBonus[] }[] = [];
    for (const [setId, setDef] of Object.entries(SET_DEFINITIONS)) {
      const count = counts[setId] || 0;
      if (count >= 2) {
        const activeBonuses = setDef.bonuses.filter(b => count >= b.count);
        result.push({ set: setDef, count, activeBonuses });
      }
    }
    return result;
  }

  static applyEquipment(
    baseStats: EntityStats, 
    equipped: Partial<Record<EquipSlot, ItemInstance>>,
    slotEnhancements?: Partial<Record<EquipSlot, number>>
  ): EntityStats {
    let addMinDC = 0;
    let addMaxDC = 0;
    let addMinAC = 0;
    let addMaxAC = 0;
    let addHp = 0;
    let addMp = 0;
    let addCritBonus = 0;
    let addHasteBonus = 0;
    let addLifestealBonus = 0;
    let addLuck = 0;
    let addDamageMult = 0;
    let addDefenseIgnore = 0;

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
      addLifestealBonus += item.lifestealBonus || 0;
      addLuck += item.luck || 0;
      addDamageMult += item.damageMultRatio || 0;
      addDefenseIgnore += item.defenseIgnoreRate || 0;

      // 幸运特戒直接增加幸运
      if (item.specialEffect === 'luck') {
        addLuck += 3;
      }
    }

    // 装备部位强化加成 (部位继承、零损换装)
    if (slotEnhancements) {
      for (const [slotKey, level] of Object.entries(slotEnhancements)) {
        if (!level || level <= 0) continue;
        const enh = getSlotEnhanceStats(slotKey as EquipSlot, level);
        addMinDC += enh.minDC;
        addMaxDC += enh.maxDC;
        addMinAC += enh.minAC;
        addMaxAC += enh.maxAC;
        addHp += enh.maxHp;
        if (enh.critBonus) addCritBonus += enh.critBonus;
      }
    }

    // 套装羁绊加成结算
    const activeSets = this.getActiveSets(equipped);
    let setDcMult = 0;
    let setAcMult = 0;
    let setHpMult = 0;
    let setCritRate = 0;
    let setLifestealRate = 0;
    let setDodgeRate = 0;
    let setDamageMultRatio = 0;
    let setHaste = 0;

    for (const act of activeSets) {
      for (const b of act.activeBonuses) {
        if (b.dcMult) setDcMult += b.dcMult;
        if (b.acMult) setAcMult += b.acMult;
        if (b.hpMult) setHpMult += b.hpMult;
        if (b.critRate) setCritRate += b.critRate;
        if (b.lifestealRate) setLifestealRate += b.lifestealRate;
        if (b.dodgeRate) setDodgeRate += b.dodgeRate;
        if (b.damageMultRatio) setDamageMultRatio += b.damageMultRatio;
        if (b.hasteBonus) setHaste += b.hasteBonus;
      }
    }

    // 全身强化共鸣加成
    if (slotEnhancements) {
      const resonance = getActiveResonance(slotEnhancements);
      if (resonance) {
        setDcMult += resonance.dcMult;
        setAcMult += resonance.acMult;
        setHpMult += resonance.hpMult;
        if (resonance.lifestealRate) setLifestealRate += resonance.lifestealRate;
        if (resonance.defenseIgnoreRate) addDefenseIgnore += resonance.defenseIgnoreRate;
        if (resonance.damageMultRatio) addDamageMult += resonance.damageMultRatio;
      }
    }

    let maxHp = Math.floor((baseStats.maxHp + addHp) * (1 + setHpMult));
    let maxMp = baseStats.maxMp + addMp;
    let minDC = Math.floor((baseStats.minDC + addMinDC) * (1 + setDcMult));
    let maxDC = Math.floor((baseStats.maxDC + addMaxDC) * (1 + setDcMult));
    let minAC = Math.floor((baseStats.minAC + addMinAC) * (1 + setAcMult));
    let maxAC = Math.floor((baseStats.maxAC + addMaxAC) * (1 + setAcMult));

    const critRate = Math.min(0.95, baseStats.critRate + addCritBonus / 100 + setCritRate);
    const haste = baseStats.haste + addHasteBonus + setHaste;
    const dodgeRate = Math.min(0.50, baseStats.dodgeRate + setDodgeRate);
    const critMult = baseStats.critMult;
    const lifestealRate = Number((baseStats.lifestealRate + addLifestealBonus / 100 + setLifestealRate).toFixed(3));
    const luck = baseStats.luck + addLuck;
    const damageMultRatio = Number((baseStats.damageMultRatio + setDamageMultRatio + addDamageMult).toFixed(2));
    const defenseIgnoreRate = Number((baseStats.defenseIgnoreRate + addDefenseIgnore).toFixed(2));

    // 有效出手间隔：最低 2 ticks (200ms 一刀，极速如风)
    const effectiveAttackInterval = Math.max(
      2, 
      Math.floor((baseStats.baseAttackInterval * 100) / (100 + haste))
    );

    // 攻速溢出转化机制 (方案 A: 风雷残影·连击斩)
    const overflowHaste = Math.max(0, haste - 34);
    const phantomStrikeRate = overflowHaste > 0 ? Number((overflowHaste * 0.015).toFixed(3)) : 0;

    let enhancementScore = 0;
    if (slotEnhancements) {
      for (const lvl of Object.values(slotEnhancements)) {
        if (lvl) enhancementScore += lvl * 250;
      }
    }

    const midDC = (minDC + maxDC) / 2;
    const midAC = (minAC + maxAC) / 2;
    const combatPower = Math.floor(
      (midDC * 3.8 + 
      midAC * 2.8 + 
      maxHp * 0.45 + 
      maxMp * 0.25 + 
      critRate * 1600 + 
      (critMult - 1) * 200 +
      dodgeRate * 1400 +
      lifestealRate * 2500 +
      haste * 12 +
      phantomStrikeRate * 2000 +
      luck * 1500 +
      enhancementScore +
      baseStats.level * 35) * (1 + damageMultRatio)
    );

    return {
      ...baseStats,
      ascensionTier: baseStats.ascensionTier,
      luck,
      damageMultRatio,
      defenseIgnoreRate,
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
      lifestealRate,
      effectiveAttackInterval,
      phantomStrikeRate,
      combatPower
    };
  }

  /**
   * 计算单件装备战力评分 (深度计入阶数、特戒神技、幸运、倍攻、破甲与套装)
   */
  static getItemCombatPower(item: ItemInstance): number {
    if (item.type !== 'equipment') return 0;
    const midDC = (item.minDC + item.maxDC) / 2;
    const midAC = (item.minAC + item.maxAC) / 2;
    const tierBonus = (item.tier || 0) * 1500;
    const specialBonus = item.specialEffect ? 2500 : 0;
    const setBonus = item.setName ? 600 : 0;
    const luckBonus = (item.luck || 0) * 800 + (item.specialEffect === 'luck' ? 2400 : 0);
    const damageMultBonus = (item.damageMultRatio || 0) * 5000;
    const defenseIgnoreBonus = (item.defenseIgnoreRate || 0) * 3000;

    return Math.floor(
      midDC * 3.8 +
      midAC * 2.8 +
      (item.maxHp || 0) * 0.45 +
      (item.maxMp || 0) * 0.25 +
      (item.critBonus || 0) * 15 +
      (item.hasteBonus || 0) * 12 +
      (item.lifestealBonus || 0) * 45 +
      (item.quality || 0) * 35 +
      tierBonus +
      specialBonus +
      setBonus +
      luckBonus +
      damageMultBonus +
      defenseIgnoreBonus
    );
  }
}
