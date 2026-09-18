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

    // 1. 基础攻击力投掷 (DC 浮动)
    const rawDC = this.randomBetween(attacker.stats.minDC, attacker.stats.maxDC);

    // 2. 技能加成乘数 (顺劈次要目标造成 60% 溅射伤害)
    let skillMultiplier = skill ? skill.damageMult : 1.0;
    if (isSecondaryCleave) {
      skillMultiplier *= 0.6;
    }
    let attackPower = Math.floor(rawDC * skillMultiplier);

    // 3. 目标防御抵扣 (AC 浮动)
    // 刺杀剑术无视防御；其他攻击扣减防御，保底留存
    if (!skill || skill.id !== 'assassinate') {
      const targetAC = this.randomBetween(defender.stats.minAC, defender.stats.maxAC);
      attackPower = Math.max(isSecondaryCleave ? 5 : 8, attackPower - targetAC);
    }

    // 4. 暴击判定与倍率放大 (狂暴状态下额外提高 15% 暴击率)
    const isCrit = Math.random() < attacker.stats.critRate;
    if (isCrit) {
      attackPower = Math.floor(attackPower * (attacker.stats.critMult || 1.6));
    }

    // 烈火剑法大招保底翻倍
    if (skill?.id === 'fire_slash') {
      attackPower = Math.floor(attackPower * 1.5);
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
