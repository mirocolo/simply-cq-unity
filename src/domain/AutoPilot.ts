import { AutoPilotConfig, Entity, GroundItem, ItemInstance, SkillDef } from '../types/game';
import { PathFinder } from './PathFinder';

export interface AutoPilotAction {
  type: 'move' | 'attack' | 'use_potion' | 'none';
  targetPos?: { x: number; y: number };
  targetEntity?: Entity;
  skillToUse?: SkillDef;
  potionToUse?: ItemInstance;
}

export class AutoPilot {
  private lastManualTimestamp = 0;
  private lastPotionTick = 0;

  /**
   * 记录玩家手操动作时间，挂机进入避让让位状态 (1.2秒)
   */
  recordManualAction(): void {
    this.lastManualTimestamp = Date.now();
  }

  /**
   * 挂机每 Tick 决策核心
   */
  decide(
    player: Entity,
    monsters: Entity[],
    groundItems: GroundItem[],
    inventory: ItemInstance[],
    skills: SkillDef[],
    config: AutoPilotConfig,
    currentTick: number,
    isWalkable: (x: number, y: number) => boolean
  ): AutoPilotAction {
    if (!config.enabled || player.state === 'dead') {
      return { type: 'none' };
    }

    // 1. 手操让位检测 (1200ms 内有玩家手操则不自动干预)
    if (Date.now() - this.lastManualTimestamp < 1200) {
      return { type: 'none' };
    }

    // 2. 自动喝药判定 (每 1.5 秒 / 15 ticks 最多喝一次，防连续狂灌)
    if (currentTick - this.lastPotionTick >= 15) {
      const hpRatio = player.stats.hp / player.stats.maxHp;
      const mpRatio = player.stats.mp / player.stats.maxMp;

      if (hpRatio < config.autoPotionHpPercent / 100) {
        const hpPot = inventory.find(i => i.type === 'potion' && (i.recoverHp || 0) > 0);
        if (hpPot) {
          this.lastPotionTick = currentTick;
          return { type: 'use_potion', potionToUse: hpPot };
        }
      }

      if (mpRatio < config.autoPotionMpPercent / 100) {
        const mpPot = inventory.find(i => i.type === 'potion' && (i.recoverMp || 0) > 0);
        if (mpPot) {
          this.lastPotionTick = currentTick;
          return { type: 'use_potion', potionToUse: mpPot };
        }
      }
    }

    // 3. 自动拾取附近掉落物 (5 格以内优先踩格拾取)
    if (config.autoPickup && groundItems.length > 0) {
      let nearestItem: GroundItem | null = null;
      let minItemDist = 6;

      for (const item of groundItems) {
        const dist = PathFinder.chebyshevDistance(player.gridPos, item.gridPos);
        if (dist < minItemDist) {
          minItemDist = dist;
          nearestItem = item;
        }
      }

      if (nearestItem) {
        // 如果就在脚下，已经触发拾取；如果在周围，走过去
        if (minItemDist > 0) {
          const path = PathFinder.findPath(player.gridPos, nearestItem.gridPos, isWalkable, 100);
          if (path.length > 0) {
            return { type: 'move', targetPos: path[0] };
          }
        }
      }
    }

    // 4. 索敌与锁定最近活动怪物
    let targetMonster: Entity | null = null;
    let minMonsterDist = config.searchRadius + 1;

    for (const m of monsters) {
      if (m.state === 'dead') continue;
      const dist = PathFinder.chebyshevDistance(player.gridPos, m.gridPos);
      if (dist < minMonsterDist) {
        minMonsterDist = dist;
        targetMonster = m;
      }
    }

    if (!targetMonster) {
      return { type: 'none' };
    }

    // 5. 战斗与位移判定
    const distToTarget = PathFinder.chebyshevDistance(player.gridPos, targetMonster.gridPos);

    // 贴身贴脸 (距离 <= 1)，直接出手
    if (distToTarget <= 1) {
      // 检查技能释放优先级：烈火(高爆发) -> 刺杀(破防) -> 攻杀 -> 普攻
      let selectedSkill: SkillDef | undefined;
      if (config.autoSkill) {
        const fire = skills.find(s => s.id === 'fire_slash' && s.currentCdTicks === 0 && player.stats.mp >= s.manaCost);
        const assassinate = skills.find(s => s.id === 'assassinate' && s.currentCdTicks === 0 && player.stats.mp >= s.manaCost);
        const power = skills.find(s => s.id === 'power_slash' && s.currentCdTicks === 0 && player.stats.mp >= s.manaCost);
        selectedSkill = fire || assassinate || power;
      }

      return {
        type: 'attack',
        targetEntity: targetMonster,
        skillToUse: selectedSkill
      };
    }

    // 距离 > 1，寻路靠近
    const path = PathFinder.findPath(player.gridPos, targetMonster.gridPos, isWalkable, 150);
    if (path.length > 0) {
      return {
        type: 'move',
        targetPos: path[0]
      };
    }

    return { type: 'none' };
  }
}
