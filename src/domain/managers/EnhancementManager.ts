import { EquipSlot, Entity, ItemInstance } from '../../types/game';
import { ENHANCEABLE_SLOTS, MAX_ENHANCE_LEVEL, ENHANCE_COSTS } from '../definitions/enhancement';

export interface EnhancementManagerCallbacks {
  getPlayer: () => Entity;
  getInventory: () => ItemInstance[];
  recalculatePlayerStats: () => void;
  onSound?: (name: 'hit' | 'crit' | 'levelup') => void;
  setScreenShake: (val: number) => void;
  addDamagePopup: (gridPos: { x: number; y: number }, text: string, color: string, isCrit?: boolean) => void;
  addBattleLog: (text: string, type: 'kill' | 'drop' | 'system' | 'damage') => void;
}

export class EnhancementManager {
  public slotEnhancements: Partial<Record<EquipSlot, number>> = {};
  public slotEnhancePity: Partial<Record<EquipSlot, number>> = {};

  constructor(private callbacks: EnhancementManagerCallbacks) {}

  getMaterialCount(defId: string): number {
    const inv = this.callbacks.getInventory();
    const it = inv.find(i => i.defId === defId);
    return it ? (it.count || 1) : 0;
  }

  consumeMaterial(defId: string, count: number): boolean {
    if (count <= 0) return true;
    const inv = this.callbacks.getInventory();
    const it = inv.find(i => i.defId === defId);
    if (!it || (it.count || 1) < count) return false;
    it.count = (it.count || 1) - count;
    if (it.count <= 0) {
      const idx = inv.indexOf(it);
      if (idx !== -1) inv.splice(idx, 1);
    }
    return true;
  }

  canAffordEnhance(slot: EquipSlot): { can: boolean; reason?: string; cost?: (typeof ENHANCE_COSTS)[number] } {
    if (!ENHANCEABLE_SLOTS.includes(slot)) {
      return { can: false, reason: '该部位不支持强化！' };
    }

    const currentLevel = this.slotEnhancements[slot] || 0;
    if (currentLevel >= MAX_ENHANCE_LEVEL) {
      return { can: false, reason: '该部位已达到当前最高强化等级(+15)！' };
    }

    const cost = ENHANCE_COSTS[currentLevel];
    if (!cost) {
      return { can: false, reason: '未找到强化消耗配置' };
    }

    const player = this.callbacks.getPlayer();
    if (player.stats.gold < cost.gold) {
      return { can: false, reason: `金币不足！需要 ${cost.gold.toLocaleString()} 金币`, cost };
    }

    const ironCount = this.getMaterialCount('mat_iron_ore');
    const pureCount = this.getMaterialCount('mat_pure_iron');
    const godCount = this.getMaterialCount('mat_god_stone');

    if (cost.ironOre > 0 && ironCount < cost.ironOre) {
      return { can: false, reason: `黑铁矿石不足！需要 ${cost.ironOre} 个（当前持有 ${ironCount} 个）`, cost };
    }
    if (cost.pureIron > 0 && pureCount < cost.pureIron) {
      return { can: false, reason: `纯黑玄铁不足！需要 ${cost.pureIron} 个（当前持有 ${pureCount} 个）`, cost };
    }
    if (cost.godStone > 0 && godCount < cost.godStone) {
      return { can: false, reason: `天工神石不足！需要 ${cost.godStone} 个（当前持有 ${godCount} 个）`, cost };
    }

    return { can: true, cost };
  }

