import type { GameWorld } from '../GameWorld';
import { EquipSlot, ItemInstance } from '../../types/game';
import { StatCalculator } from '../StatCalculator';
import { PathFinder } from '../PathFinder';

export class InventoryManager {
  inventory: ItemInstance[] = [];
  equipped: Partial<Record<EquipSlot, ItemInstance>> = {};
  isEmergencyCleaning: boolean = false;

  constructor(private world: GameWorld) {}

  hasSpecialEffect(effect: string): boolean {
    for (const it of Object.values(this.equipped)) {
      if (it && it.specialEffect === effect) return true;
    }
    return false;
  }

  getMaxInventorySlots(): number {
    const level = this.world.player?.stats?.level || 1;
    const tier = this.world.player?.stats?.ascensionTier || 0;
    const levelRows = Math.floor(level / 10);
    const tierRows = Math.floor(tier / 2);
    const totalSlots = 40 + (levelRows + tierRows) * 8;
    return Math.min(96, Math.max(40, totalSlots));
  }

  /**
   * 判定某件装备当前是否满足穿戴条件
   */
  canEquipItem(item: ItemInstance): { can: boolean; reason?: string } {
    if (item.type !== 'equipment' || !item.slot) {
      return { can: false, reason: '非可穿戴装备' };
    }
    const playerTier = this.world.player.stats.ascensionTier || 0;
    // 飞升位面阶数限制：不可越阶穿戴超出当前飞升境界的神装
    if (item.tier > playerTier) {
      return { can: false, reason: `需达到 [${item.tier}阶飞升] 方可驾驭` };
    }
    // 等级要求限制 (0阶装备凡体皆可驾驭，无需等级限制)
    if (item.tier > 0 && item.levelReq && item.levelReq > this.world.player.stats.level) {
      return { can: false, reason: `等级不足，需达到 Lv.${item.levelReq}` };
    }
    return { can: true };
  }

  /**
   * 拾取后自动穿戴最适合自己的装备 (智能即刻替换)
   */
  tryAutoEquipIfBetter(item: ItemInstance): boolean {
    if (item.type !== 'equipment' || !item.slot) return false;
    const check = this.canEquipItem(item);
    if (!check.can) return false;

    const itemPower = StatCalculator.getItemCombatPower(item);

    // 1. 双槽位手镯比对
    if (item.slot === 'bracelet_l' || item.slot === 'bracelet_r') {
      const p1 = this.equipped['bracelet_l'] ? StatCalculator.getItemCombatPower(this.equipped['bracelet_l']!) : -1;
      const p2 = this.equipped['bracelet_r'] ? StatCalculator.getItemCombatPower(this.equipped['bracelet_r']!) : -1;
      const weakerPower = Math.min(p1, p2);
      if (itemPower > weakerPower) {
        this.equipItem(item);
        this.world.onSound?.('levelup');
        this.world.addBattleLog(`【神装自动换装】拾获更优手镯 [${item.name}]，已自动替换穿戴！`, 'system');
        return true;
      }
      return false;
    }

    // 2. 双槽位常规戒指比对
    if (item.slot === 'ring_l' || item.slot === 'ring_r') {
      const p1 = this.equipped['ring_l'] ? StatCalculator.getItemCombatPower(this.equipped['ring_l']!) : -1;
      const p2 = this.equipped['ring_r'] ? StatCalculator.getItemCombatPower(this.equipped['ring_r']!) : -1;
      const weakerPower = Math.min(p1, p2);
      if (itemPower > weakerPower) {
        this.equipItem(item);
        this.world.onSound?.('levelup');
        this.world.addBattleLog(`【神装自动换装】拾获更优戒指 [${item.name}]，已自动替换穿戴！`, 'system');
        return true;
      }
      return false;
    }

    // 3. 单槽位 (武器、衣服、头盔、项链、以及6大特戒)
    const currentEquip = this.equipped[item.slot];
    const currentPower = currentEquip ? StatCalculator.getItemCombatPower(currentEquip) : -1;
    if (itemPower > currentPower) {
      this.equipItem(item);
      this.world.onSound?.('levelup');
      const prefix = item.slot.startsWith('special_') ? '【特戒觉醒】' : '【神装自动换装】';
      this.world.addBattleLog(`${prefix}拾获更优装备 [${item.name}]，已自动替换穿戴！`, 'system');
      return true;
    }

    return false;
  }

