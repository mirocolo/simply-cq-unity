import { Entity, SkillDef } from '../types/game';

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isHit: boolean;
  skillUsed?: SkillDef;
}

export class CombatSystem {
  /**
   * 随机区间整数 (含上下界)
   */
  private static randomBetween(min: number, max: number): number {
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 执行单次攻击计算 (遵循 Crystal / Mir2 经典规则)
   */
  static calculateAttack(
    attacker: Entity, 
    defender: Entity, 
    skill?: SkillDef
  ): CombatResult {
    // 1. 基础攻击力投掷 (DC 浮动)
    const rawDC = this.randomBetween(attacker.stats.minDC, attacker.stats.maxDC);

    // 2. 技能加成乘数
    const skillMultiplier = skill ? skill.damageMult : 1.0;
    let attackPower = Math.floor(rawDC * skillMultiplier);

    // 3. 目标防御抵扣 (AC 浮动)
    // 若是刺杀剑术 (assassinate)，具有无视防御穿透特性
    if (!skill || skill.id !== 'assassinate') {
      const targetAC = this.randomBetween(defender.stats.minAC, defender.stats.maxAC);
      attackPower = Math.max(1, attackPower - targetAC);
    }

    // 4. 暴击判定与倍率放大
    const isCrit = Math.random() < attacker.stats.critRate;
    if (isCrit) {
      attackPower = Math.floor(attackPower * attacker.stats.critMult);
    }

    // 确保至少造成 1 点保底伤害
    const finalDamage = Math.max(1, attackPower);

    return {
      damage: finalDamage,
      isCrit,
      isHit: true,
      skillUsed: skill
    };
  }

  /**
   * 检查实体是否能够进行下一次普攻/技能出手 (基于急速换算后的有效间隔)
   */
  static canAttack(entity: Entity, currentTick: number): boolean {
    return currentTick - entity.lastAttackTick >= entity.stats.effectiveAttackInterval;
  }
}
