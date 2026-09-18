import { AutoPilotConfig, Entity, GroundItem, ItemInstance, SkillDef } from '../types/game';
import { PortalDef } from '../types/map';
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
    isWalkable: (x: number, y: number) => boolean,
    portals?: PortalDef[]
  ): AutoPilotAction {
    if (!config.enabled || player.state === 'dead') {
      return { type: 'none' };
    }

    // 1. 手操让位检测 (1200ms 内有玩家手操则不自动干预)
    if (Date.now() - this.lastManualTimestamp < 1200) {
      return { type: 'none' };
    }

    // 2. 自动喝药判定 (每 0.6 秒 / 6 ticks 最多喝一次，提高急救响应)
    if (currentTick - this.lastPotionTick >= 6) {
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
      const isBagFull = inventory.length >= 40;
      const nearItems = groundItems
        .map(item => ({ item, dist: PathFinder.chebyshevDistance(player.gridPos, item.gridPos) }))
        .filter(entry => {
          if (entry.dist > 6 || entry.dist <= 0) return false;
          // 若背包已满 40 格，过滤掉无法入包的物品（除已有的可堆叠药水外），避免在满包掉落物周围来回抽搐卡死
          if (isBagFull) {
            if (entry.item.item.type === 'potion' || entry.item.item.type === 'material') {
              return inventory.some(i => i.defId === entry.item.item.defId);
            }
            return false;
          }
          return true;
        })
        .sort((a, b) => a.dist - b.dist);

      for (const entry of nearItems) {
        const path = PathFinder.findPath(player.gridPos, entry.item.gridPos, isWalkable, 80);
        if (path.length > 0) {
          return { type: 'move', targetPos: path[0] };
        }
      }
    }

    // 5. 智能索敌与战斗：避开远超自身等级的怪与未成长时的Boss
    const playerLevel = player.stats.level;
    const safeCandidates = monsters.filter(m => {
      if (m.state === 'dead') return false;
      // 若玩家等级较低（低于Boss 8级以上），且未手操主动攻击过Boss，挂机绝不主动招惹Boss
      if (m.isBoss && playerLevel < m.stats.level - 8 && !m.hasBeenAttackedByPlayer) {
        return false;
      }
      // 避免跨 10 级以上刷怪送死
      if (m.stats.level > playerLevel + 10 && !m.hasBeenAttackedByPlayer) {
        return false;
      }
      return true;
    });

    const availableMonsters = safeCandidates.length > 0 
      ? safeCandidates 
      : monsters.filter(m => m.state !== 'dead');

    if (availableMonsters.length === 0) {
      // 破境推图模式：若图内无野怪，自动寻找可进入的下层传送门前往破境
      if (config.progressionMode && portals && portals.length > 0) {
        const eligiblePortals = portals.filter(p => 
          p.requiredTier <= (player.stats.ascensionTier || 0) &&
          p.requiredLevel <= player.stats.level
        );
        if (eligiblePortals.length > 0) {
          const path = PathFinder.findPath(player.gridPos, eligiblePortals[0].pos, isWalkable, 180);
          if (path.length > 0) {
            return { type: 'move', targetPos: path[0] };
          }
        }
      }
      return { type: 'none' };
    }

    const aliveMonsters = availableMonsters
      .map(m => {
        const dist = PathFinder.chebyshevDistance(player.gridPos, m.gridPos);
        const levelDiff = Math.abs(m.stats.level - playerLevel);
        const score = dist * 2 + levelDiff * 1.2;
        return { monster: m, dist, score };
      })
      .sort((a, b) => a.score - b.score);

    // 贴身贴脸 (距离 <= 1)，直接出手
    const closest = aliveMonsters[0];
    if (closest.dist <= 1) {
      let selectedSkill: SkillDef | undefined;
      if (config.autoSkill) {
        // 1. 若受到威胁且护体神盾可用，优先开启护体神盾
        const shield = skills.find(s => 
          s.id === 'shield_aegis' && 
          s.currentCdTicks === 0 && 
          player.stats.mp >= s.manaCost && 
          player.stats.level >= s.unlockLevel && 
          (!player.shieldAegisTicks || player.shieldAegisTicks <= 0) && 
          player.stats.hp < player.stats.maxHp * 0.85
        );

        // 2. 挑选最高伤害倍率的可用攻击技能 (逐日 > 烈火 > 开天 > 刺杀 > 攻杀)
        const attackSkills = skills
          .filter(s => 
            s.id !== 'basic_slash' && 
            s.id !== 'shield_aegis' && 
            s.currentCdTicks === 0 && 
            player.stats.mp >= s.manaCost && 
            player.stats.level >= s.unlockLevel
          )
          .sort((a, b) => b.damageMult - a.damageMult);

        selectedSkill = shield || attackSkills[0];
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
