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
  // 地图尺寸 36 x 36
  readonly MAP_WIDTH = 36;
  readonly MAP_HEIGHT = 36;
  private obstacles = new Set<string>();

  // 核心世界状态
  player: Entity;
  monsters: Entity[] = [];
  groundItems: GroundItem[] = [];
  inventory: ItemInstance[] = [];
  equipped: Partial<Record<EquipSlot, ItemInstance>> = {};
  skills: SkillDef[] = [];
  
  // 自动化与统计
  autoPilot = new AutoPilot();
  autoConfig: AutoPilotConfig = {
    enabled: false,
    autoPotionHpPercent: 50,
    autoPotionMpPercent: 30,
    autoSkill: true,
    autoPickup: true,
    searchRadius: 12
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

  // 表现层队列
  damagePopups: DamagePopup[] = [];
  battleLogs: BattleLog[] = [];
  currentTick = 0;

  // 音效与特效回调
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
    // 地图四周边缘为边界阻挡
    for (let x = 0; x < this.MAP_WIDTH; x++) {
      this.obstacles.add(`${x},0`);
      this.obstacles.add(`${x},${this.MAP_HEIGHT - 1}`);
    }
    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      this.obstacles.add(`0,${y}`);
      this.obstacles.add(`${this.MAP_WIDTH - 1},${y}`);
    }

    // 随机几处山石树木阻挡
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
      name: '至尊战狂',
      isPlayer: true,
      gridPos: { x: 18, y: 18 },
      targetGridPos: null,
      moveProgress: 0,
      direction: 4, // 初始朝南
      stats: StatCalculator.applyEquipment(base, {}),
      targetEntityId: null,
      lastAttackTick: -100,
      state: 'idle',
      stateTicks: 0
    };
  }

  private initStartingInventory(): void {
    // 新手礼包：初始木剑、粗布衣、几瓶金创药
    const sword = DropSystem.createItemInstance('w_wood_sword', 0);
    const armor = DropSystem.createItemInstance('a_buyi', 0);
    const hpPot = DropSystem.createItemInstance('pot_hp_small', 0, 10);
    const mpPot = DropSystem.createItemInstance('pot_mp_large', 1, 5);

    if (sword) this.equipItem(sword);
    if (armor) this.equipItem(armor);
    if (hpPot) this.inventory.push(hpPot);
    if (mpPot) this.inventory.push(mpPot);

    this.addBattleLog('【系统】欢迎来到热血单机传奇！按【T】开启自动挂机，【B】打开背包，【C】查看人物面板。', 'system');
  }

  private spawnInitialMonsters(): void {
    // 在不同区域分布不同强度的怪群
    const monsterDistributions = [
      // 新手区 (中央周边)
      { templateId: 'm_scarecrow', count: 8, center: { x: 15, y: 15 }, radius: 6 },
      { templateId: 'm_cat', count: 6, center: { x: 22, y: 15 }, radius: 5 },
      // 进阶区 (中外围)
      { templateId: 'm_spider', count: 5, center: { x: 12, y: 24 }, radius: 5 },
      { templateId: 'm_skeleton', count: 6, center: { x: 24, y: 25 }, radius: 6 },
      { templateId: 'm_zombie', count: 4, center: { x: 8, y: 18 }, radius: 5 },
      // 危险首领区 (四角角落)
      { templateId: 'm_white_pig', count: 2, center: { x: 28, y: 8 }, radius: 4 },
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
          icon: template.icon
        });
      }
    }
  }

  /**
   * 主循环 Tick (由外部定时器每 100ms 触发一次)
   */
  tick(): void {
    this.currentTick++;

    // 1. 更新技能冷却
    for (const skill of this.skills) {
      if (skill.currentCdTicks > 0) {
        skill.currentCdTicks--;
      }
    }

    // 2. 玩家位移插值更新
    this.updateEntityMovement(this.player);

    // 3. 玩家脚下自动拾取
    this.checkPlayerLootPickup();

    // 4. 挂机 AI 决策与执行
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

    // 5. 怪物逻辑 (移动插值、AI 追击、普攻、复活)
    for (const m of this.monsters) {
      if (m.state === 'dead') {
        if (m.respawnTicks !== undefined && m.respawnTicks > 0) {
          m.respawnTicks--;
          if (m.respawnTicks <= 0) {
            // 复活怪物
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

      // 怪物行为 AI
      if (m.state === 'idle' || m.state === 'walking') {
        const distToPlayer = PathFinder.chebyshevDistance(m.gridPos, this.player.gridPos);

        // 仇恨感知半径 (Boss 8格，小怪 5格)
        const aggroRadius = m.isBoss ? 8 : 5;
        if (distToPlayer <= aggroRadius && this.player.state !== 'dead') {
          if (distToPlayer <= 1) {
            // 贴脸近战攻击玩家
            if (CombatSystem.canAttack(m, this.currentTick)) {
              this.executeAttack(m, this.player);
            }
          } else {
            // 追击玩家
            if (Math.random() < 0.35 && !m.targetGridPos) {
              const path = PathFinder.findPath(m.gridPos, this.player.gridPos, this.isWalkable, 80);
              if (path.length > 0) {
                this.startEntityMove(m, path[0]);
              }
            }
          }
        } else if (Math.random() < 0.05 && !m.targetGridPos && m.spawnOrigin) {
          // 闲暇随机巡逻游荡
          const wanderDx = Math.floor(Math.random() * 3) - 1;
          const wanderDy = Math.floor(Math.random() * 3) - 1;
          const wx = m.gridPos.x + wanderDx;
          const wy = m.gridPos.y + wanderDy;
          if (this.isWalkable(wx, wy) && PathFinder.chebyshevDistance({ x: wx, y: wy }, m.spawnOrigin) <= 4) {
            this.startEntityMove(m, { x: wx, y: wy });
          }
        }
      }
    }

    // 6. 飘字与掉落物生命期更新
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

    // 移动平滑插值 (按急速适当略微加快步伐)
    const speed = entity.isPlayer ? 0.25 : 0.18;
    entity.moveProgress += speed;

    if (entity.moveProgress >= 1.0) {
      entity.gridPos = { ...entity.targetGridPos };
      entity.targetGridPos = null;
      entity.moveProgress = 0;
      entity.state = 'idle';
    }
  }

  private startEntityMove(entity: Entity, targetPos: GridCoord): void {
    if (!this.isWalkable(targetPos.x, targetPos.y)) return;
    entity.direction = PathFinder.getDirection(entity.gridPos, targetPos);
    entity.targetGridPos = { ...targetPos };
    entity.moveProgress = 0;
    entity.state = 'walking';
  }

  /**
   * 触发攻击行为
   */
  executeAttack(attacker: Entity, target: Entity, skill?: SkillDef): boolean {
    if (!CombatSystem.canAttack(attacker, this.currentTick)) {
      return false;
    }

    // 朝向目标
    attacker.direction = PathFinder.getDirection(attacker.gridPos, target.gridPos);
    attacker.lastAttackTick = this.currentTick;
    attacker.state = 'attacking';

    // 消耗法力值
    if (skill && skill.manaCost > 0) {
      attacker.stats.mp = Math.max(0, attacker.stats.mp - skill.manaCost);
      skill.currentCdTicks = skill.cdTicks;
    }

    // 音效与刀光
    const isFire = skill?.id === 'fire_slash';
    if (attacker.isPlayer) {
      this.onSound?.(isFire ? 'fire' : 'swing');
      this.onSlashVFX?.(attacker.gridPos, attacker.direction, isFire, attacker.stats.haste);
    }

    // 战斗伤害计算
    const result = CombatSystem.calculateAttack(attacker, target, skill);

    // 目标扣血
    target.stats.hp = Math.max(0, target.stats.hp - result.damage);

    // 命中与暴击音效
    if (attacker.isPlayer) {
      this.onSound?.(result.isCrit ? 'crit' : 'hit');
    }

    // 产生飘字
    this.addDamagePopup(
      target.gridPos, 
      result.isCrit ? `暴击 -${result.damage}` : `-${result.damage}`,
      result.isCrit ? '#ef4444' : (attacker.isPlayer ? '#ffffff' : '#f59e0b'),
      result.isCrit
    );

    // 目标死亡判定
    if (target.stats.hp <= 0) {
      this.handleEntityDeath(target, attacker);
    }

    return true;
  }

  private handleEntityDeath(deadEntity: Entity, killer: Entity): void {
    deadEntity.state = 'dead';
    deadEntity.respawnTicks = deadEntity.maxRespawnTicks || 60;

    if (!deadEntity.isPlayer) {
      // 怪物被杀：给玩家结算经验与金币、爆装备
      const tmpl = Object.values(MONSTER_TEMPLATES).find(t => t.name === deadEntity.name);
      if (tmpl) {
        // 1. 金币结算
        const minG = tmpl.goldDrop[0];
        const maxG = tmpl.goldDrop[1];
        const gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
        this.player.stats.gold += gold;
        this.autoStats.goldGained += gold;
        this.autoStats.killCount++;

        // 2. 经验结算
        this.addExp(tmpl.expReward);

        // 3. 爆一地掉落
        const drops = DropSystem.rollMonsterDrops(tmpl, deadEntity.gridPos, this.currentTick);
        for (const drop of drops) {
          this.groundItems.push(drop);
          if (drop.item.quality === 2) this.autoStats.blueDrops++;
          if (drop.item.quality === 3) this.autoStats.purpleDrops++;
          if (drop.item.quality === 4) this.autoStats.orangeDrops++;

          // 极品掉落推送战斗日志
          if (drop.item.quality >= 2) {
            this.addBattleLog(`【爆装】怪物【${deadEntity.name}】大爆，掉落了 [${drop.item.name}]！`, 'drop', drop.item.quality);
          }
        }

        // 击杀普通日志
        this.addBattleLog(`击杀了【${deadEntity.name}】，获得经验 +${tmpl.expReward}，金币 +${gold}`, 'kill');
      }
    } else {
      // 玩家死亡
      this.addBattleLog('【阵亡】胜败乃兵家常事，大侠在战斗中力竭倒下，将在 3 秒后原地回血复苏！', 'system');
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

    // 升级检测循环
    while (this.player.stats.exp >= this.player.stats.maxExp) {
      this.player.stats.exp -= this.player.stats.maxExp;
      this.player.stats.level++;
      
      // 重新计算基准与装备
      const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
      this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
      this.player.stats.hp = this.player.stats.maxHp;
      this.player.stats.mp = this.player.stats.maxMp;

      this.onSound?.('levelup');
      this.addDamagePopup(this.player.gridPos, `升级! Lv.${this.player.stats.level}`, '#facc15', true);
      this.addBattleLog(`【升级】金芒贯顶！恭喜升至 Lv.${this.player.stats.level}，战力飙升至 ${this.player.stats.combatPower}！`, 'system');
    }
  }

  private checkPlayerLootPickup(): void {
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const drop = this.groundItems[i];
      if (drop.gridPos.x === this.player.gridPos.x && drop.gridPos.y === this.player.gridPos.y) {
        // 拾取到背包
        if (this.inventory.length < 40) {
          this.groundItems.splice(i, 1);
          this.inventory.push(drop.item);
          this.onSound?.('coin');
          this.addBattleLog(`拾取了战利品 [${drop.item.name}]`, 'drop', drop.item.quality);
        }
      }
    }
  }

  /**
   * 使用物品 (药水饮用 或 装备穿戴)
   */
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

      // 扣减背包药水
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

  /**
   * 穿戴装备 (支持自动替换对应槽位)
   */
  equipItem(item: ItemInstance): void {
    if (!item.slot) return;

    let targetSlot = item.slot;

    // 手镯和戒指支持左右双槽位
    if (item.slot === 'bracelet_l') {
      if (this.equipped['bracelet_l'] && !this.equipped['bracelet_r']) {
        targetSlot = 'bracelet_r';
      }
    } else if (item.slot === 'ring_l') {
      if (this.equipped['ring_l'] && !this.equipped['ring_r']) {
        targetSlot = 'ring_r';
      }
    }

    const oldEquip = this.equipped[targetSlot];

    // 从背包移除新装备
    const invIdx = this.inventory.indexOf(item);
    if (invIdx !== -1) {
      this.inventory.splice(invIdx, 1);
    }

    // 旧装备退回背包
    if (oldEquip) {
      this.inventory.push(oldEquip);
    }

    this.equipped[targetSlot] = item;

    // 重新聚合属性与战力
    const oldCp = this.player.stats.combatPower;
    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    const cpDiff = this.player.stats.combatPower - oldCp;

    if (cpDiff > 0) {
      this.addDamagePopup(this.player.gridPos, `战力 +${cpDiff}`, '#fbbf24', true);
    }
  }

  /**
   * 卸下装备
   */
  unequipItem(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;

    if (this.inventory.length >= 40) {
      this.addBattleLog('【背包已满】无法卸下装备，请先清理背包！', 'system');
      return false;
    }

    delete this.equipped[slot];
    this.inventory.push(item);

    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    return true;
  }

  /**
   * 一键回收：变卖背包内所有的白装(0)与绿装(1)为金币与微量经验
   */
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
      this.addBattleLog(`【一键回收】成功回收 ${count} 件低品质装备，获得金币 +${gainedGold}，经验 +${gainedExp}`, 'system');
    }

    return { gold: gainedGold, exp: gainedExp, count };
  }

  /**
   * 飘字辅助
   */
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
      maxLife: 15,
      vy: 0.05
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

    // 日志上限 60 条
    if (this.battleLogs.length > 60) {
      this.battleLogs.pop();
    }
  }

  /**
   * 保存当前状态
   */
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

  /**
   * 读取存档恢复
   */
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
