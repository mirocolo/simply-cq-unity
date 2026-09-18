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

    // 2. 自动喝药判定 (每 1.2 秒 / 12 ticks 最多喝一次，防连续狂灌)
    if (currentTick - this.lastPotionTick >= 12) {
      const hpRatio = player.stats.hp / player.stats.maxHp;
      const mpRatio = player.stats.mp / player.stats.maxMp;

      if (config.autoHpPotion && hpRatio < config.autoPotionHpPercent / 100) {
        const hpPot = inventory.find(i => i.type === 'potion' && (i.recoverHp || 0) > 0);
        if (hpPot) {
          this.lastPotionTick = currentTick;
          return { type: 'use_potion', potionToUse: hpPot };
        }
      }

      if (config.autoMpPotion && mpRatio < config.autoPotionMpPercent / 100) {
        const mpPot = inventory.find(i => i.type === 'potion' && (i.recoverMp || 0) > 0);
        if (mpPot) {
          this.lastPotionTick = currentTick;
          return { type: 'use_potion', potionToUse: mpPot };
        }
      }
    }

    // 3. 如果玩家当前正在网格过渡移动中，等待当前步伐自然走完，不发起新位移打断
    if (player.targetGridPos) {
      return { type: 'none' };
    }

    // 4. 自动拾取附近掉落物 (6 格以内优先踩格拾取)
    if (config.autoPickup && groundItems.length > 0) {
      const nearItems = groundItems
        .map(item => ({ item, dist: PathFinder.chebyshevDistance(player.gridPos, item.gridPos) }))
        .filter(entry => entry.dist <= 6 && entry.dist > 0)
        .sort((a, b) => a.dist - b.dist);

      for (const entry of nearItems) {
        const path = PathFinder.findPath(player.gridPos, entry.item.gridPos, isWalkable, 80);
        if (path.length > 0) {
          return { type: 'move', targetPos: path[0] };
        }
      }
    }

    // 5. 索敌与战斗：获取所有活着的怪物并按距离由近及远排序
    const aliveMonsters = monsters
      .filter(m => m.state !== 'dead')
      .map(m => ({
        monster: m,
        dist: PathFinder.chebyshevDistance(player.gridPos, m.gridPos)
      }))
      .sort((a, b) => a.dist - b.dist);

    if (aliveMonsters.length === 0) {
      return { type: 'none' };
    }

    // 贴身贴脸 (距离 <= 1)，直接出手
    const closest = aliveMonsters[0];
    if (closest.dist <= 1) {
      let selectedSkill: SkillDef | undefined;
      if (config.autoSkill) {
        const fire = skills.find(s => s.id === 'fire_slash' && s.currentCdTicks === 0 && player.stats.mp >= s.manaCost);
        const assassinate = skills.find(s => s.id === 'assassinate' && s.currentCdTicks === 0 && player.stats.mp >= s.manaCost);
        const power = skills.find(s => s.id === 'power_slash' && s.currentCdTicks === 0 && player.stats.mp >= s.manaCost);
        selectedSkill = fire || assassinate || power;
      }

      return {
        type: 'attack',
        targetEntity: closest.monster,
        skillToUse: selectedSkill
      };
    }

    // 距离 > 1，遍历附近怪物列表，寻找首个可达目标顺畅走位靠近
    const effectiveRadius = Math.max(config.searchRadius, 25);
    for (const entry of aliveMonsters) {
      if (entry.dist > effectiveRadius) break;
      const path = PathFinder.findPath(player.gridPos, entry.monster.gridPos, isWalkable, 180);
      if (path.length > 0) {
        return {
          type: 'move',
          targetPos: path[0]
        };
      }
    }

    return { type: 'none' };
  }
}
