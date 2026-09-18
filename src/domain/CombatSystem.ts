import { Entity, SkillDef } from '../types/game';

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isHit: boolean;
  isDodge?: boolean;
  skillUsed?: SkillDef;
  isCleave?: boolean;
}

export class CombatSystem {
  private static randomBetween(min: number, max: number): number {
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 执行单次攻击计算 (遵循 Crystal / Mir2 经典规则，全面提升爽快打击手感)
   */
  static calculateAttack(
    attacker: Entity, 
    defender: Entity, 
    skill?: SkillDef,
    isSecondaryCleave = false
  ): CombatResult {
    // 0. 目标物理闪避判定 (触发闪避造成 0 伤害并判定 MISS)
    const dodgeRate = defender.stats.dodgeRate || 0;
    if (Math.random() < dodgeRate) {
      return {
        damage: 0,
        isCrit: false,
        isHit: false,
        isDodge: true,
        skillUsed: skill,
        isCleave: isSecondaryCleave
      };
    }

    // 1. 基础攻击力投掷 (DC 浮动与经典幸运运9机制)
    // 幸运 >= 9 时，刀刀恒定发挥 maxDC 最大攻击上限！
    let rawDC: number;
    const luck = attacker.stats.luck || 0;
    if (luck >= 9) {
      rawDC = attacker.stats.maxDC;
    } else if (luck > 0 && Math.random() < luck * 0.1) {
      rawDC = attacker.stats.maxDC;
    } else {
      rawDC = this.randomBetween(attacker.stats.minDC, attacker.stats.maxDC);
    }

    // 2. 技能加成乘数 (顺劈次要目标造成 60% 溅射伤害)
    let skillMultiplier = skill ? skill.damageMult : 1.0;
    if (isSecondaryCleave) {
      skillMultiplier *= 0.6;
    }
    let attackPower = Math.floor(rawDC * skillMultiplier);

    // 3. 目标防御抵扣 (AC 浮动与破甲机制)
    // 刺杀剑术与开天斩无视目标护甲防御；其他攻击扣减防御
    if (!skill || (skill.id !== 'assassinate' && skill.id !== 'heaven_splitter')) {
      let targetAC = this.randomBetween(defender.stats.minAC, defender.stats.maxAC);
      if (attacker.stats.defenseIgnoreRate && attacker.stats.defenseIgnoreRate > 0) {
        targetAC = Math.floor(targetAC * (1 - Math.min(1.0, attacker.stats.defenseIgnoreRate)));
      }
      attackPower = Math.max(isSecondaryCleave ? 5 : 8, attackPower - targetAC);
    }

    // 4. 暴击判定与倍率放大 (逐日剑法必定暴击)
    const isCrit = skill?.id === 'sun_slash' || Math.random() < attacker.stats.critRate;
    if (isCrit) {
      attackPower = Math.floor(attackPower * (attacker.stats.critMult || 1.6));
    }

    // 烈火剑法与逐日剑法特殊大招保底强化
    if (skill?.id === 'fire_slash') {
      attackPower = Math.floor(attackPower * 1.5);
    } else if (skill?.id === 'sun_slash') {
      attackPower = Math.floor(attackPower * 1.8);
    }

    // 5. 稀有倍攻独立乘区放大 (Damage Multiplier Ratio)
    if (attacker.stats.damageMultRatio && attacker.stats.damageMultRatio > 0) {
      attackPower = Math.floor(attackPower * (1 + attacker.stats.damageMultRatio));
    }

    const finalDamage = Math.max(1, attackPower);

    return {
      damage: finalDamage,
      isCrit,
      isHit: true,
      skillUsed: skill,
      isCleave: isSecondaryCleave
    };
  }

  static canAttack(entity: Entity, currentTick: number): boolean {
    return currentTick - entity.lastAttackTick >= entity.stats.effectiveAttackInterval;
  }
}
