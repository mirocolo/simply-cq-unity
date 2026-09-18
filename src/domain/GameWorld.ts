import { 
  AutoPilotConfig, 
  AutoPilotStats, 
  BattleLog, 
  DamagePopup, 
  Direction8, 
  Entity, 
  EquipSlot, 
  GridCoord, 
  GroundItem, 
  ItemInstance, 
  SkillDef, 
  SkillId 
} from '../types/game';
import { StatCalculator } from './StatCalculator';
import { CombatSystem } from './CombatSystem';
import { PathFinder } from './PathFinder';
import { DropSystem } from './DropSystem';
import { AutoPilot } from './AutoPilot';
import { MONSTER_TEMPLATES } from './definitions/monsters';
import { SKILL_DEFINITIONS } from './definitions/skills';
import { StorageManager } from './StorageManager';

export class GameWorld {
  readonly MAP_WIDTH = 36;
  readonly MAP_HEIGHT = 36;
  private obstacles = new Set<string>();

  player: Entity;
  monsters: Entity[] = [];
  groundItems: GroundItem[] = [];
  inventory: ItemInstance[] = [];
  equipped: Partial<Record<EquipSlot, ItemInstance>> = {};
  skills: SkillDef[] = [];
  
  autoPilot = new AutoPilot();
  autoConfig: AutoPilotConfig = {
    enabled: true,
    autoPotionHpPercent: 50,
    autoPotionMpPercent: 30,
    autoSkill: true,
    autoPickup: true,
    searchRadius: 16
  };
  autoStats: AutoPilotStats = {
    activeTimeSeconds: 0,
    killCount: 0,
    expGained: 0,
    goldGained: 0,
    blueDrops: 0,
    purpleDrops: 0,
    orangeDrops: 0
  };

  // 战斗快感增强：震屏、连斩数与狂暴怒气
  screenShake = 0;
  comboCount = 0;
  comboTimer = 0;
  isBerserk = false;

  damagePopups: DamagePopup[] = [];
  battleLogs: BattleLog[] = [];
  currentTick = 0;

  onSound?: (name: 'swing' | 'hit' | 'crit' | 'coin' | 'potion' | 'levelup' | 'fire') => void;
  onSlashVFX?: (gridPos: GridCoord, dir: Direction8, isFire: boolean, haste: number) => void;

  constructor() {
    this.initMapObstacles();
    this.player = this.createPlayer();
    this.skills = Object.values(SKILL_DEFINITIONS).map(s => ({ ...s }));
    this.initStartingInventory();
    this.spawnInitialMonsters();
  }

  private initMapObstacles(): void {
    for (let x = 0; x < this.MAP_WIDTH; x++) {
      this.obstacles.add(`${x},0`);
      this.obstacles.add(`${x},${this.MAP_HEIGHT - 1}`);
    }
    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      this.obstacles.add(`0,${y}`);
      this.obstacles.add(`${this.MAP_WIDTH - 1},${y}`);
    }

