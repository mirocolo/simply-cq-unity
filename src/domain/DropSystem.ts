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
      if (roll < 0.30) return 4; // 30% 传说橙
      if (roll < 0.75) return 3; // 45% 史诗紫
      return 2; // 25% 精良蓝
    }
    if (isElite) {
      if (roll < 0.08) return 4; // 8% 传说橙
      if (roll < 0.35) return 3; // 27% 史诗紫
      if (roll < 0.80) return 2; // 45% 精良蓝
      return 1; // 20% 优秀绿
    }
    if (roll < 0.03) return 3; // 3% 史诗紫
    if (roll < 0.15) return 2; // 12% 精良蓝
    if (roll < 0.45) return 1; // 30% 优秀绿
    return 0; // 55% 普通白
  }

  static createItemInstance(defId: string, forcedQuality?: ItemQuality, count = 1): ItemInstance | null {
    const def = ITEM_DEFINITIONS[defId];
    if (!def) return null;

    const quality = forcedQuality !== undefined ? forcedQuality : def.baseQuality;
    const qualityScale = [1.0, 1.3, 1.7, 2.3, 3.5][quality];
    const critBonus = (def.critBonus || 0) + [0, 2, 4, 8, 15][quality];
    const hasteBonus = (def.hasteBonus || 0) + [0, 3, 6, 12, 20][quality];

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
      quality,
      minDC,
      maxDC,
      minAC,
      maxAC,
      maxHp,
      maxMp,
      critBonus,
      hasteBonus,
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
   * 击杀怪物大爆：带大爆喷泉与初速度散落
   */
  static rollMonsterDrops(
    monster: MonsterTemplate, 
    deathPos: { x: number; y: number },
    currentTick: number
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

    return dropped;
  }
}
