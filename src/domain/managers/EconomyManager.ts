import type { GameWorld } from '../GameWorld';
import { ItemInstance } from '../../types/game';
import { DropSystem } from '../DropSystem';
import { ITEM_DEFINITIONS } from '../definitions/items';

export class EconomyManager {
  constructor(private world: GameWorld) {}

  useItem(item: ItemInstance): boolean {
    if (item.defId === 'pot_blessing_oil' || item.defId === 'pot_super_blessing_oil') {
      return this.useBlessingOil(item.defId === 'pot_super_blessing_oil');
    }
    if (item.defId === 'pot_luosha_water') {
      return this.useLuoshaWater();
    }
    if (item.defId === 'mat_reforge_stone') {
      const target = this.world.equipped.weapon || this.world.inventory.find(i => i.type === 'equipment' && i.quality >= 2);
      if (!target) {
        this.world.addBattleLog('【洗炼提示】请在角色或装备详情中点击【乾坤洗炼】选择指定装备！', 'system');
        return false;
      }
      return this.reforgeEquipment(target.instanceId);
    }

    if (item.type === 'potion') {
      if (item.recoverHp) {
        this.world.player.stats.hp = Math.min(this.world.player.stats.maxHp, this.world.player.stats.hp + item.recoverHp);
        this.world.addDamagePopup(this.world.player.gridPos, `+${item.recoverHp}`, '#22c55e', false, true);
      }
      if (item.recoverMp) {
        this.world.player.stats.mp = Math.min(this.world.player.stats.maxMp, this.world.player.stats.mp + item.recoverMp);
      }
      this.world.onSound?.('potion');

      item.count--;
      if (item.count <= 0) {
        const idx = this.world.inventory.indexOf(item);
        if (idx !== -1) this.world.inventory.splice(idx, 1);
      }
      return true;
    }

    if (item.type === 'equipment' && item.slot) {
      return this.world.equipItem(item);
    }

    return false;
  }

  useBlessingOil(isSuper = false): boolean {
    const weapon = this.world.equipped.weapon;
    if (!weapon) {
      this.world.addBattleLog('【祝福油】请先穿戴武器，方可使用祝福油进行开光涂抹！', 'system');
      return false;
    }

    const oilDefId = isSuper ? 'pot_super_blessing_oil' : 'pot_blessing_oil';
    const oilItem = this.world.inventory.find(i => i.defId === oilDefId);
    if (!oilItem) {
      this.world.addBattleLog(`【祝福油】背包中没有【${isSuper ? '超级祝福油' : '祝福油'}】！`, 'system');
      return false;
    }

    oilItem.count--;
    if (oilItem.count <= 0) {
      const idx = this.world.inventory.indexOf(oilItem);
      if (idx !== -1) this.world.inventory.splice(idx, 1);
    }

    this.world.onSound?.('potion');

    if (isSuper) {
      if (weapon.curse && weapon.curse > 0) {
        weapon.curse = 0;
        this.world.onSound?.('crit');
        this.world.addDamagePopup(this.world.player.gridPos, '✨煞气消散·诅咒净化!', '#38bdf8', true);
        this.world.addBattleLog(`【超级祝福油】金光灌注，[${weapon.name}] 所有的血煞诅咒尽数消散！`, 'system');
      } else {
        const curLuck = weapon.luck || 0;
        if (curLuck < 7) {
          weapon.luck = curLuck + 1;
          this.world.onSound?.('crit');
          this.world.addDamagePopup(this.world.player.gridPos, `🌟幸运+1 (当前运${weapon.luck})!`, '#facc15', true);
          this.world.addBattleLog(`【超级祝福油】天道法则降临，[${weapon.name}] 幸运提升至 +${weapon.luck}！`, 'system');
        } else {
          this.world.addBattleLog(`【超级祝福油】[${weapon.name}] 幸运已达巅峰 +7，无需再饮用！`, 'system');
        }
      }
    } else {
      if (weapon.curse && weapon.curse > 0) {
        if (Math.random() < 0.65) {
          weapon.curse--;
          this.world.addDamagePopup(this.world.player.gridPos, `✨诅咒减轻 (余${weapon.curse})`, '#38bdf8', true);
          this.world.addBattleLog(`【祝福油】圣水微光闪烁，[${weapon.name}] 的诅咒减轻了！`, 'system');
        } else {
          this.world.addBattleLog(`【祝福油】[${weapon.name}] 煞气顽固，未能洗去诅咒。`, 'system');
        }
      } else {
        const curLuck = weapon.luck || 0;
        if (curLuck >= 7) {
          this.world.addBattleLog(`【祝福油】[${weapon.name}] 幸运已达普通祝福油上限 +7，无法继续提升！`, 'system');
        } else if (curLuck < 3) {
          if (Math.random() < 0.70) {
            weapon.luck = curLuck + 1;
            this.world.onSound?.('crit');
            this.world.addDamagePopup(this.world.player.gridPos, `🌟幸运+1 (当前运${weapon.luck})!`, '#facc15', true);
            this.world.addBattleLog(`【祝福油】神油开光，[${weapon.name}] 幸运升至 +${weapon.luck}！`, 'system');
          } else {
            this.world.addBattleLog('【祝福油】神油挥发，没有任何事情发生。', 'system');
          }
        } else {
          const successRate = (7 - curLuck) * 0.10;
          const roll = Math.random();
          if (roll < successRate) {
            weapon.luck = curLuck + 1;
            this.world.onSound?.('crit');
            this.world.addDamagePopup(this.world.player.gridPos, `🌟幸运+1 (当前运${weapon.luck})!`, '#facc15', true);
            this.world.addBattleLog(`【祝福油】极运眷顾！[${weapon.name}] 幸运升至 +${weapon.luck}！`, 'system');
          } else if (roll < successRate + 0.35) {
            if (curLuck > 0) {
              weapon.luck = curLuck - 1;
              this.world.addDamagePopup(this.world.player.gridPos, `⚠️幸运下降 (当前运${weapon.luck})`, '#ef4444', true);
              this.world.addBattleLog(`【祝福油】厄运侵染！[${weapon.name}] 幸运降至 +${weapon.luck}！`, 'system');
            } else {
              weapon.curse = (weapon.curse || 0) + 1;
              this.world.addDamagePopup(this.world.player.gridPos, `💀武器遭诅咒 (诅${weapon.curse})`, '#ef4444', true);
              this.world.addBattleLog(`【祝福油】煞气反噬！[${weapon.name}] 被诅咒了！`, 'system');
            }
          } else {
            this.world.addBattleLog('【祝福油】神油挥发，没有任何事情发生。', 'system');
          }
        }
      }
    }

    this.world.recalculatePlayerStats();
    return true;
  }