  private executeSingleEnhanceStep(slot: EquipSlot, cost: (typeof ENHANCE_COSTS)[number]): boolean {
    const player = this.callbacks.getPlayer();
    player.stats.gold -= cost.gold;
    if (cost.ironOre > 0) this.consumeMaterial('mat_iron_ore', cost.ironOre);
    if (cost.pureIron > 0) this.consumeMaterial('mat_pure_iron', cost.pureIron);
    if (cost.godStone > 0) this.consumeMaterial('mat_god_stone', cost.godStone);

    const pity = this.slotEnhancePity[slot] || 0;
    const finalRate = Math.min(1.0, cost.baseSuccessRate + pity * 0.05);
    const isSuccess = Math.random() < finalRate;

    if (isSuccess) {
      this.slotEnhancements[slot] = (this.slotEnhancements[slot] || 0) + 1;
      this.slotEnhancePity[slot] = 0;
      return true;
    } else {
      this.slotEnhancePity[slot] = pity + 1;
      return false;
    }
  }

  enhanceSlot(slot: EquipSlot): { success: boolean; message: string; newLevel: number } {
    const check = this.canAffordEnhance(slot);
    const currentLevel = this.slotEnhancements[slot] || 0;
    if (!check.can || !check.cost) {
      return { success: false, message: check.reason || '无法强化', newLevel: currentLevel };
    }

    const slotNames: Record<string, string> = {
      weapon: '武器', armor: '衣服', helmet: '头盔', necklace: '项链',
      bracelet_l: '左手镯', bracelet_r: '右手镯', ring_l: '左戒指', ring_r: '右戒指'
    };
    const sName = slotNames[slot] || slot;

    const isSuccess = this.executeSingleEnhanceStep(slot, check.cost);
    const newLevel = this.slotEnhancements[slot] || 0;
    const player = this.callbacks.getPlayer();

    if (isSuccess) {
      this.callbacks.recalculatePlayerStats();
      this.callbacks.onSound?.('crit');
      this.callbacks.setScreenShake(12);

      this.callbacks.addDamagePopup(player.gridPos, `✨强化+${newLevel}!`, '#facc15', true);
      this.callbacks.addBattleLog(`【锻造成功】乾坤炉火纯青！部位【${sName}】淬炼升华至 +${newLevel}！战力大幅飙升！`, 'system');
      return { success: true, message: `强化成功！【${sName}】升至 +${newLevel}！`, newLevel };
    } else {
      const nextPity = this.slotEnhancePity[slot] || 0;
      this.callbacks.onSound?.('hit');
      this.callbacks.addDamagePopup(player.gridPos, '💨淬火未成', '#94a3b8');
      this.callbacks.addBattleLog(`【锻造未成】部位【${sName}】淬炼失手，等级保留不降！保底概率累加 +5%（当前保底: +${nextPity * 5}%）！`, 'system');
      return { success: false, message: `强化未成！保底累加 +5%（当前保底: +${nextPity * 5}%）`, newLevel };
    }
  }

  enhanceSlotOneKey(slot: EquipSlot, maxTries: number = 30): {
    successCount: number;
    failCount: number;
    startLevel: number;
    newLevel: number;
    message: string;
  } {
    const slotNames: Record<string, string> = {
      weapon: '武器', armor: '衣服', helmet: '头盔', necklace: '项链',
      bracelet_l: '左手镯', bracelet_r: '右手镯', ring_l: '左戒指', ring_r: '右戒指'
    };
    const sName = slotNames[slot] || slot;
    const startLevel = this.slotEnhancements[slot] || 0;

    let successCount = 0;
    let failCount = 0;
    let stopReason = '';

    for (let i = 0; i < maxTries; i++) {
      const check = this.canAffordEnhance(slot);
      if (!check.can || !check.cost) {
        stopReason = check.reason || '材料不足';
        break;
      }

      const success = this.executeSingleEnhanceStep(slot, check.cost);
      if (success) {
        successCount++;
        break;
      } else {
        failCount++;
      }
    }

    const newLevel = this.slotEnhancements[slot] || 0;
    const player = this.callbacks.getPlayer();

    if (successCount > 0) {
      this.callbacks.recalculatePlayerStats();
      this.callbacks.onSound?.('crit');
      this.callbacks.setScreenShake(12);
      this.callbacks.addDamagePopup(player.gridPos, `✨强化+${newLevel}!`, '#facc15', true);
      const failText = failCount > 0 ? `（经历 ${failCount} 次淬炼失手）` : '';
      const msg = `【${sName}】一键淬火成功升至 +${newLevel}！${failText}`;
      this.callbacks.addBattleLog(`【锻造大成】${msg}`, 'system');
      return { successCount, failCount, startLevel, newLevel, message: msg };
    } else {
      const pity = this.slotEnhancePity[slot] || 0;
      const msg = failCount > 0 
        ? `【${sName}】一键强化尝试 ${failCount} 次未成，${stopReason}，累计保底率 +${pity * 5}%！`
        : `【${sName}】无法进行强化：${stopReason}`;
      return { successCount: 0, failCount, startLevel, newLevel, message: msg };
    }
  }

