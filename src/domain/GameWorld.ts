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

const DIR_OFFSETS: Record<Direction8, { x: number; y: number }> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: -1 },
  2: { x: 1, y: 0 },
  3: { x: 1, y: 1 },
  4: { x: 0, y: 1 },
  5: { x: -1, y: 1 },
  6: { x: -1, y: 0 },
  7: { x: -1, y: -1 }
};

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
    autoHpPotion: true,
    autoPotionHpPercent: 50,
    autoMpPotion: true,
    autoPotionMpPercent: 30,
    autoSkill: true,
    autoPickup: true,
    autoRecycleWeaker: true,
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

  onSound?: (name: 'swing' | 'hit' | 'crit' | 'coin' | 'potion' | 'levelup' | 'fire' | 'phantom') => void;
  onSlashVFX?: (gridPos: GridCoord, dir: Direction8, isFire: boolean, haste: number, isPhantom?: boolean) => void;

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
      { templateId: 'm_scarecrow', count: 6, center: { x: 16, y: 16 }, radius: 6 },
      { templateId: 'm_cat', count: 5, center: { x: 22, y: 16 }, radius: 5 },
      { templateId: 'm_spider', count: 4, center: { x: 14, y: 24 }, radius: 5 },
      { templateId: 'm_skeleton', count: 5, center: { x: 24, y: 25 }, radius: 6 },
      { templateId: 'm_zombie', count: 4, center: { x: 10, y: 18 }, radius: 5 },
      { templateId: 'm_white_pig', count: 5, center: { x: 28, y: 10 }, radius: 6 }, // 增加至 5 只白野猪精英
      { templateId: 'm_wooma_boss', count: 2, center: { x: 28, y: 28 }, radius: 4 }, // 增加至 2 只沃玛教主首领
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

    // 玩家护体神盾与中毒倒计时
    if (this.player.shieldAegisTicks && this.player.shieldAegisTicks > 0) {
      this.player.shieldAegisTicks--;
    }
    if (this.player.poisonTicks && this.player.poisonTicks > 0) {
      this.player.poisonTicks--;
      if (this.currentTick % 10 === 0 && this.player.state !== 'dead') {
        this.player.stats.hp = Math.max(1, this.player.stats.hp - 18);
        this.addDamagePopup(this.player.gridPos, '-18 毒', '#22c55e', false);
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

      // Boss 专属技能与狂暴机制
      if (m.isBoss) {
        m.bossSkillTimer = (m.bossSkillTimer || 0) + 1;

        // 绝境狂暴 (生命低于 45%)
        if (!m.isBossEnraged && m.stats.hp < m.stats.maxHp * 0.45) {
          m.isBossEnraged = true;
          m.stats.haste += 20;
          m.stats.minDC = Math.floor(m.stats.minDC * 1.3);
          m.stats.maxDC = Math.floor(m.stats.maxDC * 1.3);
          this.addDamagePopup(m.gridPos, '🔥绝境狂暴!', '#ef4444', true);
          this.addBattleLog(`【首领狂暴】${m.name} 陷入绝境狂暴！全身赤红，攻速与攻击力飙升！`, 'system');
          this.screenShake = 10;
        }

        // 沃玛教主：【狂雷天降】(每7秒向玩家降下雷电轰击)
        if (m.name.includes('沃玛教主') && m.bossSkillTimer >= 65) {
          const dist = PathFinder.chebyshevDistance(m.gridPos, this.player.gridPos);
          if (dist <= 8 && this.player.state !== 'dead') {
            m.bossSkillTimer = 0;
            let lightningDmg = Math.floor(m.stats.maxDC * 1.5);
            if (this.player.shieldAegisTicks && this.player.shieldAegisTicks > 0) {
              lightningDmg = Math.max(1, Math.floor(lightningDmg * 0.60));
            }
            this.player.stats.hp = Math.max(0, this.player.stats.hp - lightningDmg);
            this.addDamagePopup(this.player.gridPos, `⚡狂雷 -${lightningDmg}!`, '#38bdf8', true);
            this.screenShake = 12;
            this.onSound?.('crit');
            this.addBattleLog(`【沃玛狂雷】教主引动九天神雷狂轰而下，造成 -${lightningDmg} 点雷电重创！`, 'system');
            if (this.player.stats.hp <= 0) {
              this.handleEntityDeath(this.player, m);
            }
          }
        }

        // 赤月恶魔：【赤月地刺】(每8秒召唤全屏尖锐地刺与恶魔剧毒)
        if (m.name.includes('赤月恶魔') && m.bossSkillTimer >= 75) {
          const dist = PathFinder.chebyshevDistance(m.gridPos, this.player.gridPos);
          if (dist <= 10 && this.player.state !== 'dead') {
            m.bossSkillTimer = 0;
            let spikeDmg = Math.floor(m.stats.maxDC * 1.8);
            if (this.player.shieldAegisTicks && this.player.shieldAegisTicks > 0) {
              spikeDmg = Math.max(1, Math.floor(spikeDmg * 0.60));
            }
            this.player.stats.hp = Math.max(0, this.player.stats.hp - spikeDmg);
            this.player.poisonTicks = 40; // 持续中毒 4秒
            this.addDamagePopup(this.player.gridPos, `🗡️地刺 -${spikeDmg}!`, '#b91c1c', true);
            this.screenShake = 16;
            this.onSound?.('crit');
            this.addBattleLog(`【赤月地刺】恶魔召唤全屏尖锐地刺破土而出，造成 -${spikeDmg} 穿透伤害并附加恶魔剧毒！`, 'system');
            if (this.player.stats.hp <= 0) {
              this.handleEntityDeath(this.player, m);
            }
          }
        }
      }

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

    // 护体神盾 (自身玄金护盾，持续50 ticks = 5秒)
    if (skill?.id === 'shield_aegis') {
      attacker.stats.mp = Math.max(0, attacker.stats.mp - skill.manaCost);
      skill.currentCdTicks = skill.cdTicks;
      attacker.shieldAegisTicks = 50;
      this.onSound?.('crit');
      this.addDamagePopup(attacker.gridPos, '🛡️护体神盾!', '#38bdf8', true);
      this.addBattleLog('【护体神盾】玄金罡气护体！受到伤害大幅降低 40% 并反震 40% 受击伤害！', 'system');
      this.gainSkillProficiency(skill, 20);
      return true;
    }

    attacker.direction = PathFinder.getDirection(attacker.gridPos, primaryTarget.gridPos);
    attacker.lastAttackTick = this.currentTick;
    attacker.state = 'attacking';

    if (skill && skill.manaCost > 0) {
      attacker.stats.mp = Math.max(0, attacker.stats.mp - skill.manaCost);
      skill.currentCdTicks = skill.cdTicks;
    }

    const isFire = skill?.id === 'fire_slash';
    const isHeaven = skill?.id === 'heaven_splitter';
    const isSun = skill?.id === 'sun_slash';

    // 音效与刀光
    if (attacker.isPlayer) {
      this.onSound?.(isFire || isSun ? 'fire' : (isHeaven ? 'crit' : 'swing'));
      this.onSlashVFX?.(attacker.gridPos, attacker.direction, isFire || isSun, attacker.stats.haste);

      // 释放技能获得熟练度 (主动技能 +15，基础普攻 +5)
      if (skill) {
        this.gainSkillProficiency(skill, 15);
      } else {
        const basicSkill = this.skills.find(s => s.id === 'basic_slash');
        if (basicSkill) {
          this.gainSkillProficiency(basicSkill, 5);
        }
      }

      // 积累连斩怒气
      this.comboCount++;
      this.comboTimer = 40; // 4秒刷新
      if (this.comboCount >= 15 && !this.isBerserk) {
        this.isBerserk = true;
        this.onSound?.('crit');
        this.addBattleLog('【进入狂暴】连斩破百，战意滔天！移动速度与攻击暴击大幅飙升！', 'system');
      }
    }

    const effectiveSkill = skill || (attacker.isPlayer ? this.skills.find(s => s.id === 'basic_slash') : undefined);

    // 1. 直线贯穿神技处理：开天斩 (3格贯穿巨刃) 与 逐日剑法 (4格贯穿烈阳极光)
    if (attacker.isPlayer && (isHeaven || isSun)) {
      const maxRange = isSun ? 4 : 3;
      const offset = DIR_OFFSETS[attacker.direction] || { x: 0, y: 1 };
      const hitMonsters = new Set<string>();

      for (let step = 1; step <= maxRange; step++) {
        const checkPos = {
          x: attacker.gridPos.x + offset.x * step,
          y: attacker.gridPos.y + offset.y * step
        };
        for (const m of this.monsters) {
          if (m.state !== 'dead' && m.gridPos.x === checkPos.x && m.gridPos.y === checkPos.y && !hitMonsters.has(m.id)) {
            hitMonsters.add(m.id);
            this.applyHitToEntity(attacker, m, effectiveSkill, false);
          }
        }
      }

      // 若所选主目标未在正前方格子上，也确保击中主目标
      if (!hitMonsters.has(primaryTarget.id) && primaryTarget.state !== 'dead') {
        this.applyHitToEntity(attacker, primaryTarget, effectiveSkill, false);
      }

      // 逐日剑法 100% 触发双重残影极速追击！
      if (isSun) {
        this.applyPhantomHit(attacker, primaryTarget, 1);
        this.applyPhantomHit(attacker, primaryTarget, 2);
      }
    } else {
      // 普通攻击/烈火/刺杀/攻杀：打主目标
      this.applyHitToEntity(attacker, primaryTarget, effectiveSkill, false);

      // 2. 经典战士【半月弯刀】顺劈斩机制 (清怪极度爽快！顺劈身边最多2只额外小怪)
      if (attacker.isPlayer) {
        let cleaveHits = 0;
        for (const other of this.monsters) {
          if (other.id === primaryTarget.id || other.state === 'dead') continue;
          const distToPlayer = PathFinder.chebyshevDistance(attacker.gridPos, other.gridPos);
          const distToTarget = PathFinder.chebyshevDistance(primaryTarget.gridPos, other.gridPos);

          // 目标邻近且在身前 1 格以内
          if (distToPlayer <= 1 && distToTarget <= 2) {
            this.applyHitToEntity(attacker, other, effectiveSkill, true);
            cleaveHits++;
            if (cleaveHits >= 2) break; // 一刀最多砍3个
          }
        }
      }
    }

    // 3. 【风雷残影·连击斩】(攻速溢出极限转化，触发瞬间双刀/多重影袭)
    if (attacker.isPlayer && !isSun) {
      this.triggerPhantomStrikes(attacker, primaryTarget);
    }

    return true;
  }

  /**
   * 攻速溢出转化机制：触发【风雷残影·连击斩】(双刀或多重影袭)
   */
  private triggerPhantomStrikes(attacker: Entity, primaryTarget: Entity): void {
    const rate = attacker.stats.phantomStrikeRate || 0;
    if (rate <= 0) return;

    // 溢出连击判定：满 1.0 必出第一道残影，超出部分概率触发第二道残影 (三重斩)
    const guaranteedHits = Math.floor(rate);
    const extraChance = rate - guaranteedHits;
    let hitCount = guaranteedHits + (Math.random() < extraChance ? 1 : 0);
    if (hitCount <= 0) return;

    hitCount = Math.min(3, hitCount); // 单刀最高追击 3 段

    for (let i = 0; i < hitCount; i++) {
      // 优先原目标；若原目标已阵亡，自动顺延追击身旁存活小怪 (残影追魂)
      let target: Entity | null = primaryTarget.state !== 'dead' ? primaryTarget : null;
      if (!target) {
        target = this.monsters.find(m => 
          m.state !== 'dead' && 
          PathFinder.chebyshevDistance(attacker.gridPos, m.gridPos) <= 1
        ) || null;
      }
      if (!target) break;

      this.applyPhantomHit(attacker, target, i + 1);
    }
  }

  /**
   * 结算单段残影连斩伤害与视听反馈
   */
  private applyPhantomHit(attacker: Entity, target: Entity, _hitIndex: number): void {
    // 残影斩击造成约 70% 伤害，支持独立暴击与闪避判定
    const result = CombatSystem.calculateAttack(attacker, target, undefined, false);
    if (result.isDodge) {
      this.addDamagePopup(target.gridPos, 'MISS', '#94a3b8', false);
      return;
    }

    const phantomDamage = Math.max(1, Math.floor(result.damage * 0.70));
    target.stats.hp = Math.max(0, target.stats.hp - phantomDamage);

    // 受击物理反馈：轻微硬直与击退
    target.hitStunTicks = 2;
    const kx = Math.sign(target.gridPos.x - attacker.gridPos.x) * 4;
    const ky = Math.sign(target.gridPos.y - attacker.gridPos.y) * 3;
    target.knockbackOffset = { x: kx, y: ky };

    // 播放残影剑鸣音效与青金残影刀光
    this.onSound?.('phantom');
    this.onSlashVFX?.(attacker.gridPos, attacker.direction, false, attacker.stats.haste, true);
    this.screenShake = Math.max(this.screenShake, 5);

    // 飘字：金色高亮 ⚡连击 / ⚡残影暴击
    const text = result.isCrit ? `⚡残影暴击 -${phantomDamage}!` : `⚡连击 -${phantomDamage}!`;
    this.addDamagePopup(target.gridPos, text, '#facc15', true);

    // 玩家稀有吸血判定 (残影连击生命吸取)
    if (attacker.isPlayer && attacker.stats.lifestealRate > 0 && phantomDamage > 0) {
      const heal = Math.max(1, Math.floor(phantomDamage * attacker.stats.lifestealRate));
      if (attacker.stats.hp < attacker.stats.maxHp) {
        attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + heal);
        this.addDamagePopup(attacker.gridPos, `+${heal}`, '#22c55e', false, true);
      }
    }

    // 积累连斩怒气
    this.comboCount++;

    if (target.stats.hp <= 0) {
      this.handleEntityDeath(target, attacker);
    }
  }

  private applyHitToEntity(attacker: Entity, target: Entity, skill: SkillDef | undefined, isCleave: boolean): void {
    const isFire = skill?.id === 'fire_slash';
    const isHeaven = skill?.id === 'heaven_splitter';
    const isSun = skill?.id === 'sun_slash';
    const result = CombatSystem.calculateAttack(attacker, target, skill, isCleave);

    // 目标物理闪避成功：伤害为 0，飘出灰色 MISS 字体，无受击硬直
    if (result.isDodge) {
      this.addDamagePopup(target.gridPos, 'MISS', '#94a3b8', false);
      return;
    }

    let finalDamage = result.damage;

    // 护体神盾：受到伤害降低 40%，并将 40% 伤害反震攻击者
    if (target.isPlayer && target.shieldAegisTicks && target.shieldAegisTicks > 0) {
      const reduced = Math.max(1, Math.floor(finalDamage * 0.60));
      const reflect = Math.max(1, Math.floor(finalDamage * 0.40));
      finalDamage = reduced;

      if (!attacker.isPlayer && attacker.state !== 'dead') {
        attacker.stats.hp = Math.max(0, attacker.stats.hp - reflect);
        this.addDamagePopup(attacker.gridPos, `🛡️反弹 -${reflect}`, '#38bdf8', false);
        if (attacker.stats.hp <= 0) {
          this.handleEntityDeath(attacker, target);
        }
      }
    }

    target.stats.hp = Math.max(0, target.stats.hp - finalDamage);

    // 受击物理反馈：怪物受击硬直与微击退
    target.hitStunTicks = isSun ? 5 : (isHeaven ? 4 : 3);
    const kx = Math.sign(target.gridPos.x - attacker.gridPos.x) * (isHeaven ? 10 : 6);
    const ky = Math.sign(target.gridPos.y - attacker.gridPos.y) * (isHeaven ? 8 : 4);
    target.knockbackOffset = { x: kx, y: ky };

    // 震屏力度 (逐日 18px, 开天 15px, 烈火 14px, 暴击 8px, 普通 3px)
    if (attacker.isPlayer) {
      if (isSun) {
        this.screenShake = 18;
      } else if (isHeaven) {
        this.screenShake = 15;
      } else if (isFire) {
        this.screenShake = 14;
      } else if (result.isCrit) {
        this.screenShake = 8;
      } else {
        this.screenShake = Math.max(this.screenShake, 3);
      }
      this.onSound?.((isFire || isSun || isHeaven || result.isCrit) ? 'crit' : 'hit');
    }

    // 飘字
    let color = '#ffffff';
    if (isSun) color = '#fbbf24';
    else if (isHeaven) color = '#a855f7';
    else if (isFire) color = '#f97316';
    else if (result.isCrit) color = '#ef4444';
    else if (isCleave) color = '#38bdf8';

    let text = `-${finalDamage}`;
    if (isSun) text = `☀️逐日 -${finalDamage}!`;
    else if (isHeaven) text = `🌟开天 -${finalDamage}!`;
    else if (isFire) text = `烈火 -${finalDamage}!`;
    else if (result.isCrit) text = `暴击 -${finalDamage}!`;

    this.addDamagePopup(target.gridPos, text, color, result.isCrit || isFire || isHeaven || isSun);

    // 玩家稀有吸血判定 (出厂2% + 装备累加)
    if (attacker.isPlayer && attacker.stats.lifestealRate > 0 && finalDamage > 0) {
      const heal = Math.max(1, Math.floor(finalDamage * attacker.stats.lifestealRate));
      if (attacker.stats.hp < attacker.stats.maxHp) {
        attacker.stats.hp = Math.min(attacker.stats.maxHp, attacker.stats.hp + heal);
        this.addDamagePopup(attacker.gridPos, `+${heal}`, '#22c55e', false, true);
      }
    }

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

      const milestone = StatCalculator.getLevelMilestone(this.player.stats.level);
      if (this.player.stats.level % 5 === 0) {
        this.addDamagePopup(this.player.gridPos, `境界突破【${milestone.title}】!`, '#f59e0b', true);
        this.addBattleLog(
          `【境界突破】恭喜大侠突破 Lv.${this.player.stats.level}，晋升境界【${milestone.title}】！急速+${milestone.haste}，暴击+${(milestone.critRate * 100).toFixed(0)}%，闪避+${(milestone.dodgeRate * 100).toFixed(0)}%！`,
          'system'
        );
      } else {
        this.addDamagePopup(this.player.gridPos, `升级! Lv.${this.player.stats.level}`, '#facc15', true);
        this.addBattleLog(`【升级】金芒贯顶！升至 Lv.${this.player.stats.level}，战力飙升至 ${this.player.stats.combatPower}！`, 'system');
      }
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

          // 挂机智能回收：若开启了自动回收弱装，且背包容量已达 35 格以上
          if (this.autoConfig.enabled && this.autoConfig.autoRecycleWeaker && this.inventory.length >= 35) {
            this.recycleWeakerOrEqualItems();
          }
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

  /**
   * 一键穿戴同位置战力最优装备 (比对全身同部位战力评分，智能换装)
   */
  oneKeyEquipBest(): number {
    let replacedCount = 0;
    const playerLevel = this.player.stats.level;

    // 1. 单槽位比对优化: weapon, armor, helmet, necklace
    const singleSlots: EquipSlot[] = ['weapon', 'armor', 'helmet', 'necklace'];
    for (const slot of singleSlots) {
      const current = this.equipped[slot];
      const currentPower = current ? StatCalculator.getItemCombatPower(current) : -1;

      let bestItemIdx = -1;
      let bestPower = currentPower;

      for (let i = 0; i < this.inventory.length; i++) {
        const item = this.inventory[i];
        if (item.type !== 'equipment' || item.slot !== slot) continue;
        if (item.levelReq && item.levelReq > playerLevel) continue;

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
    replacedCount += this.optimizeDualSlots(['bracelet_l', 'bracelet_r'], playerLevel);

    // 3. 双槽位戒指比对优化 (ring_l, ring_r)
    replacedCount += this.optimizeDualSlots(['ring_l', 'ring_r'], playerLevel);

    // 重新计算全身属性与战力
    const oldCp = this.player.stats.combatPower;
    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    const cpDiff = this.player.stats.combatPower - oldCp;

    if (replacedCount > 0) {
      this.onSound?.('levelup');
      if (cpDiff > 0) {
        this.addDamagePopup(this.player.gridPos, `战力 +${cpDiff}`, '#fbbf24', true);
      }
      this.addBattleLog(
        `【一键穿戴】成功更换了 ${replacedCount} 件更强同部位装备，战力提升至 ${this.player.stats.combatPower}！`,
        'system'
      );
    } else {
      this.addBattleLog('【一键穿戴】当前身上穿戴已是同部位最高战力搭配！', 'system');
    }

    return replacedCount;
  }

  private optimizeDualSlots(slots: [EquipSlot, EquipSlot], playerLevel: number): number {
    const [slot1, slot2] = slots;
    const isMatchingSlot = (itemSlot?: EquipSlot) => itemSlot === slot1 || itemSlot === slot2;

    interface Candidate {
      item: ItemInstance;
      power: number;
    }

    const candidates: Candidate[] = [];
    if (this.equipped[slot1]) {
      candidates.push({
        item: this.equipped[slot1]!,
        power: StatCalculator.getItemCombatPower(this.equipped[slot1]!)
      });
    }
    if (this.equipped[slot2]) {
      candidates.push({
        item: this.equipped[slot2]!,
        power: StatCalculator.getItemCombatPower(this.equipped[slot2]!)
      });
    }

    for (const it of this.inventory) {
      if (it.type === 'equipment' && isMatchingSlot(it.slot)) {
        if (!it.levelReq || it.levelReq <= playerLevel) {
          candidates.push({
            item: it,
            power: StatCalculator.getItemCombatPower(it)
          });
        }
      }
    }

    // 按战力从高到低排序
    candidates.sort((a, b) => b.power - a.power);

    const desiredItems: ItemInstance[] = [];
    if (candidates[0]) desiredItems.push(candidates[0].item);
    if (candidates[1]) desiredItems.push(candidates[1].item);

    const current1 = this.equipped[slot1];
    const current2 = this.equipped[slot2];

    const currentItems: ItemInstance[] = [];
    if (current1) currentItems.push(current1);
    if (current2) currentItems.push(current2);

    const isSameSet = desiredItems.length === currentItems.length &&
      desiredItems.every(d => currentItems.includes(d));

    if (isSameSet) {
      return 0;
    }

    // 卸下当前槽位
    if (current1) {
      delete this.equipped[slot1];
      this.addItemToInventory(current1);
    }
    if (current2) {
      delete this.equipped[slot2];
      this.addItemToInventory(current2);
    }

    let changes = 0;
    if (desiredItems[0]) {
      const idx = this.inventory.indexOf(desiredItems[0]);
      if (idx !== -1) this.inventory.splice(idx, 1);
      this.equipped[slot1] = desiredItems[0];
      changes++;
    }
    if (desiredItems[1]) {
      const idx = this.inventory.indexOf(desiredItems[1]);
      if (idx !== -1) this.inventory.splice(idx, 1);
      this.equipped[slot2] = desiredItems[1];
      changes++;
    }

    return changes;
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

  /**
   * 一键回收战力小于等于身上穿戴装备的同部位冗余装备
   * (严格按同位置比对：保留可能换上的更强神装，精准熔炼弱于同位置穿戴的一切冗余装备)
   */
  recycleWeakerOrEqualItems(): { gold: number; exp: number; count: number } {
    let gainedGold = 0;
    let gainedExp = 0;
    let count = 0;

    // 标记需要保留在背包的极品神装 (避免误熔比身上更好的提升件)
    const keepIndices = new Set<number>();

    // 1. 单槽位优化比对: weapon, armor, helmet, necklace
    const singleSlots: EquipSlot[] = ['weapon', 'armor', 'helmet', 'necklace'];
    for (const slot of singleSlots) {
      const equippedItem = this.equipped[slot];
      const equippedPower = equippedItem ? StatCalculator.getItemCombatPower(equippedItem) : -1;

      // 找出背包内属于该部位的所有装备并按战力降序排序
      const candidates: { index: number; power: number }[] = [];
      for (let i = 0; i < this.inventory.length; i++) {
        const it = this.inventory[i];
        if (it.type === 'equipment' && it.slot === slot) {
          candidates.push({ index: i, power: StatCalculator.getItemCombatPower(it) });
        }
      }
      candidates.sort((a, b) => b.power - a.power);

      // 若背包内存在比身上该部位更强 (或该部位未穿戴时最强) 的装备，仅保留最强 1 件，其余皆为冗余
      if (candidates.length > 0) {
        if (candidates[0].power > equippedPower) {
          keepIndices.add(candidates[0].index);
        }
      }
    }

    // 2. 双槽位手镯比对优化: bracelets (bracelet_l, bracelet_r)
    this.markKeepForDualSlots(['bracelet_l', 'bracelet_r'], keepIndices);

    // 3. 双槽位戒指比对优化: rings (ring_l, ring_r)
    this.markKeepForDualSlots(['ring_l', 'ring_r'], keepIndices);

    // 4. 执行回收：所有装备类型中，未被保留的均 <= 身上同位置或同部位已有更优选，全部熔炼！
    for (let i = this.inventory.length - 1; i >= 0; i--) {
      const item = this.inventory[i];
      if (item.type !== 'equipment' || !item.slot) continue;

      if (!keepIndices.has(i)) {
        gainedGold += item.price;
        gainedExp += Math.floor(item.price * 0.6);
        count++;
        this.inventory.splice(i, 1);
      }
    }

    if (count > 0) {
      this.player.stats.gold += gainedGold;
      this.addExp(gainedExp);
      this.onSound?.('coin');
      this.addBattleLog(
        `【智能回收】成功按同部位熔炼 ${count} 件弱于身上的冗余装备，获得金币 +${gainedGold}，经验 +${gainedExp}！`,
        'system'
      );
    } else {
      this.addBattleLog('【智能回收】背包中无弱于身上的同部位冗余装备，极品神装已妥善保留！', 'system');
    }

    return { gold: gainedGold, exp: gainedExp, count };
  }

  private markKeepForDualSlots(slots: [EquipSlot, EquipSlot], keepIndices: Set<number>): void {
    const [slot1, slot2] = slots;
    const isMatchingSlot = (s?: EquipSlot) => s === slot1 || s === slot2;

    const eq1 = this.equipped[slot1];
    const eq2 = this.equipped[slot2];

    const p1 = eq1 ? StatCalculator.getItemCombatPower(eq1) : -1;
    const p2 = eq2 ? StatCalculator.getItemCombatPower(eq2) : -1;

    // 身上佩戴两件的战力从大到小
    const equippedPowers = [Math.max(p1, p2), Math.min(p1, p2)];

    // 背包内所有该类型装备从大到小排序
    const candidates: { index: number; power: number }[] = [];
    for (let i = 0; i < this.inventory.length; i++) {
      const it = this.inventory[i];
      if (it.type === 'equipment' && isMatchingSlot(it.slot)) {
        candidates.push({ index: i, power: StatCalculator.getItemCombatPower(it) });
      }
    }
    candidates.sort((a, b) => b.power - a.power);

    // candidates[0] 需高于身上较弱的一件才能替代
    // candidates[1] 需高于身上较强的一件才能将身上两件全部替代
    if (candidates.length > 0 && candidates[0].power > equippedPowers[1]) {
      keepIndices.add(candidates[0].index);
      if (candidates.length > 1 && candidates[1].power > equippedPowers[0]) {
        keepIndices.add(candidates[1].index);
      }
    }
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

  /**
   * 技能熟练度积累与升级成长 (无限升级)
   */
  gainSkillProficiency(skill: SkillDef, amount: number): void {
    if (!skill) return;
    skill.proficiency = (skill.proficiency || 0) + amount;

    while (skill.proficiency >= skill.maxProficiency) {
      skill.proficiency -= skill.maxProficiency;
      skill.level++;
      skill.maxProficiency = Math.floor(skill.maxProficiency * 1.45);

      let bonusMult = 0.12;
      if (skill.id === 'sun_slash') bonusMult = 0.35;
      else if (skill.id === 'heaven_splitter') bonusMult = 0.25;
      else if (skill.id === 'fire_slash') bonusMult = 0.25;
      else if (skill.id === 'assassinate') bonusMult = 0.20;
      else if (skill.id === 'power_slash') bonusMult = 0.16;
      else if (skill.id === 'basic_slash') bonusMult = 0.10;
      else if (skill.id === 'shield_aegis') bonusMult = 0.05;

      skill.damageMult = Number((skill.damageMult + bonusMult).toFixed(2));
      if (skill.cdTicks > 10) {
        skill.cdTicks = Math.max(10, skill.cdTicks - 1);
      }

      this.onSound?.('levelup');
      this.addDamagePopup(this.player.gridPos, `${skill.name} Lv.${skill.level}!`, '#facc15', true);
      this.addBattleLog(
        `【技能突破】恭喜！[${skill.name}] 熟练度大圆满，晋升至 Lv.${skill.level}！伤害倍率提升至 ${skill.damageMult}x！`,
        'system'
      );
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
      autoConfig: this.autoConfig,
      skills: this.skills
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

    if (saved.skills && Array.isArray(saved.skills)) {
      for (const sk of saved.skills) {
        const local = this.skills.find(s => s.id === sk.id);
        if (local) {
          local.level = sk.level || 1;
          local.proficiency = sk.proficiency || 0;
          local.maxProficiency = sk.maxProficiency || local.maxProficiency;
          local.damageMult = sk.damageMult || local.damageMult;
          local.cdTicks = sk.cdTicks || local.cdTicks;
        }
      }
    }

    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    this.player.stats.hp = saved.player.hp || this.player.stats.maxHp;
    this.player.stats.mp = saved.player.mp || this.player.stats.maxMp;

    return true;
  }
}