  equipItem(item: ItemInstance): boolean {
    if (!item.slot) return false;
    const check = this.canEquipItem(item);
    if (!check.can) {
      this.world.addBattleLog(`【穿戴限制】[${item.name}]：${check.reason}`, 'system');
      return false;
    }

    let targetSlot = item.slot;

    if (item.slot === 'bracelet_l' || item.slot === 'bracelet_r') {
      if (!this.equipped['bracelet_l']) {
        targetSlot = 'bracelet_l';
      } else if (!this.equipped['bracelet_r']) {
        targetSlot = 'bracelet_r';
      } else {
        const p1 = StatCalculator.getItemCombatPower(this.equipped['bracelet_l']);
        const p2 = StatCalculator.getItemCombatPower(this.equipped['bracelet_r']);
        targetSlot = p1 <= p2 ? 'bracelet_l' : 'bracelet_r';
      }
    } else if (item.slot === 'ring_l' || item.slot === 'ring_r') {
      if (!this.equipped['ring_l']) {
        targetSlot = 'ring_l';
      } else if (!this.equipped['ring_r']) {
        targetSlot = 'ring_r';
      } else {
        const p1 = StatCalculator.getItemCombatPower(this.equipped['ring_l']);
        const p2 = StatCalculator.getItemCombatPower(this.equipped['ring_r']);
        targetSlot = p1 <= p2 ? 'ring_l' : 'ring_r';
      }
    }

    const oldEquip = this.equipped[targetSlot];
    const invIdx = this.inventory.findIndex(i => i.instanceId === item.instanceId);
    if (invIdx !== -1) this.inventory.splice(invIdx, 1);
    if (oldEquip) this.addItemToInventory(oldEquip);

    this.equipped[targetSlot] = item;

    const oldCp = this.world.player.stats.combatPower;
    this.world.recalculatePlayerStats();
    const cpDiff = this.world.player.stats.combatPower - oldCp;

    if (cpDiff > 0) {
      this.world.addDamagePopup(this.world.player.gridPos, `战力 +${cpDiff}`, '#fbbf24', true);
    }
    return true;
  }

