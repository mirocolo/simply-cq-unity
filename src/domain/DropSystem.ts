import { GroundItem, ItemInstance, ItemQuality } from '../types/game';
import { ITEM_DEFINITIONS } from './definitions/items';
import { MonsterTemplate } from './definitions/monsters';

export class DropSystem {
  private static instanceCounter = 0;

  private static generateId(): string {
    return `item_${Date.now()}_${++this.instanceCounter}`;
  }

  static rollQuality(isBoss = false, isElite = false): ItemQuality {
    const roll = Math.random();
    if (isBoss) {
      if (roll < 0.45) return 4; // 45% 传说橙神装！
      if (roll < 0.85) return 3; // 40% 史诗紫装
      return 2; // 15% 精良蓝
    }
    if (isElite) {
      if (roll < 0.16) return 4; // 16% 传说橙 (原 8%)
      if (roll < 0.56) return 3; // 40% 史诗紫 (原 27%)
      if (roll < 0.90) return 2; // 34% 精良蓝
      return 1; // 10% 优秀绿
    }
    if (roll < 0.05) return 3; // 5% 史诗紫
    if (roll < 0.20) return 2; // 15% 精良蓝
    if (roll < 0.50) return 1; // 30% 优秀绿
    return 0; // 50% 普通白
  }

  static createItemInstance(defId: string, forcedQuality?: ItemQuality, count = 1): ItemInstance | null {
    const def = ITEM_DEFINITIONS[defId];
    if (!def) return null;

    const quality = forcedQuality !== undefined ? forcedQuality : def.baseQuality;
    const qualityScale = [1.0, 1.3, 1.7, 2.3, 3.5][quality];
    const critBonus = (def.critBonus || 0) + [0, 2, 4, 8, 15][quality];
    const hasteBonus = (def.hasteBonus || 0) + [0, 3, 6, 12, 20][quality];
    // 高品质装备具有额外稀有生命吸血属性 (紫装 +1%，橙装 +2%)
    const lifestealBonus = (def.lifestealBonus || 0) + [0, 0, 0, 1, 2][quality];

    const minDC = Math.floor(def.minDC * qualityScale);
    const maxDC = Math.floor(def.maxDC * qualityScale);
    const minAC = Math.floor(def.minAC * qualityScale);
    const maxAC = Math.floor(def.maxAC * qualityScale);
    const maxHp = Math.floor(def.maxHp * qualityScale);
    const maxMp = Math.floor(def.maxMp * qualityScale);

    return {
      instanceId: this.generateId(),
      defId: def.id,
      name: def.name,
      type: def.type,
      slot: def.slot,
      tier: def.tier ?? 0,
      quality,
      minDC,
      maxDC,
      minAC,
      maxAC,
      maxHp,
      maxMp,
      critBonus,
      hasteBonus,
      lifestealBonus: lifestealBonus > 0 ? lifestealBonus : undefined,
      luck: def.luck,
      damageMultRatio: def.damageMultRatio,
      defenseIgnoreRate: def.defenseIgnoreRate,
      setName: def.setName,
      specialEffect: def.specialEffect,
      recoverHp: def.recoverHp,
      recoverMp: def.recoverMp,
      levelReq: def.levelReq,
      price: Math.floor(def.price * qualityScale),
      icon: def.icon,
      desc: def.desc,
      count
    };
  }

  static getBeamColor(quality: ItemQuality): string | null {
    switch (quality) {
      case 1: return '#22c55e'; // 绿光
      case 2: return '#3b82f6'; // 蓝光柱
      case 3: return '#a855f7'; // 紫色冲天光柱
      case 4: return '#f97316'; // 橙色烈焰神光柱
      default: return null;
    }
  }

  /**
   * 击杀怪物大爆：带大爆喷泉与初速度散落，以及高阶位面保底机制
   */
  static rollMonsterDrops(
    monster: MonsterTemplate, 
    deathPos: { x: number; y: number },
    currentTick: number,
    minTier = 0
  ): GroundItem[] {
    const dropped: GroundItem[] = [];

    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
      { x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }
    ];

    let offsetIdx = 0;

    for (const loot of monster.lootTable) {
      if (Math.random() <= loot.chance) {
        const quality = this.rollQuality(monster.isBoss, monster.isElite);
        const count = loot.minCount 
          ? Math.floor(Math.random() * (loot.maxCount! - loot.minCount + 1)) + loot.minCount 
          : 1;

        const item = this.createItemInstance(loot.defId, quality, count);
        if (item) {
          // 智能阶数保底：绝不掉落低于当前位面阶数的低阶装备 (木剑/布衣彻底淘汰)
          if (minTier > 0 && item.type === 'equipment' && item.tier < minTier) {
            continue;
          }

          const off = offsets[offsetIdx % offsets.length];
          offsetIdx++;

          dropped.push({
            id: `ground_${this.generateId()}`,
            item,
            gridPos: { x: deathPos.x + off.x, y: deathPos.y + off.y },
            dropTick: currentTick,
            beamColor: this.getBeamColor(item.quality),
            burstOrigin: { x: deathPos.x, y: deathPos.y },
            burstProgress: 0 // 开始喷泉起跳
          });
        }
      }
    }

    // 高阶飞升位面专属掉落 (动态掉落当前阶数的高级装备与套装)
    if (minTier > 0 && (monster.isBoss || monster.isElite || Math.random() < 0.20)) {
      const tierEquipDefs = Object.values(ITEM_DEFINITIONS).filter(
        d => d.type === 'equipment' && d.tier === minTier
      );
      if (tierEquipDefs.length > 0) {
        const rollChance = monster.isBoss ? 0.85 : (monster.isElite ? 0.45 : 0.20);
        if (Math.random() < rollChance) {
          const randomDef = tierEquipDefs[Math.floor(Math.random() * tierEquipDefs.length)];
          const quality = this.rollQuality(monster.isBoss, monster.isElite);
          const bonusItem = this.createItemInstance(randomDef.id, quality, 1);
          if (bonusItem) {
            const off = offsets[offsetIdx % offsets.length];
            offsetIdx++;
            dropped.push({
              id: `ground_${this.generateId()}`,
              item: bonusItem,
              gridPos: { x: deathPos.x + off.x, y: deathPos.y + off.y },
              dropTick: currentTick,
              beamColor: this.getBeamColor(bonusItem.quality),
              burstOrigin: { x: deathPos.x, y: deathPos.y },
              burstProgress: 0
            });
          }
        }
      }
    }

    return dropped;
  }
}