    const rocks = [
      { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 11 },
      { x: 24, y: 22 }, { x: 25, y: 22 }, { x: 25, y: 23 },
      { x: 18, y: 14 }, { x: 19, y: 14 }
    ];
    rocks.forEach(r => this.obstacles.add(`${r.x},${r.y}`));
  }

  isWalkable = (x: number, y: number): boolean => {
    if (x < 0 || x >= this.MAP_WIDTH || y < 0 || y >= this.MAP_HEIGHT) return false;
    return !this.obstacles.has(`${x},${y}`);
  };

  private createPlayer(): Entity {
    const base = StatCalculator.getBaseStatsForLevel(1);
    return {
      id: 'player_1',
      name: '至尊战神',
      isPlayer: true,
      gridPos: { x: 18, y: 18 },
      targetGridPos: null,
      moveProgress: 0,
      direction: 4,
      stats: StatCalculator.applyEquipment(base, {}),
      targetEntityId: null,
      lastAttackTick: -100,
      state: 'idle',
      stateTicks: 0
    };
  }

  private initStartingInventory(): void {
    const sword = DropSystem.createItemInstance('w_wood_sword', 0);
    const armor = DropSystem.createItemInstance('a_buyi', 0);
    const hpPot = DropSystem.createItemInstance('pot_hp_small', 0, 50);
    const mpPot = DropSystem.createItemInstance('pot_mp_large', 1, 30);

    if (sword) this.equipItem(sword);
    if (armor) this.equipItem(armor);
    if (hpPot) this.addItemToInventory(hpPot);
    if (mpPot) this.addItemToInventory(mpPot);

    this.addBattleLog('【系统】欢迎来到热血单机传奇！按【T】开启自动挂机，【B】背包，【C】人物面板。', 'system');
  }

  private spawnInitialMonsters(): void {
    const monsterDistributions = [
      { templateId: 'm_scarecrow', count: 10, center: { x: 16, y: 16 }, radius: 6 },
      { templateId: 'm_cat', count: 8, center: { x: 22, y: 16 }, radius: 5 },
      { templateId: 'm_spider', count: 6, center: { x: 14, y: 24 }, radius: 5 },
      { templateId: 'm_skeleton', count: 8, center: { x: 24, y: 25 }, radius: 6 },
      { templateId: 'm_zombie', count: 5, center: { x: 10, y: 18 }, radius: 5 },
      { templateId: 'm_white_pig', count: 3, center: { x: 28, y: 10 }, radius: 4 },
      { templateId: 'm_wooma_boss', count: 1, center: { x: 28, y: 28 }, radius: 3 },
      { templateId: 'm_red_moon', count: 1, center: { x: 8, y: 28 }, radius: 3 }
    ];

    let idGen = 1;
    for (const dist of monsterDistributions) {
      const template = MONSTER_TEMPLATES[dist.templateId];
      if (!template) continue;

      for (let i = 0; i < dist.count; i++) {
        let gx = dist.center.x + Math.floor((Math.random() - 0.5) * dist.radius * 2);
        let gy = dist.center.y + Math.floor((Math.random() - 0.5) * dist.radius * 2);

        gx = Math.max(2, Math.min(this.MAP_WIDTH - 3, gx));
        gy = Math.max(2, Math.min(this.MAP_HEIGHT - 3, gy));

        const baseStats = StatCalculator.getBaseStatsForLevel(template.level);
        const stats = {
          ...baseStats,
          hp: template.hp,
          maxHp: template.hp,
          mp: template.mp,
          maxMp: template.mp,
          minDC: template.minDC,
          maxDC: template.maxDC,
          minAC: template.minAC,
          maxAC: template.maxAC,
          critRate: template.critRate,
          haste: template.haste,
          baseAttackInterval: template.baseAttackInterval,
          effectiveAttackInterval: template.baseAttackInterval,
          combatPower: Math.floor((template.minDC + template.maxDC) * 2 + template.hp * 0.3)
        };

        this.monsters.push({
          id: `monster_${idGen++}`,
          name: template.name,
          isPlayer: false,
          gridPos: { x: gx, y: gy },
          spawnOrigin: { x: gx, y: gy },
          targetGridPos: null,
          moveProgress: 0,
          direction: Math.floor(Math.random() * 8) as Direction8,
          stats,
          targetEntityId: null,
          lastAttackTick: -100,
          state: 'idle',
          stateTicks: 0,
          isBoss: template.isBoss,
          isElite: template.isElite,
          maxRespawnTicks: template.respawnTicks,
          color: template.color,
          icon: template.icon,
          hitStunTicks: 0
        });
      }
    }
  }

  tick(): void {
    this.currentTick++;

    // 震屏衰减
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 1.5);
    }

    // 连斩连击倒计时 (4秒内未出刀连击断开)
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.isBerserk = false;
      }
    }

    // 技能冷却倒计时
    for (const skill of this.skills) {
      if (skill.currentCdTicks > 0) {
        skill.currentCdTicks--;
      }
    }

    // 掉落喷泉抛物线动画
    for (const drop of this.groundItems) {
      if (drop.burstProgress !== undefined && drop.burstProgress < 1.0) {
        drop.burstProgress = Math.min(1.0, drop.burstProgress + 0.15);
      }
    }

    // 玩家位移插值更新
    this.updateEntityMovement(this.player);

    // 玩家自动吸附拾取附近 2 格内掉落物
    this.checkPlayerLootPickup();

    // 挂机 AI 逻辑
    if (this.autoConfig.enabled && this.player.state !== 'dead') {
      this.autoStats.activeTimeSeconds += 0.1;
      const decision = this.autoPilot.decide(
        this.player,
        this.monsters,
        this.groundItems,
        this.inventory,
        this.skills,
        this.autoConfig,
        this.currentTick,
        this.isWalkable
      );

      if (decision.type === 'move' && decision.targetPos) {
        this.startEntityMove(this.player, decision.targetPos);
      } else if (decision.type === 'attack' && decision.targetEntity) {
        this.executeAttack(this.player, decision.targetEntity, decision.skillToUse);
      } else if (decision.type === 'use_potion' && decision.potionToUse) {
        this.useItem(decision.potionToUse);
      }
    }

    // 出刀后平滑恢复站立闲置
    if (this.player.state === 'attacking' && this.currentTick - this.player.lastAttackTick >= 2) {
      this.player.state = 'idle';
    }

    // 怪物状态与受击硬直消退
    for (const m of this.monsters) {
      if (m.state === 'attacking' && this.currentTick - m.lastAttackTick >= 2) {
        m.state = 'idle';
      }

      if (m.hitStunTicks && m.hitStunTicks > 0) {
        m.hitStunTicks--;
        if (m.hitStunTicks <= 0) {
          m.knockbackOffset = undefined;
        }
      }

      if (m.state === 'dead') {
        if (m.respawnTicks !== undefined && m.respawnTicks > 0) {
          m.respawnTicks--;
          if (m.respawnTicks <= 0) {
            m.state = 'idle';
            m.stats.hp = m.stats.maxHp;
            if (m.spawnOrigin) {
              m.gridPos = { ...m.spawnOrigin };
            }
          }
        }
        continue;
      }

      this.updateEntityMovement(m);

      if ((m.state === 'idle' || m.state === 'walking') && (!m.hitStunTicks || m.hitStunTicks <= 0)) {
        const distToPlayer = PathFinder.chebyshevDistance(m.gridPos, this.player.gridPos);
        const aggroRadius = m.isBoss ? 9 : 5;

        if (distToPlayer <= aggroRadius && this.player.state !== 'dead') {
          if (distToPlayer <= 1) {
            if (CombatSystem.canAttack(m, this.currentTick)) {
              this.executeAttack(m, this.player);
            }
          } else {
            if (Math.random() < 0.45 && !m.targetGridPos) {
              const path = PathFinder.findPath(m.gridPos, this.player.gridPos, this.isWalkable, 80);
              if (path.length > 0) {
                this.startEntityMove(m, path[0]);
              }
            }
          }
        } else if (Math.random() < 0.05 && !m.targetGridPos && m.spawnOrigin) {
          const wx = m.gridPos.x + Math.floor(Math.random() * 3) - 1;
          const wy = m.gridPos.y + Math.floor(Math.random() * 3) - 1;
          if (this.isWalkable(wx, wy) && PathFinder.chebyshevDistance({ x: wx, y: wy }, m.spawnOrigin) <= 4) {
            this.startEntityMove(m, { x: wx, y: wy });
          }
        }
      }
    }

    // 飘字生命期
    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const p = this.damagePopups[i];
      p.life++;
      p.worldY -= p.vy;
      if (p.life >= p.maxLife) {
        this.damagePopups.splice(i, 1);
      }
    }
  }

  private updateEntityMovement(entity: Entity): void {
    if (!entity.targetGridPos) return;

    // 移动步伐速率 (普通 0.34 约 300ms 一步，狂暴 0.50 约 200ms 一步，如风疾走)
    const speedBonus = (entity.isPlayer && this.isBerserk) ? 0.16 : 0;
    const speed = (entity.isPlayer ? 0.34 : 0.20) + speedBonus;
    entity.moveProgress += speed;

    if (entity.moveProgress >= 1.0) {
      entity.gridPos = { ...entity.targetGridPos };
      entity.targetGridPos = null;
      entity.moveProgress = 0;
      entity.state = 'idle';
    }
  }

  private startEntityMove(entity: Entity, targetPos: GridCoord): void {
    // 正在跨格位移中，绝不重复重置进度，彻底根除移动抽搐与卡顿
    if (entity.targetGridPos) return;
    if (!this.isWalkable(targetPos.x, targetPos.y)) return;
    entity.direction = PathFinder.getDirection(entity.gridPos, targetPos);
    entity.targetGridPos = { ...targetPos };
    entity.moveProgress = 0;
    entity.state = 'walking';
  }

  /**
   * 触发爽快攻击 (支持半月弯刀多目标顺劈斩与强物理击退硬直)
   */
  executeAttack(attacker: Entity, primaryTarget: Entity, skill?: SkillDef): boolean {
    if (!CombatSystem.canAttack(attacker, this.currentTick)) {
      return false;
    }

    attacker.direction = PathFinder.getDirection(attacker.gridPos, primaryTarget.gridPos);
    attacker.lastAttackTick = this.currentTick;
    attacker.state = 'attacking';

    if (skill && skill.manaCost > 0) {
      attacker.stats.mp = Math.max(0, attacker.stats.mp - skill.manaCost);
      skill.currentCdTicks = skill.cdTicks;
    }

    const isFire = skill?.id === 'fire_slash';

    // 音效与刀光
    if (attacker.isPlayer) {
      this.onSound?.(isFire ? 'fire' : 'swing');
      this.onSlashVFX?.(attacker.gridPos, attacker.direction, isFire, attacker.stats.haste);

      // 积累连斩怒气
      this.comboCount++;
      this.comboTimer = 40; // 4秒刷新
      if (this.comboCount >= 15 && !this.isBerserk) {
        this.isBerserk = true;
        this.onSound?.('crit');
        this.addBattleLog('【进入狂暴】连斩破百，战意滔天！移动速度与攻击暴击大幅飙升！', 'system');
      }
    }

    // 1. 主目标计算
    this.applyHitToEntity(attacker, primaryTarget, skill, false);

    // 2. 经典战士【半月弯刀】顺劈斩机制 (清怪极度爽快！顺劈身边最多2只额外小怪)
    if (attacker.isPlayer) {
      let cleaveHits = 0;
      for (const other of this.monsters) {
        if (other.id === primaryTarget.id || other.state === 'dead') continue;
        const distToPlayer = PathFinder.chebyshevDistance(attacker.gridPos, other.gridPos);
        const distToTarget = PathFinder.chebyshevDistance(primaryTarget.gridPos, other.gridPos);

        // 目标邻近且在身前 1 格以内
        if (distToPlayer <= 1 && distToTarget <= 2) {
          this.applyHitToEntity(attacker, other, skill, true);
          cleaveHits++;
          if (cleaveHits >= 2) break; // 一刀最多砍3个
        }
      }
    }

    return true;
  }

  private applyHitToEntity(attacker: Entity, target: Entity, skill: SkillDef | undefined, isCleave: boolean): void {
    const isFire = skill?.id === 'fire_slash';
    const result = CombatSystem.calculateAttack(attacker, target, skill, isCleave);

    target.stats.hp = Math.max(0, target.stats.hp - result.damage);

    // 受击物理反馈：怪物受击硬直与微击退
    target.hitStunTicks = 3;
    const kx = Math.sign(target.gridPos.x - attacker.gridPos.x) * 6;
    const ky = Math.sign(target.gridPos.y - attacker.gridPos.y) * 4;
    target.knockbackOffset = { x: kx, y: ky };

    // 震屏力度 (暴击震屏 8px，烈火剑法震屏 14px，普通受击轻震 3px)
    if (attacker.isPlayer) {
      if (isFire) {
        this.screenShake = 14;
      } else if (result.isCrit) {
        this.screenShake = 8;
      } else {
        this.screenShake = Math.max(this.screenShake, 3);
      }
      this.onSound?.(result.isCrit ? 'crit' : 'hit');
    }

    // 飘字
    let color = '#ffffff';
    if (isFire) color = '#f97316';
    else if (result.isCrit) color = '#ef4444';
    else if (isCleave) color = '#38bdf8';

    const text = isFire ? `烈火 -${result.damage}!` : (result.isCrit ? `暴击 -${result.damage}!` : `-${result.damage}`);
    this.addDamagePopup(target.gridPos, text, color, result.isCrit || isFire);

    if (target.stats.hp <= 0) {
      this.handleEntityDeath(target, attacker);
    }
  }

  private handleEntityDeath(deadEntity: Entity, killer: Entity): void {
    deadEntity.state = 'dead';
    deadEntity.respawnTicks = deadEntity.maxRespawnTicks || 60;

    if (!deadEntity.isPlayer) {
      const tmpl = Object.values(MONSTER_TEMPLATES).find(t => t.name === deadEntity.name);
      if (tmpl) {
        const minG = tmpl.goldDrop[0];
        const maxG = tmpl.goldDrop[1];
        const gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
        this.player.stats.gold += gold;
        this.autoStats.goldGained += gold;
        this.autoStats.killCount++;

        this.addExp(tmpl.expReward);

        // 爆装并开启喷泉起跳动画
        const drops = DropSystem.rollMonsterDrops(tmpl, deadEntity.gridPos, this.currentTick);
        for (const drop of drops) {
          this.groundItems.push(drop);
          if (drop.item.quality === 2) this.autoStats.blueDrops++;
          if (drop.item.quality === 3) this.autoStats.purpleDrops++;
          if (drop.item.quality === 4) this.autoStats.orangeDrops++;

          if (drop.item.quality >= 2) {
            this.addBattleLog(`【极品大爆】击败【${deadEntity.name}】，爆出 [${drop.item.name}] 冲天光柱！`, 'drop', drop.item.quality);
          }
        }

        // 击杀普通日志
        this.addBattleLog(`击杀【${deadEntity.name}】，经验 +${tmpl.expReward}，金币 +${gold}`, 'kill');
      }
    } else {
      this.addBattleLog('【阵亡】大侠在战斗中力竭倒下，将在 3 秒后回血复苏！', 'system');
      setTimeout(() => {
        this.player.state = 'idle';
        this.player.stats.hp = Math.floor(this.player.stats.maxHp * 0.5);
        this.player.stats.mp = Math.floor(this.player.stats.maxMp * 0.5);
      }, 3000);
    }
  }

  addExp(amount: number): void {
    this.player.stats.exp += amount;
    this.autoStats.expGained += amount;

    while (this.player.stats.exp >= this.player.stats.maxExp) {
      this.player.stats.exp -= this.player.stats.maxExp;
      this.player.stats.level++;
      
      const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
      this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
      this.player.stats.hp = this.player.stats.maxHp;
      this.player.stats.mp = this.player.stats.maxMp;

      this.onSound?.('levelup');
      this.screenShake = 10;
      this.addDamagePopup(this.player.gridPos, `升级! Lv.${this.player.stats.level}`, '#facc15', true);
      this.addBattleLog(`【升级】金芒贯顶！升至 Lv.${this.player.stats.level}，战力飙升至 ${this.player.stats.combatPower}！`, 'system');
    }
  }

  /**
   * 添加物品到背包 (同类药品无限堆叠合并，装备按槽位独立存放)
   */
  addItemToInventory(item: ItemInstance): boolean {
    if (item.type === 'potion') {
      const existing = this.inventory.find(i => i.defId === item.defId);
      if (existing) {
        existing.count = (existing.count || 1) + (item.count || 1);
        return true;
      }
    }

    if (this.inventory.length >= 40) {
      return false;
    }

    this.inventory.push(item);
    return true;
  }

  private checkPlayerLootPickup(): void {
    // 自动吸附扩大至 2 格
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const drop = this.groundItems[i];
      const dist = PathFinder.chebyshevDistance(this.player.gridPos, drop.gridPos);
      if (dist <= 1) {
        const success = this.addItemToInventory(drop.item);
        if (success) {
          this.groundItems.splice(i, 1);
          this.onSound?.('coin');
          const countText = drop.item.count > 1 ? ` x${drop.item.count}` : '';
          this.addBattleLog(`拾取战利品 [${drop.item.name}]${countText}`, 'drop', drop.item.quality);
        }
      }
    }
  }

  useItem(item: ItemInstance): boolean {
    if (item.type === 'potion') {
      if (item.recoverHp) {
        this.player.stats.hp = Math.min(this.player.stats.maxHp, this.player.stats.hp + item.recoverHp);
        this.addDamagePopup(this.player.gridPos, `+${item.recoverHp}`, '#22c55e', false, true);
      }
      if (item.recoverMp) {
        this.player.stats.mp = Math.min(this.player.stats.maxMp, this.player.stats.mp + item.recoverMp);
      }
      this.onSound?.('potion');

      item.count--;
      if (item.count <= 0) {
        const idx = this.inventory.indexOf(item);
        if (idx !== -1) this.inventory.splice(idx, 1);
      }
      return true;
    }

    if (item.type === 'equipment' && item.slot) {
      this.equipItem(item);
      return true;
    }

    return false;
  }

  equipItem(item: ItemInstance): void {
    if (!item.slot) return;
    let targetSlot = item.slot;

    if (item.slot === 'bracelet_l' && this.equipped['bracelet_l'] && !this.equipped['bracelet_r']) {
      targetSlot = 'bracelet_r';
    } else if (item.slot === 'ring_l' && this.equipped['ring_l'] && !this.equipped['ring_r']) {
      targetSlot = 'ring_r';
    }

    const oldEquip = this.equipped[targetSlot];
    const invIdx = this.inventory.indexOf(item);
    if (invIdx !== -1) this.inventory.splice(invIdx, 1);
    if (oldEquip) this.addItemToInventory(oldEquip);

    this.equipped[targetSlot] = item;

    const oldCp = this.player.stats.combatPower;
    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    const cpDiff = this.player.stats.combatPower - oldCp;

    if (cpDiff > 0) {
      this.addDamagePopup(this.player.gridPos, `战力 +${cpDiff}`, '#fbbf24', true);
    }
  }

  unequipItem(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    if (this.inventory.length >= 40) {
      this.addBattleLog('【背包已满】无法卸下装备！', 'system');
      return false;
    }
    delete this.equipped[slot];
    this.addItemToInventory(item);

    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    return true;
  }

  recycleLowQualityItems(): { gold: number; exp: number; count: number } {
    let gainedGold = 0;
    let gainedExp = 0;
    let count = 0;

    for (let i = this.inventory.length - 1; i >= 0; i--) {
      const item = this.inventory[i];
      if (item.type === 'equipment' && item.quality <= 1) {
        gainedGold += item.price;
        gainedExp += Math.floor(item.price * 0.5);
        count++;
        this.inventory.splice(i, 1);
      }
    }

    if (count > 0) {
      this.player.stats.gold += gainedGold;
      this.addExp(gainedExp);
      this.onSound?.('coin');
      this.addBattleLog(`【一键回收】回收 ${count} 件低品质装备，金币 +${gainedGold}，经验 +${gainedExp}`, 'system');
    }

    return { gold: gainedGold, exp: gainedExp, count };
  }

  addDamagePopup(gridPos: GridCoord, text: string, color: string, isCrit = false, isHeal = false): void {
    this.damagePopups.push({
      id: `popup_${Date.now()}_${Math.random()}`,
      text,
      worldX: gridPos.x,
      worldY: gridPos.y,
      color,
      isCrit,
      isHeal,
      life: 0,
      maxLife: 16,
      vy: 0.06
    });
  }

  addBattleLog(text: string, type: 'kill' | 'drop' | 'system' | 'damage', quality?: any): void {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    this.battleLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      text,
      type,
      quality,
      timestamp: time
    });

    if (this.battleLogs.length > 60) {
      this.battleLogs.pop();
    }
  }

  save(): void {
    StorageManager.saveGame({
      player: {
        level: this.player.stats.level,
        hp: this.player.stats.hp,
        mp: this.player.stats.mp,
        exp: this.player.stats.exp,
        gold: this.player.stats.gold
      },
      equipped: this.equipped,
      inventory: this.inventory,
      autoConfig: this.autoConfig
    });
  }

  load(): boolean {
    const saved = StorageManager.loadGame();
    if (!saved) return false;

    this.player.stats.level = saved.player.level;
    this.player.stats.gold = saved.player.gold;
    this.player.stats.exp = saved.player.exp;
    this.equipped = saved.equipped || {};
    this.inventory = saved.inventory || [];
    this.autoConfig = { ...this.autoConfig, ...saved.autoConfig };

    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    this.player.stats.hp = saved.player.hp || this.player.stats.maxHp;
    this.player.stats.mp = saved.player.mp || this.player.stats.maxMp;

    return true;
  }
}