  oneKeyEquipBest(): number {
    let replacedCount = 0;

    const singleSlots: EquipSlot[] = [
      'weapon', 'armor', 'helmet', 'necklace',
      'special_paralyze', 'special_revive', 'special_protect',
      'special_wind', 'special_luck', 'special_greed'
    ];
    for (const slot of singleSlots) {
      const current = this.equipped[slot];
      const currentPower = current ? StatCalculator.getItemCombatPower(current) : -1;

      let bestItemIdx = -1;
      let bestPower = currentPower;

      for (let i = 0; i < this.inventory.length; i++) {
        const item = this.inventory[i];
        if (item.type !== 'equipment' || item.slot !== slot) continue;
        if (!this.canEquipItem(item).can) continue;

        const power = StatCalculator.getItemCombatPower(item);
        if (power > bestPower) {
          bestPower = power;
          bestItemIdx = i;
        }
      }

      if (bestItemIdx !== -1) {
        const bestItem = this.inventory.splice(bestItemIdx, 1)[0];
        if (current) {
          this.addItemToInventory(current);
        }
        this.equipped[slot] = bestItem;
        replacedCount++;
      }
    }

    // 2. 双槽位手镯比对优化 (bracelet_l, bracelet_r)
    replacedCount += this.optimizeDualSlots(['bracelet_l', 'bracelet_r']);

    // 3. 双槽位戒指比对优化 (ring_l, ring_r)
    replacedCount += this.optimizeDualSlots(['ring_l', 'ring_r']);

    // 重新计算全身属性与战力
    const oldCp = this.world.player.stats.combatPower;
    this.world.recalculatePlayerStats();
    const cpDiff = this.world.player.stats.combatPower - oldCp;

    if (replacedCount > 0) {
      this.world.onSound?.('levelup');
      if (cpDiff > 0) {
        this.world.addDamagePopup(this.world.player.gridPos, `战力 +${cpDiff}`, '#fbbf24', true);
      }
      this.world.addBattleLog(
        `【一键穿戴】成功更换了 ${replacedCount} 件更强同部位装备，战力提升至 ${this.world.player.stats.combatPower}！`,
        'system'
      );
    } else {
      const unequippedBetter = this.inventory.find(item => {
        if (item.type !== 'equipment' || !item.slot) return false;
        let currentPower = -1;
        if (item.slot === 'bracelet_l' || item.slot === 'bracelet_r') {
          const p1 = this.equipped['bracelet_l'] ? StatCalculator.getItemCombatPower(this.equipped['bracelet_l']) : -1;
          const p2 = this.equipped['bracelet_r'] ? StatCalculator.getItemCombatPower(this.equipped['bracelet_r']) : -1;
          currentPower = Math.min(p1, p2);
        } else if (item.slot === 'ring_l' || item.slot === 'ring_r') {
          const p1 = this.equipped['ring_l'] ? StatCalculator.getItemCombatPower(this.equipped['ring_l']) : -1;
          const p2 = this.equipped['ring_r'] ? StatCalculator.getItemCombatPower(this.equipped['ring_r']) : -1;
          currentPower = Math.min(p1, p2);
        } else {
          const current = this.equipped[item.slot];
          currentPower = current ? StatCalculator.getItemCombatPower(current) : -1;
        }
        return StatCalculator.getItemCombatPower(item) > currentPower && !this.canEquipItem(item).can;
      });

      if (unequippedBetter) {
        const check = this.canEquipItem(unequippedBetter);
        this.world.addBattleLog(
          `【一键穿戴】背包中有更高评分神装 [${unequippedBetter.name}]，但${check.reason}，暂无法穿戴！`,
          'system'
        );
      } else {
        this.world.addBattleLog('【一键穿戴】当前身上穿戴已是同部位最高战力搭配！', 'system');
      }
    }

    return replacedCount;
  }

