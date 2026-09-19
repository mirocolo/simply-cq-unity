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
      if (roll < 0.18) return 4; // 18% 传说橙神装 (原 45%)
      if (roll < 0.50) return 3; // 32% 史诗紫装
      return 2; // 50% 精良蓝
    }
    if (isElite) {
      if (roll < 0.05) return 4; // 5% 传说橙 (原 16%)
      if (roll < 0.25) return 3; // 20% 史诗紫 (原 40%)
      if (roll < 0.70) return 2; // 45% 精良蓝
      return 1; // 30% 优秀绿
    }
    if (roll < 0.01) return 3; // 1% 史诗紫 (原 5%)
    if (roll < 0.06) return 2; // 5% 精良蓝 (原 15%)
    if (roll < 0.30) return 1; // 24% 优秀绿 (原 30%)
    return 0; // 70% 普通白
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
   * 击杀怪物大爆：带大爆喷泉与初速度散落，以及高阶位面保底与阶数锁止机制
   */
  static rollMonsterDrops(
    monster: MonsterTemplate, 
    deathPos: { x: number; y: number },
    currentTick: number,
    playerTier = 0
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
        const itemDef = ITEM_DEFINITIONS[loot.defId];
        const rolledQuality = this.rollQuality(monster.isBoss, monster.isElite);
        // 特戒与橙色神器坚守其至高专属品质，不向下劣变
        const quality = (itemDef ? Math.max(itemDef.baseQuality || 0, rolledQuality) : rolledQuality) as ItemQuality;
        const count = loot.minCount 
          ? Math.floor(Math.random() * (loot.maxCount! - loot.minCount + 1)) + loot.minCount 
          : 1;

        const item = this.createItemInstance(loot.defId, quality, count);
        if (item) {
          // 严格阶数锁止：绝不掉落高于人物飞升阶数的装备！
          if (item.type === 'equipment') {
            if (item.tier > playerTier) {
              continue; // 越阶装备坚决禁止掉落
            }
            // 阶数保底过滤：飞升后淘汰过于落后的低阶垃圾装备 (例如2转不再掉0阶)
            if (playerTier > 0 && item.tier < Math.max(0, playerTier - 1)) {
              continue;
            }
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

    // 高阶飞升位面专属掉落 (动态掉落不高于当前阶数的高级装备与套装)
    if (playerTier > 0 && (monster.isBoss || monster.isElite || Math.random() < 0.08)) {
      const tierEquipDefs = Object.values(ITEM_DEFINITIONS).filter(
        d => d.type === 'equipment' && d.tier <= playerTier && d.tier >= Math.max(0, playerTier - 1)
      );
      if (tierEquipDefs.length > 0) {
        const rollChance = monster.isBoss ? 0.30 : (monster.isElite ? 0.15 : 0.05);
        if (Math.random() < rollChance) {
          const randomDef = tierEquipDefs[Math.floor(Math.random() * tierEquipDefs.length)];
          const quality = this.rollQuality(monster.isBoss, monster.isElite);
          const bonusItem = this.createItemInstance(randomDef.id, quality, 1);
          if (bonusItem && bonusItem.tier <= playerTier) {
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