  enhanceAllSlotsOneKey(maxTries: number = 100): {
    totalSuccess: number;
    totalFails: number;
    upgradedSlots: Partial<Record<EquipSlot, number>>;
    minLevelBefore: number;
    minLevelAfter: number;
    combatPowerDiff: number;
    message: string;
  } {
    const player = this.callbacks.getPlayer();
    const oldCp = player.stats.combatPower;
    const minLevelBefore = Math.min(...ENHANCEABLE_SLOTS.map(s => this.slotEnhancements[s] || 0));

    let totalSuccess = 0;
    let totalFails = 0;
    const upgradedSlots: Partial<Record<EquipSlot, number>> = {};

    for (let step = 0; step < maxTries; step++) {
      const affordableSlots: { slot: EquipSlot; level: number; cost: (typeof ENHANCE_COSTS)[number] }[] = [];
      for (const s of ENHANCEABLE_SLOTS) {
        const check = this.canAffordEnhance(s);
        if (check.can && check.cost) {
          affordableSlots.push({
            slot: s,
            level: this.slotEnhancements[s] || 0,
            cost: check.cost
          });
        }
      }

      if (affordableSlots.length === 0) {
        break;
      }

      affordableSlots.sort((a, b) => a.level - b.level);
      const target = affordableSlots[0];

      const success = this.executeSingleEnhanceStep(target.slot, target.cost);
      if (success) {
        totalSuccess++;
        upgradedSlots[target.slot] = this.slotEnhancements[target.slot];
      } else {
        totalFails++;
      }
    }

    const minLevelAfter = Math.min(...ENHANCEABLE_SLOTS.map(s => this.slotEnhancements[s] || 0));
    this.callbacks.recalculatePlayerStats();
    const combatPowerDiff = player.stats.combatPower - oldCp;

    let message = '';
    if (totalSuccess > 0) {
      this.callbacks.onSound?.('levelup');
      this.callbacks.setScreenShake(10);
      this.callbacks.addDamagePopup(player.gridPos, `🌟全套强化+${totalSuccess}!`, '#38bdf8', true);
      const resonanceText = minLevelAfter > minLevelBefore ? `，全套共鸣突破至 +${minLevelAfter}` : '';
      message = `一键全身强化完成：成功 ${totalSuccess} 次，失败 ${totalFails} 次${resonanceText}，战力提升 +${combatPowerDiff}！`;
      this.callbacks.addBattleLog(`【太古天工】${message}`, 'system');
    } else if (totalFails > 0) {
      this.callbacks.onSound?.('hit');
      message = `一键全身强化尝试 ${totalFails} 次均未成功，已积累大量幸运保底概率！`;
      this.callbacks.addBattleLog(`【太古天工】${message}`, 'system');
    } else {
      message = '当前金币或矿石材料不足，无法进行一键强化！请先通过悬赏或刷怪获取材料。';
    }

    return {
      totalSuccess,
      totalFails,
      upgradedSlots,
      minLevelBefore,
      minLevelAfter,
      combatPowerDiff,
      message
    };
  }
}