  optimizeDualSlots(slots: [EquipSlot, EquipSlot]): number {
    const [slot1, slot2] = slots;
    const isMatchingSlot = (itemSlot?: EquipSlot) => itemSlot === slot1 || itemSlot === slot2;

    interface Candidate {
      item: ItemInstance;
      power: number;
    }

    const candidates: Candidate[] = [];
    const seenInstances = new Set<string>();

    const addCandidate = (item?: ItemInstance) => {
      if (!item || seenInstances.has(item.instanceId)) return;
      seenInstances.add(item.instanceId);
      candidates.push({
        item,
        power: StatCalculator.getItemCombatPower(item)
      });
    };

    addCandidate(this.equipped[slot1]);
    addCandidate(this.equipped[slot2]);

    for (const it of this.inventory) {
      if (it.type === 'equipment' && isMatchingSlot(it.slot)) {
        if (this.canEquipItem(it).can) {
          addCandidate(it);
        }
      }
    }

    if (candidates.length === 0) return 0;

    // 按战力从高到低排序
    candidates.sort((a, b) => b.power - a.power);

    const desired1 = candidates[0]?.item;
    const desired2 = candidates[1]?.item;

    const current1 = this.equipped[slot1];
    const current2 = this.equipped[slot2];

    const currentIds = new Set([current1?.instanceId, current2?.instanceId].filter(Boolean));
    const desiredIds = new Set([desired1?.instanceId, desired2?.instanceId].filter(Boolean));

    // 如果目标组合与当前已穿戴组合完全一致，则无需替换
    if (currentIds.size === desiredIds.size && [...desiredIds].every(id => id && currentIds.has(id))) {
      return 0;
    }

    let replacedCount = 0;

    // 找出需要从身上卸下的装备 (在 currentIds 但不在 desiredIds)
    const toInventory: ItemInstance[] = [];
    if (current1 && !desiredIds.has(current1.instanceId)) {
      delete this.equipped[slot1];
      toInventory.push(current1);
    }
    if (current2 && !desiredIds.has(current2.instanceId)) {
      delete this.equipped[slot2];
      toInventory.push(current2);
    }

    // 先从背包取出需换上的新装备，腾出背包空间 (若来自背包)
    if (desired1) {
      const idx = this.inventory.findIndex(i => i.instanceId === desired1.instanceId);
      if (idx !== -1) this.inventory.splice(idx, 1);
    }
    if (desired2) {
      const idx = this.inventory.findIndex(i => i.instanceId === desired2.instanceId);
      if (idx !== -1) this.inventory.splice(idx, 1);
    }

    // 将卸下的旧装备安全存入背包 (由于先取出了新装备，背包容量恒定不溢出)
    for (const old of toInventory) {
      this.inventory.push(old);
    }

    // 装备 desired1 到 slot1
    if (desired1 && this.equipped[slot1]?.instanceId !== desired1.instanceId) {
      if (this.equipped[slot2]?.instanceId === desired1.instanceId) {
        delete this.equipped[slot2];
      }
      this.equipped[slot1] = desired1;
      replacedCount++;
    }

    // 装备 desired2 到 slot2
    if (desired2 && this.equipped[slot2]?.instanceId !== desired2.instanceId) {
      this.equipped[slot2] = desired2;
      replacedCount++;
    }

    return replacedCount;
  }

  unequipItem(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    const maxSlots = this.getMaxInventorySlots();
    if (this.inventory.length >= maxSlots) {
      this.world.addBattleLog(`【背包已满】随身包裹已达 ${maxSlots} 格上限，无法卸下装备！`, 'system');
      return false;
    }
    delete this.equipped[slot];
    this.addItemToInventory(item);

    const base = StatCalculator.getBaseStatsForLevel(this.world.player.stats.level, this.world.player.stats.ascensionTier || 0);
    this.world.player.stats = StatCalculator.applyEquipment(base, this.equipped, this.world.slotEnhancements, undefined, this.world.talentAllocations);
    return true;
  }

  addItemToInventory(item: ItemInstance): boolean {
    if (item.type === 'potion' || item.type === 'material') {
      const existing = this.inventory.find(i => i.defId === item.defId);
      if (existing) {
        existing.count = (existing.count || 1) + (item.count || 1);
        return true;
      }
    }

    const maxSlots = this.getMaxInventorySlots();

    if (this.inventory.length >= maxSlots - 2 && !this.isEmergencyCleaning) {
      this.isEmergencyCleaning = true;
      try {
        this.emergencyPruneInventory(2);
      } finally {
        this.isEmergencyCleaning = false;
      }
    }

    if (this.inventory.length >= maxSlots) {
      this.emergencyPruneInventory(2);
      if (this.inventory.length >= maxSlots) {
        return false;
      }
    }

    this.inventory.push(item);
    return true;
  }