  useLuoshaWater(): boolean {
    const weapon = this.world.equipped.weapon;
    if (!weapon) {
      this.world.addBattleLog('【罗刹神水】请先穿戴武器！', 'system');
      return false;
    }
    const luosha = this.world.inventory.find(i => i.defId === 'pot_luosha_water');
    if (!luosha) {
      this.world.addBattleLog('【罗刹神水】背包中没有罗刹神水！', 'system');
      return false;
    }

    luosha.count--;
    if (luosha.count <= 0) {
      const idx = this.world.inventory.indexOf(luosha);
      if (idx !== -1) this.world.inventory.splice(idx, 1);
    }

    weapon.curse = 0;
    this.world.onSound?.('crit');
    this.world.addDamagePopup(this.world.player.gridPos, '🌊诅咒彻底净化!', '#38bdf8', true);
    this.world.addBattleLog(`【罗刹神水】九幽神泉洗练，[${weapon.name}] 的诅咒完全消弭！`, 'system');
    this.world.recalculatePlayerStats();
    return true;
  }

  reforgeEquipment(instanceId: string): boolean {
    let item: ItemInstance | undefined = Object.values(this.world.equipped).find(i => i?.instanceId === instanceId);
    if (!item) {
      item = this.world.inventory.find(i => i.instanceId === instanceId);
    }
    if (!item || item.type !== 'equipment') {
      this.world.addBattleLog('【乾坤洗炼】未找到指定装备！', 'system');
      return false;
    }

    const reforgeStone = this.world.inventory.find(i => i.defId === 'mat_reforge_stone');
    if (!reforgeStone) {
      this.world.addBattleLog('【乾坤洗炼】背包中缺少【乾坤洗炼石】！可击败Boss或在神秘黑市行商处购得！', 'system');
      return false;
    }

    const costGold = 50000;
    if (this.world.player.stats.gold < costGold) {
      this.world.addBattleLog(`【乾坤洗炼】金币不足！每次洗炼需消耗 50,000 金币！`, 'system');
      return false;
    }

    this.world.player.stats.gold -= costGold;
    reforgeStone.count--;
    if (reforgeStone.count <= 0) {
      const idx = this.world.inventory.indexOf(reforgeStone);
      if (idx !== -1) this.world.inventory.splice(idx, 1);
    }

    DropSystem.reforgeItem(item);
    this.world.onSound?.('crit');
    this.world.addDamagePopup(this.world.player.gridPos, '✨装备洗炼成功!', '#a855f7', true);
    const affixSummary = item.affixes?.map(a => a.name).join('、') || '无特殊词缀';
    this.world.addBattleLog(`【乾坤洗炼】[${item.name}] 洗炼重铸完毕！获得全新词缀：【${affixSummary}】！`, 'system');

    this.world.recalculatePlayerStats();
    return true;
  }

  buyShopItem(defId: string, count = 1): boolean {
    const shopPrices: Record<string, number> = {
      'mat_reforge_stone': 100000,
      'pot_blessing_oil': 150000,
      'pot_luosha_water': 500000,
      'pot_sun': 5000,
      'pot_liaoshang': 25000,
      'mat_iron_ore': 50000,
      'mat_pure_iron': 200000,
      'mat_god_stone': 1000000,
      'pot_super_blessing_oil': 10000000
    };

    const pricePerUnit = shopPrices[defId];
    if (!pricePerUnit) {
      this.world.addBattleLog('【黑市商人】行商货架上暂无此物！', 'system');
      return false;
    }

    const totalCost = pricePerUnit * count;
    if (this.world.player.stats.gold < totalCost) {
      this.world.addBattleLog(`【黑市商人】金币不足！购买 ${count} 个需 ${totalCost.toLocaleString()} 金币！`, 'system');
      return false;
    }

    const existing = this.world.inventory.find(i => i.defId === defId);
    if (!existing && this.world.inventory.length >= this.world.getMaxInventorySlots()) {
      this.world.addBattleLog('【黑市商人】背包空间已满，无法容纳新货物！', 'system');
      return false;
    }

    this.world.player.stats.gold -= totalCost;
    if (existing) {
      existing.count += count;
    } else {
      const newItem = DropSystem.createItemInstance(defId, 2, count);
      if (newItem) this.world.inventory.push(newItem);
    }

    this.world.onSound?.('coin');
    const itemDef = ITEM_DEFINITIONS[defId];
    this.world.addBattleLog(`【黑市行商】花费 ${totalCost.toLocaleString()} 金币购得 [${itemDef?.name || defId}] x${count}！`, 'system');
    return true;
  }
}
