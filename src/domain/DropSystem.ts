import { GroundItem, ItemInstance, ItemQuality } from '../types/game';
import { ITEM_DEFINITIONS } from './definitions/items';
import { MonsterTemplate } from './definitions/monsters';

export class DropSystem {
  private static instanceCounter = 0;

  /**
   * 生成唯一物品 ID
   */
  private static generateId(): string {
    return `item_${Date.now()}_${++this.instanceCounter}`;
  }

  /**
   * 根据怪物类型投掷品质等级 (0白 ~ 4橙)
   */
  static rollQuality(isBoss = false, isElite = false): ItemQuality {
    const roll = Math.random();
    if (isBoss) {
      if (roll < 0.25) return 4; // 25% 传说橙
      if (roll < 0.70) return 3; // 45% 史诗紫
      return 2; // 30% 精良蓝
    }
    if (isElite) {
      if (roll < 0.05) return 4; // 5% 传说橙
      if (roll < 0.30) return 3; // 25% 史诗紫
      if (roll < 0.75) return 2; // 45% 精良蓝
      return 1; // 25% 优秀绿
    }
    // 普通小怪
    if (roll < 0.02) return 3; // 2% 史诗紫
    if (roll < 0.10) return 2; // 8% 精良蓝
    if (roll < 0.35) return 1; // 25% 优秀绿
    return 0; // 65% 普通白
  }

  /**
   * 根据品质强化装备属性与随机词条
   */
  static createItemInstance(defId: string, forcedQuality?: ItemQuality, count = 1): ItemInstance | null {
    const def = ITEM_DEFINITIONS[defId];
    if (!def) return null;

    const quality = forcedQuality !== undefined ? forcedQuality : def.baseQuality;

    // 品质属性词条加成系数
    const qualityScale = [0, 1.2, 1.5, 2.0, 3.0][quality];
    const critBonus = (def.critBonus || 0) + [0, 1, 3, 6, 12][quality];
    const hasteBonus = (def.hasteBonus || 0) + [0, 2, 5, 9, 16][quality];

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

  /**
   * 获取品质对应的冲天光柱颜色
   */
  static getBeamColor(quality: ItemQuality): string | null {
    switch (quality) {
      case 1: return '#22c55e'; // 绿光
      case 2: return '#3b82f6'; // 蓝光柱
      case 3: return '#a855f7'; // 紫色冲天光柱
      case 4: return '#f97316'; // 橙色神话烈焰柱
      default: return null;     // 白装无光柱
    }
  }

  /**
   * 怪物击杀爆装逻辑：九宫格向四周散落掉落物
   */
  static rollMonsterDrops(
    monster: MonsterTemplate, 
    deathPos: { x: number; y: number },
    currentTick: number
  ): GroundItem[] {
    const dropped: GroundItem[] = [];

    // 九宫格散落偏移列表
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }
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
            beamColor: this.getBeamColor(item.quality)
          });
        }
      }
    }

    return dropped;
  }
}