  checkPlayerLootPickup(): void {
    const maxSlots = this.getMaxInventorySlots();

    if (this.inventory.length >= maxSlots - 7) {
      this.recycleWeakerOrEqualItems();
      const maxQ = this.world.autoConfig.autoRecycleMaxQuality ?? 2;
      if (this.inventory.length >= maxSlots - 5) {
        this.recycleLowQualityItems(maxQ);
      }
    }

    let hasFullBagWarning = false;

    for (let i = this.world.groundItems.length - 1; i >= 0; i--) {
      const drop = this.world.groundItems[i];
      const dist = PathFinder.chebyshevDistance(this.world.player.gridPos, drop.gridPos);
      if (dist <= 1) {
        const success = this.addItemToInventory(drop.item);
        if (success) {
          this.world.groundItems.splice(i, 1);
          this.world.onSound?.('coin');
          const countText = drop.item.count > 1 ? ` x${drop.item.count}` : '';
          this.world.addBattleLog(`拾取战利品 [${drop.item.name}]${countText}`, 'drop', drop.item.quality);

          if (drop.item.type === 'equipment' && drop.item.slot) {
            this.tryAutoEquipIfBetter(drop.item);
          }

          if (this.inventory.length >= maxSlots - 5) {
            this.recycleWeakerOrEqualItems();
            const maxQ = this.world.autoConfig.autoRecycleMaxQuality ?? 2;
            if (this.inventory.length >= maxSlots - 4) {
              this.recycleLowQualityItems(maxQ);
            }
          }
        } else {
          hasFullBagWarning = true;
        }
      }
    }

    if (hasFullBagWarning && (!this.world.lastFullBagWarnTick || this.world.currentTick - this.world.lastFullBagWarnTick >= 30)) {
      this.world.lastFullBagWarnTick = this.world.currentTick;
      this.world.addBattleLog(`【背包已满】随身包裹已达到 ${maxSlots}/${maxSlots} 上限且无法自动腾挪，无法吸附拾取战利品！`, 'system');
      this.world.addDamagePopup(this.world.player.gridPos, '包裹已满!', '#ef4444', true);
    }
  }

  recycleLowQualityItems(maxQuality: number = 1): { gold: number; exp: number; count: number } {
    this.oneKeyEquipBest();

    let gainedGold = 0;
    let gainedExp = 0;
    let count = 0;

    for (let i = this.inventory.length - 1; i >= 0; i--) {
      const item = this.inventory[i];
      if (item.type === 'equipment' && item.quality <= maxQuality) {
        if (item.specialEffect || (item.slot && item.slot.startsWith('special_'))) continue;

        if (item.slot) {
          const isDual = item.slot === 'bracelet_l' || item.slot === 'bracelet_r' || item.slot === 'ring_l' || item.slot === 'ring_r';
          const itemPower = StatCalculator.getItemCombatPower(item);
          if (isDual) {
            const isBracelet = item.slot.startsWith('bracelet');
            const eq1 = this.equipped[isBracelet ? 'bracelet_l' : 'ring_l'];
            const eq2 = this.equipped[isBracelet ? 'bracelet_r' : 'ring_r'];
            const p1 = eq1 ? StatCalculator.getItemCombatPower(eq1) : -1;
            const p2 = eq2 ? StatCalculator.getItemCombatPower(eq2) : -1;
            const weakerPower = Math.min(p1, p2);
            if (itemPower > weakerPower) {
              const betterInBagCount = this.inventory.filter(
                other => other.instanceId !== item.instanceId && 
                         other.type === 'equipment' && 
                         (isBracelet ? (other.slot === 'bracelet_l' || other.slot === 'bracelet_r') : (other.slot === 'ring_l' || other.slot === 'ring_r')) && 
                         StatCalculator.getItemCombatPower(other) > itemPower
              ).length;
              if (betterInBagCount < 2) {
                continue;
              }
            }
          } else {
            const current = this.equipped[item.slot];
            const currentPower = current ? StatCalculator.getItemCombatPower(current) : -1;
            if (itemPower > currentPower) {
              const hasBetterInBag = this.inventory.some(
                other => other.instanceId !== item.instanceId && 
                         other.type === 'equipment' && 
                         other.slot === item.slot && 
                         StatCalculator.getItemCombatPower(other) > itemPower
              );
              if (!hasBetterInBag) {
                continue;
              }
            }
          }
        }

        gainedGold += item.price;
        gainedExp += Math.floor(item.price * 0.08);
        count++;
        this.inventory.splice(i, 1);
      }
    }

    if (count > 0) {
      this.world.player.stats.gold += gainedGold;
      this.world.addExp(gainedExp);
      this.world.onSound?.('coin');
      const qualityName = maxQuality >= 3 ? '紫装及以下' : maxQuality >= 2 ? '蓝装及以下' : '白/绿';
      this.world.addBattleLog(`【一键回收】回收 ${count} 件${qualityName}装备，金币 +${gainedGold}，经验 +${gainedExp}`, 'system');
    }

    return { gold: gainedGold, exp: gainedExp, count };
  }

