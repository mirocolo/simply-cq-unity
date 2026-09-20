import { Entity, SkillDef } from '../types/game';

export interface CombatResult {
  damage: number;
  isCrit: boolean;
  isHit: boolean;
  isDodge?: boolean;
  skillUsed?: SkillDef;
  isCleave?: boolean;
  phantomStrikes?: number;
  extraTrueDamage?: number;
  reflectedDamage?: number;
}

export class CombatSystem {
  private static randomBetween(min: number, max: number): number {
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 执行单次攻击计算 (遵循 Crystal / Mir2 经典规则，融入护甲吸收、防暴毙护盾、多阶残影与运9/运10)
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
    let rawDC: number;
    const luck = attacker.stats.luck || 0;
    if (luck >= 9) {
      // 运9极境：刀刀恒定发挥 maxDC 最大攻击上限！
      rawDC = attacker.stats.maxDC;
    } else if (luck > 0 && Math.random() < luck * 0.1) {
      rawDC = attacker.stats.maxDC;
    } else if (luck < 0 && Math.random() < Math.min(0.8, Math.abs(luck) * 0.12)) {
      // 诅咒武器 (幸运为负)：大概率发挥 minDC 下限攻击
      rawDC = attacker.stats.minDC;
    } else {
      rawDC = this.randomBetween(attacker.stats.minDC, attacker.stats.maxDC);
    }

    // 2. 技能加成乘数 (顺劈次要目标造成 60% 溅射伤害)
    let skillMultiplier = skill ? skill.damageMult : 1.0;
    if (isSecondaryCleave) {
      skillMultiplier *= 0.6;
    }
    let attackPower = Math.floor(rawDC * skillMultiplier);

    // 3. 目标防御抵扣 (AC 浮动、破甲与护甲减伤)
    let targetAC = this.randomBetween(defender.stats.minAC, defender.stats.maxAC);
    
    // 刺杀剑术穿透 45% 护甲，开天斩穿透 55% 护甲
    if (skill?.id === 'assassinate') {
      targetAC = Math.floor(targetAC * (1 - 0.45));
    } else if (skill?.id === 'heaven_splitter') {
      targetAC = Math.floor(targetAC * (1 - 0.55));
    }

    // 人物/怪物破甲率抵扣
    if (attacker.stats.defenseIgnoreRate && attacker.stats.defenseIgnoreRate > 0) {
      targetAC = Math.floor(targetAC * (1 - Math.min(1.0, attacker.stats.defenseIgnoreRate)));
    }

    // 扣减防御后基础物理攻击
    attackPower = Math.max(isSecondaryCleave ? 5 : 8, attackPower - targetAC);

    // 如果受击者是玩家：引入百分比护甲吸收与防猝死保护，彻底根除高阶Boss秒杀("疯狂暴毙")
    if (defender.isPlayer) {
      const playerAC = Math.max(1, targetAC);
      // 护甲百分比吸收曲线：最多减免 70% 伤害
      const armorMitigation = Math.min(0.70, playerAC / (playerAC + 120 + (attacker.stats.level || 1) * 3));
      attackPower = Math.floor(attackPower * (1 - armorMitigation));

      // 护体神盾常驻被动：全域减伤 15%
      if (defender.stats.hasAegisPassive) {
        attackPower = Math.floor(attackPower * 0.85);
      }

      // 护体神盾主动过载：玄金罡气爆发减免 45%
      const hasAegisActiveBuff = Boolean(defender.shieldAegisTicks && defender.shieldAegisTicks > 0);
      if (hasAegisActiveBuff) {
        attackPower = Math.floor(attackPower * 0.55);
      }
    }

    // 4. 暴击判定与倍率放大 (逐日剑法必定暴击)
    const isCrit = skill?.id === 'sun_slash' || Math.random() < attacker.stats.critRate;
    if (isCrit) {
      attackPower = Math.floor(attackPower * (attacker.stats.critMult || 1.6));
    }

    // 5. 稀有倍攻独立乘区放大 (Damage Multiplier Ratio)
    if (attacker.stats.damageMultRatio && attacker.stats.damageMultRatio > 0) {
      attackPower = Math.floor(attackPower * (1 + attacker.stats.damageMultRatio));
    }

    // 运9神圣真伤加成 (+20% 额外终伤)
    if (luck >= 9) {
      attackPower = Math.floor(attackPower * 1.20);
    }

    // 6. 急速溢出转化为多段风雷残影与风雷真伤
    let phantomStrikes = 0;
    let extraTrueDamage = 0;
    const haste = attacker.stats.haste || 0;
    if (haste > 34) {
      // 风雷真伤 (无视所有护甲与减免)
      extraTrueDamage = Math.floor((haste - 34) * 2.5);

      // 多阶残影连击触发判定
      if (Math.random() < Math.min(1.0, (haste - 34) * 0.02)) {
        phantomStrikes = 1;
      }
      if (haste > 60 && Math.random() < Math.min(0.75, (haste - 60) * 0.015)) {
        phantomStrikes = 2;
      }
      if (haste > 90 && Math.random() < Math.min(0.50, (haste - 90) * 0.01)) {
        phantomStrikes = 3;
      }
    }

    // 7. 护体神盾反震计算 (过载期间反弹 30% 伤害给攻击者)
    let reflectedDamage = 0;
    if (defender.isPlayer) {
      const hasAegisActiveBuff = Boolean(defender.shieldAegisTicks && defender.shieldAegisTicks > 0);
      if (hasAegisActiveBuff) {
        reflectedDamage = Math.floor(attackPower * 0.30);
      }
    }

    let finalDamage = Math.max(1, attackPower);

    // 人物防猝死安全底线 (Anti-Burst Failsafe)：
    // 即使 Boss 发生暴击或倍攻狂暴，单次伤害也绝不允许超过玩家最大生命的 35% (防疯狂暴毙)
    if (defender.isPlayer) {
      const antiBurstCap = Math.max(50, Math.floor(defender.stats.maxHp * 0.35));
      finalDamage = Math.min(finalDamage, antiBurstCap);
    }

    return {
      damage: finalDamage,
      isCrit,
      isHit: true,
      skillUsed: skill,
      isCleave: isSecondaryCleave,
      phantomStrikes,
      extraTrueDamage,
      reflectedDamage
    };
  }

  static canAttack(entity: Entity, currentTick: number): boolean {
    return currentTick - entity.lastAttackTick >= entity.stats.effectiveAttackInterval;
  }
}