  recycleWeakerOrEqualItems(autoEquipFirst: boolean = true): { gold: number; exp: number; count: number } {
    if (autoEquipFirst) {
      this.oneKeyEquipBest();
    }

    let gainedGold = 0;
    let gainedExp = 0;
    let count = 0;

    const playerTier = this.world.player.stats.ascensionTier || 0;
    const keepIndices = new Set<number>();

    for (let i = 0; i < this.inventory.length; i++) {
      const it = this.inventory[i];
      if (it.type !== 'equipment' || !it.slot) {
        keepIndices.add(i);
        continue;
      }
    }

    const keptSpecialEffects = new Set<string>();
    for (let i = 0; i < this.inventory.length; i++) {
      const it = this.inventory[i];
      if (it.type === 'equipment' && (it.specialEffect || (it.slot && it.slot.startsWith('special_')))) {
        const key = it.specialEffect || it.slot || '';
        if (!keptSpecialEffects.has(key)) {
          keptSpecialEffects.add(key);
          keepIndices.add(i);
        }
      }
    }

    const singleSlots: EquipSlot[] = ['weapon', 'armor', 'helmet', 'necklace'];
    for (const slot of singleSlots) {
      const equippedItem = this.equipped[slot];
      const benchmarkPower = equippedItem ? StatCalculator.getItemCombatPower(equippedItem) : -1;

      const equippableCandidates: { index: number; power: number }[] = [];
      const futureCandidates: { index: number; power: number }[] = [];

      for (let i = 0; i < this.inventory.length; i++) {
        if (keepIndices.has(i)) continue;
        const it = this.inventory[i];
        if (it.type === 'equipment' && it.slot === slot) {
          const check = this.canEquipItem(it);
          const power = StatCalculator.getItemCombatPower(it);
          if (check.can) {
            equippableCandidates.push({ index: i, power });
          } else {
            if (it.tier <= playerTier + 1 || it.quality >= 4) {
              futureCandidates.push({ index: i, power });
            }
          }
        }
      }

      equippableCandidates.sort((a, b) => b.power - a.power);
      if (equippableCandidates.length > 0 && equippableCandidates[0].power > benchmarkPower) {
        keepIndices.add(equippableCandidates[0].index);
      }

      futureCandidates.sort((a, b) => b.power - a.power);
      if (futureCandidates.length > 0) {
        keepIndices.add(futureCandidates[0].index);
      }
    }

    this.markKeepForDualSlots(['bracelet_l', 'bracelet_r'], keepIndices, playerTier);
    this.markKeepForDualSlots(['ring_l', 'ring_r'], keepIndices, playerTier);

    for (let i = this.inventory.length - 1; i >= 0; i--) {
      const item = this.inventory[i];
      if (item.type !== 'equipment' || !item.slot) continue;

      if (!keepIndices.has(i)) {
        gainedGold += item.price;
        gainedExp += Math.floor(item.price * 0.10);
        count++;
        this.inventory.splice(i, 1);
      }
    }

    if (count > 0) {
      this.world.player.stats.gold += gainedGold;
      this.world.addExp(gainedExp);
      this.world.onSound?.('coin');
      this.world.addBattleLog(
        `【智能回收】成功按同部位熔炼 ${count} 件弱于身上的冗余装备，获得金币 +${gainedGold}，经验 +${gainedExp}！`,
        'system'
      );
    } else {
      this.world.addBattleLog('【智能回收】背包中无弱于身上的同部位冗余装备，极品神装与特戒已妥善保留！', 'system');
    }

    return { gold: gainedGold, exp: gainedExp, count };
  }

  markKeepForDualSlots(slots: [EquipSlot, EquipSlot], keepIndices: Set<number>, playerTier: number): void {
    const [slot1, slot2] = slots;
    const isMatchingSlot = (s?: EquipSlot) => s === slot1 || s === slot2;

    const eq1 = this.equipped[slot1];
    const eq2 = this.equipped[slot2];

    const p1 = eq1 ? StatCalculator.getItemCombatPower(eq1) : -1;
    const p2 = eq2 ? StatCalculator.getItemCombatPower(eq2) : -1;

    const equippedPowers = [Math.max(p1, p2), Math.min(p1, p2)];

    const equippableCandidates: { index: number; power: number }[] = [];
    const futureCandidates: { index: number; power: number }[] = [];

    for (let i = 0; i < this.inventory.length; i++) {
      if (keepIndices.has(i)) continue;
      const it = this.inventory[i];
      if (it.type === 'equipment' && isMatchingSlot(it.slot)) {
        const check = this.canEquipItem(it);
        const power = StatCalculator.getItemCombatPower(it);
        if (check.can) {
          equippableCandidates.push({ index: i, power });
        } else {
          if (it.tier <= playerTier + 1 || it.quality >= 4) {
            futureCandidates.push({ index: i, power });
          }
        }
      }
    }

    equippableCandidates.sort((a, b) => b.power - a.power);
    if (equippableCandidates.length > 0 && equippableCandidates[0].power > equippedPowers[1]) {
      keepIndices.add(equippableCandidates[0].index);
      if (equippableCandidates.length > 1 && equippableCandidates[1].power > equippedPowers[0]) {
        keepIndices.add(equippableCandidates[1].index);
      }
    }

    futureCandidates.sort((a, b) => b.power - a.power);
    if (futureCandidates[0]) keepIndices.add(futureCandidates[0].index);
    if (futureCandidates[1]) keepIndices.add(futureCandidates[1].index);
  }

  emergencyPruneInventory(neededSlots: number = 2): number {
    const maxSlots = this.getMaxInventorySlots();
    let pruned = 0;

    this.oneKeyEquipBest();
    const res1 = this.recycleWeakerOrEqualItems(false);
    pruned += res1.count;
    if (this.inventory.length <= maxSlots - neededSlots) return pruned;

    const res2 = this.recycleLowQualityItems(2);
    pruned += res2.count;
    if (this.inventory.length <= maxSlots - neededSlots) return pruned;

    const res3 = this.recycleLowQualityItems(3);
    pruned += res3.count;
    if (this.inventory.length <= maxSlots - neededSlots) return pruned;

    const candidates: { index: number; item: ItemInstance; power: number }[] = [];
    for (let i = 0; i < this.inventory.length; i++) {
      const it = this.inventory[i];
      if (it.type === 'equipment' && !it.specialEffect && (!it.slot || !it.slot.startsWith('special_'))) {
        candidates.push({
          index: i,
          item: it,
          power: StatCalculator.getItemCombatPower(it)
        });
      }
    }

    candidates.sort((a, b) => a.power - b.power);

    const neededToRemove = Math.min(candidates.length, this.inventory.length - (maxSlots - neededSlots));
    if (neededToRemove > 0) {
      const toRemoveIds = new Set(candidates.slice(0, neededToRemove).map(c => c.item.instanceId));
      let gainedGold = 0;
      let gainedExp = 0;
      let count = 0;

      for (let i = this.inventory.length - 1; i >= 0; i--) {
        const it = this.inventory[i];
        if (toRemoveIds.has(it.instanceId)) {
          gainedGold += it.price;
          gainedExp += Math.floor(it.price * 0.10);
          count++;
          this.inventory.splice(i, 1);
        }
      }

      this.world.player.stats.gold += gainedGold;
      this.world.addExp(gainedExp);
      pruned += count;
      this.world.addBattleLog(
        `【包裹紧急腾挪】随身包裹严重爆满，自动熔炼 ${count} 件闲置低战力装备腾出空间，金币 +${gainedGold}，经验 +${gainedExp}！`,
        'system'
      );
    }

    return pruned;
  }
}
