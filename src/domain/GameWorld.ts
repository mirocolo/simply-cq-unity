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
import { ASCENSION_DEFINITIONS } from './definitions/ascension';
import { SET_DEFINITIONS } from './definitions/sets';

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
    autoPotionHpPercent: 75, // 默认75%血线智能喝药，保障新手生存
    autoMpPotion: true,
    autoPotionMpPercent: 35,
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

  onSound?: (name: 'swing' | 'hit' | 'crit' | 'coin' | 'potion' | 'levelup' | 'fire' | 'phantom' | 'paralyze' | 'revive') => void;
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

  hasSpecialEffect(effect: string): boolean {
    for (const it of Object.values(this.equipped)) {
      if (it && it.specialEffect === effect) return true;
    }
    return false;
  }

  canAscend(): boolean {
    const currentTier = this.player?.stats?.ascensionTier || 0;
    if (currentTier >= 9) return false;
    const nextDef = ASCENSION_DEFINITIONS[currentTier + 1];
    if (!nextDef) return false;
    return (this.player?.stats?.level || 1) >= nextDef.requiredLevel;
  }

  ascend(): boolean {
    if (!this.canAscend()) return false;
    const currentTier = this.player.stats.ascensionTier || 0;
    const nextTier = currentTier + 1;
    const nextDef = ASCENSION_DEFINITIONS[nextTier];
    if (!nextDef) return false;

    this.player.stats.ascensionTier = nextTier;

    // 技能神通觉醒
    if (nextDef.awakenedSkillId) {
      const sk = this.skills.find(s => s.id === nextDef.awakenedSkillId);
      if (sk) {
        sk.isAwakened = true;
        sk.awakenedName = nextDef.awakenedSkillName;
        if (nextDef.awakenedSkillName) {
          sk.name = nextDef.awakenedSkillName;
        }
      }
    }

    // 重算人物四维与战力
    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level, nextTier);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    this.player.stats.hp = this.player.stats.maxHp;
    this.player.stats.mp = this.player.stats.maxMp;

    // 重新刷新怪物强度与位面
    this.updateMonstersForAscension();

    this.onSound?.('levelup');
    this.screenShake = 15;
    this.addDamagePopup(this.player.gridPos, `飞升突破【${nextDef.title}】!`, '#f59e0b', true);
    this.addBattleLog(
      `【九转飞升】恭喜大侠渡劫破镜，晋升【${nextDef.title}】！晋入【${nextDef.mapName}】，全属性飙升，战力达 ${this.player.stats.combatPower}！`,
      'system'
    );
    return true;
  }

  updateMonstersForAscension(): void {
    const tier = this.player.stats.ascensionTier || 0;
    const playerLevel = this.player.stats.level || 1;
    const bossGrowthFactor = playerLevel < 25 
      ? 1 
      : Math.max(1, (playerLevel / 20) ** 1.35);
    const hpMult = 1 + (tier ** 1.25) * 2.5;
    const dcMult = 1 + (tier ** 1.1) * 0.7;
    const acMult = 1 + tier * 0.5;

    for (const m of this.monsters) {
      const tmpl = Object.values(MONSTER_TEMPLATES).find(t => t.name === m.name);
      if (tmpl) {
        const finalHpMult = tmpl.isBoss ? bossGrowthFactor * hpMult : hpMult;
        const finalDcMult = tmpl.isBoss ? (1 + (bossGrowthFactor - 1) * 0.5) * dcMult : dcMult;
        const finalAcMult = tmpl.isBoss ? acMult * 1.5 : acMult;
        m.stats.maxHp = Math.floor(tmpl.hp * finalHpMult);
        m.stats.hp = m.stats.maxHp;
        m.stats.minDC = Math.floor(tmpl.minDC * finalDcMult);
        m.stats.maxDC = Math.floor(tmpl.maxDC * finalDcMult);
        m.stats.minAC = Math.floor(tmpl.minAC * finalAcMult);
        m.stats.maxAC = Math.floor(tmpl.maxAC * finalAcMult);
      }
    }
  }

  private createPlayer(): Entity {
    const base = StatCalculator.getBaseStatsForLevel(1, 0);
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
      stateTicks: 0,
      invincibleTicks: 100 // 开局10秒无敌金身庇护，平稳适应
    };
  }

  private initStartingInventory(): void {
    // 新手至尊满装礼包：全槽位佩戴齐备，大幅提高防御与攻击！
    const sword = DropSystem.createItemInstance('w_bronze_sword', 0);
    const armor = DropSystem.createItemInstance('a_buyi', 0);
    const helmet = DropSystem.createItemInstance('h_qingtong', 0);
    const necklace = DropSystem.createItemInstance('n_chuantong', 0);
    const braceletL = DropSystem.createItemInstance('b_tieshou', 0);
    const braceletR = DropSystem.createItemInstance('b_tieshou', 0);
    const ringL = DropSystem.createItemInstance('r_gutong', 0);
    const ringR = DropSystem.createItemInstance('r_gutong', 0);

    const hpPot = DropSystem.createItemInstance('pot_hp_large', 1, 100);
    const mpPot = DropSystem.createItemInstance('pot_mp_large', 1, 50);
    const sunPot = DropSystem.createItemInstance('pot_sun', 2, 20);

    if (sword) this.equipItem(sword);
    if (armor) this.equipItem(armor);
    if (helmet) this.equipItem(helmet);
    if (necklace) this.equipItem(necklace);
    if (braceletL) { braceletL.slot = 'bracelet_l'; this.equipItem(braceletL); }
    if (braceletR) { braceletR.slot = 'bracelet_r'; this.equipItem(braceletR); }
    if (ringL) { ringL.slot = 'ring_l'; this.equipItem(ringL); }
    if (ringR) { ringR.slot = 'ring_r'; this.equipItem(ringR); }

    if (hpPot) this.addItemToInventory(hpPot);
    if (mpPot) this.addItemToInventory(mpPot);
    if (sunPot) this.addItemToInventory(sunPot);

    this.addBattleLog('【至尊礼包】欢迎来到热血单机传奇！已为您佩戴齐整套新手神装并赠送充足补给！', 'system');
    this.addBattleLog('【挂机提示】自动挂机默认开启，按【T】暂停/恢复挂机，【B】包裹，【C】人物属性。', 'system');
  }

  private spawnInitialMonsters(): void {
    const monsterDistributions = [
      { templateId: 'm_scarecrow', count: 6, center: { x: 16, y: 16 }, radius: 6 },
      { templateId: 'm_cat', count: 5, center: { x: 22, y: 16 }, radius: 5 },
      { templateId: 'm_spider', count: 4, center: { x: 14, y: 24 }, radius: 5 },
      { templateId: 'm_skeleton', count: 5, center: { x: 24, y: 25 }, radius: 6 },
      { templateId: 'm_zombie', count: 4, center: { x: 10, y: 18 }, radius: 5 },
      { templateId: 'm_white_pig', count: 5, center: { x: 28, y: 10 }, radius: 6 },
      { templateId: 'm_wooma_boss', count: 2, center: { x: 28, y: 28 }, radius: 4 },
      { templateId: 'm_red_moon', count: 1, center: { x: 8, y: 28 }, radius: 3 }
    ];

    const tier = this.player?.stats?.ascensionTier || 0;
    const playerLevel = this.player?.stats?.level || 1;
    // Boss 随玩家等级动态成长 (未成长阶段处于低难度，30级以上与高转阶位面难度适当拉升)
    const bossGrowthFactor = playerLevel < 25 
      ? 1 
      : Math.max(1, (playerLevel / 20) ** 1.35);
    const hpMult = 1 + (tier ** 1.25) * 2.5;
    const dcMult = 1 + (tier ** 1.1) * 0.7;
    const acMult = 1 + tier * 0.5;

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
        const finalHpMult = template.isBoss ? bossGrowthFactor * hpMult : hpMult;
        const finalDcMult = template.isBoss ? (1 + (bossGrowthFactor - 1) * 0.5) * dcMult : dcMult;
        const finalAcMult = template.isBoss ? acMult * 1.5 : acMult;
        const scaledHp = Math.floor(template.hp * finalHpMult);
        const stats = {
          ...baseStats,
          hp: scaledHp,
          maxHp: scaledHp,
          mp: template.mp,
          maxMp: template.mp,
          minDC: Math.floor(template.minDC * finalDcMult),
          maxDC: Math.floor(template.maxDC * finalDcMult),
          minAC: Math.floor(template.minAC * finalAcMult),
          maxAC: Math.floor(template.maxAC * finalAcMult),
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

    // 玩家护体神盾、中毒与复活CD倒计时
    if (this.player.shieldAegisTicks && this.player.shieldAegisTicks > 0) {
      this.player.shieldAegisTicks--;
      // 4转觉醒【太虚混元罡气】：持续期间每秒对周围1格释放神圣冲击波
      if ((this.player.stats.ascensionTier || 0) >= 4 && this.currentTick % 10 === 0 && this.player.state !== 'dead') {
        for (const m of this.monsters) {
          if (m.state !== 'dead' && PathFinder.chebyshevDistance(this.player.gridPos, m.gridPos) <= 1) {
            const holyDmg = Math.floor(this.player.stats.maxDC * 0.8);
            m.stats.hp = Math.max(0, m.stats.hp - holyDmg);
            this.addDamagePopup(m.gridPos, `🌟罡气 -${holyDmg}`, '#facc15', false);
            if (m.stats.hp <= 0) {
              this.handleEntityDeath(m, this.player);
            }
          }
        }
      }
    }
    if (this.player.poisonTicks && this.player.poisonTicks > 0) {
      this.player.poisonTicks--;
      if (this.currentTick % 10 === 0 && this.player.state !== 'dead') {
        this.player.stats.hp = Math.max(1, this.player.stats.hp - 18);
        this.addDamagePopup(this.player.gridPos, '-18 毒', '#22c55e', false);
      }
    }
    if (this.player.reviveCooldownTicks && this.player.reviveCooldownTicks > 0) {
      this.player.reviveCooldownTicks--;
    }
    if (this.player.invincibleTicks && this.player.invincibleTicks > 0) {
      this.player.invincibleTicks--;
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
            const tier = this.player.stats.ascensionTier || 0;
            const playerLevel = this.player.stats.level || 1;
            const bossGrowthFactor = playerLevel < 25 
              ? 1 
              : Math.max(1, (playerLevel / 20) ** 1.35);
            const hpMult = 1 + (tier ** 1.25) * 2.5;
            const dcMult = 1 + (tier ** 1.1) * 0.7;
            const acMult = 1 + tier * 0.5;
            const tmpl = Object.values(MONSTER_TEMPLATES).find(t => t.name === m.name);
            if (tmpl) {
              const finalHpMult = tmpl.isBoss ? bossGrowthFactor * hpMult : hpMult;
              const finalDcMult = tmpl.isBoss ? (1 + (bossGrowthFactor - 1) * 0.5) * dcMult : dcMult;
              const finalAcMult = tmpl.isBoss ? acMult * 1.5 : acMult;
              m.stats.maxHp = Math.floor(tmpl.hp * finalHpMult);
              m.stats.minDC = Math.floor(tmpl.minDC * finalDcMult);
              m.stats.maxDC = Math.floor(tmpl.maxDC * finalDcMult);
              m.stats.minAC = Math.floor(tmpl.minAC * finalAcMult);
              m.stats.maxAC = Math.floor(tmpl.maxAC * finalAcMult);
            }
            m.stats.hp = m.stats.maxHp;
            m.hasBeenAttackedByPlayer = false;
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
            let lightningDmg = Math.floor(m.stats.maxDC * 1.2);
            // 前期伤害保护：至多扣除玩家当前最大生命的 35% (绝不一击秒杀新手)
            if (this.player.stats.level < 35) {
              lightningDmg = Math.min(lightningDmg, Math.floor(this.player.stats.maxHp * 0.35));
            }
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
            let spikeDmg = Math.floor(m.stats.maxDC * 1.3);
            // 前期伤害保护：至多扣除玩家当前最大生命的 40% (绝不秒杀)
            if (this.player.stats.level < 45) {
              spikeDmg = Math.min(spikeDmg, Math.floor(this.player.stats.maxHp * 0.40));
            }
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
        // 低等级保护机制：若玩家等级显著低于Boss等级（差8级以上），且玩家未主动攻击过Boss，Boss不主动索敌追杀新手！
        if (m.isBoss && this.player.stats.level < m.stats.level - 8 && !m.hasBeenAttackedByPlayer) {
          if (Math.random() < 0.05 && !m.targetGridPos && m.spawnOrigin) {
            const wx = m.gridPos.x + Math.floor(Math.random() * 3) - 1;
            const wy = m.gridPos.y + Math.floor(Math.random() * 3) - 1;
            if (this.isWalkable(wx, wy) && PathFinder.chebyshevDistance({ x: wx, y: wy }, m.spawnOrigin) <= 4) {
              this.startEntityMove(m, { x: wx, y: wy });
            }
          }
          continue;
        }

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
      const isAwakenedShield = (attacker.stats.ascensionTier || 0) >= 4;
      const shieldText = isAwakenedShield ? '🛡️太虚混元罡气!' : '🛡️护体神盾!';
      this.addDamagePopup(attacker.gridPos, shieldText, '#38bdf8', true);
      this.addBattleLog(`【${shieldText}】玄金罡气护体！受到伤害大幅降低并反震受击伤害！`, 'system');
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

    // 1. 直线贯穿神技处理：开天斩 (3~5格贯穿巨刃) 与 逐日剑法 (4~6格贯穿烈阳极光)
    if (attacker.isPlayer && (isHeaven || isSun)) {
      const isAwakenedHeaven = isHeaven && (attacker.stats.ascensionTier || 0) >= 5;
      const isAwakenedSun = isSun && (attacker.stats.ascensionTier || 0) >= 7;
      const maxRange = isAwakenedSun ? 6 : (isSun ? 4 : (isAwakenedHeaven ? 5 : 3));
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

      // 逐日剑法 100% 触发双重或四重残影极速追击！
      if (isSun) {
        const phantomCount = isAwakenedSun ? 4 : 2;
        for (let p = 1; p <= phantomCount; p++) {
          this.applyPhantomHit(attacker, primaryTarget, p);
        }
      }
    } else {
      // 普通攻击/烈火/刺杀/攻杀：打主目标
      this.applyHitToEntity(attacker, primaryTarget, effectiveSkill, false);

      // 6转烈火觉醒【九幽双重真火】：连续两段真火爆发
      const isAwakenedFire = isFire && (attacker.stats.ascensionTier || 0) >= 6;
      if (isAwakenedFire && primaryTarget.state !== 'dead') {
        setTimeout(() => {
          if (primaryTarget.state !== 'dead') {
            this.applyHitToEntity(attacker, primaryTarget, effectiveSkill, false);
            this.addDamagePopup(primaryTarget.gridPos, '🔥双烈火爆裂!', '#ea580c', true);
          }
        }, 150);
      }

      // 2. 经典战士【半月弯刀】顺劈斩机制 (1转基础剑法觉醒【神威无影斩】普攻也顺劈身边怪)
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
    if (target.invincibleTicks && target.invincibleTicks > 0) {
      this.addDamagePopup(target.gridPos, '🛡️无敌免疫', '#38bdf8');
      return;
    }
    if (attacker.isPlayer && !target.isPlayer) {
      target.hasBeenAttackedByPlayer = true;
    }

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
    if (target.invincibleTicks && target.invincibleTicks > 0) {
      this.addDamagePopup(target.gridPos, '🛡️无敌免疫', '#38bdf8');
      return;
    }
    if (attacker.isPlayer && !target.isPlayer) {
      target.hasBeenAttackedByPlayer = true;
    }

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

    // 护身戒指神威：受到伤害的 80% 优先由 MP 抵扣
    if (target.isPlayer && this.hasSpecialEffect('protect') && target.stats.mp > 0) {
      const mpAbsorb = Math.min(target.stats.mp, Math.floor(finalDamage * 0.80));
      target.stats.mp -= mpAbsorb;
      finalDamage -= mpAbsorb;
      if (mpAbsorb > 0) {
        this.addDamagePopup(target.gridPos, `🛡️护身抵扣 -${mpAbsorb}MP`, '#06b6d4', false);
      }
    }

    // 麻痹戒指神威：攻击时 25% 几率石化麻痹敌人 3 秒
    if (attacker.isPlayer && !target.isPlayer && this.hasSpecialEffect('paralyze')) {
      if (Math.random() < 0.25) {
        target.hitStunTicks = 30;
        this.addDamagePopup(target.gridPos, '⚡石化麻痹!', '#eab308', true);
        this.onSound?.('paralyze');
      }
    }

    // 护体神盾：受到伤害降低 40%~55%，并将 40%~60% 伤害反震攻击者
    if (target.isPlayer && target.shieldAegisTicks && target.shieldAegisTicks > 0) {
      const isAwakenedShield = (this.player.stats.ascensionTier || 0) >= 4;
      const reduceRatio = isAwakenedShield ? 0.45 : 0.60;
      const reflectRatio = isAwakenedShield ? 0.60 : 0.40;
      const reduced = Math.max(1, Math.floor(finalDamage * reduceRatio));
      const reflect = Math.max(1, Math.floor(finalDamage * reflectRatio));
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

    // 受击物理反馈：怪物受击硬直与微击退 (5转开天斩觉醒造成击晕)
    const isAwakenedHeaven = isHeaven && (attacker.stats.ascensionTier || 0) >= 5;
    target.hitStunTicks = isAwakenedHeaven ? 10 : (isSun ? 5 : (isHeaven ? 4 : 3));
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
        let gold = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
        if (this.hasSpecialEffect('greed')) {
          gold = Math.floor(gold * 2.5); // 贪婪特戒加成
        }
        this.player.stats.gold += gold;
        this.autoStats.goldGained += gold;
        this.autoStats.killCount++;

        const tier = this.player.stats.ascensionTier || 0;
        const expReward = Math.floor(tmpl.expReward * (1 + tier * 2.0));
        this.addExp(expReward);

        // 爆装并开启喷泉起跳动画 (智能阶数保底过滤)
        const drops = DropSystem.rollMonsterDrops(tmpl, deadEntity.gridPos, this.currentTick, tier);
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
        this.addBattleLog(`击杀【${deadEntity.name}】，经验 +${expReward}，金币 +${gold}`, 'kill');
      }
    } else {
      // 检查复活戒指 (specialEffect === 'revive')
      if (this.hasSpecialEffect('revive') && (!deadEntity.reviveCooldownTicks || deadEntity.reviveCooldownTicks <= 0)) {
        deadEntity.state = 'idle';
        deadEntity.stats.hp = deadEntity.stats.maxHp;
        deadEntity.stats.mp = deadEntity.stats.maxMp;
        deadEntity.reviveCooldownTicks = 900; // 90秒
        deadEntity.invincibleTicks = 30; // 3秒无敌金身
        this.onSound?.('revive');
        this.screenShake = 16;
        this.addDamagePopup(deadEntity.gridPos, '💖特戒复活涅槃!', '#ec4899', true);
        this.addBattleLog('【特戒复活】受到致命伤害触发【复活戒指】至尊神威！免除阵亡，生命与魔法全满恢复！', 'system');
        return;
      }

      this.addBattleLog('【阵亡】大侠在战斗中力竭倒下，安全区回城元神聚顶中...', 'system');
      setTimeout(() => {
        this.player.state = 'idle';
        this.player.gridPos = { x: 18, y: 18 };
        this.player.targetGridPos = null;
        this.player.moveProgress = 0;
        this.player.stats.hp = this.player.stats.maxHp;
        this.player.stats.mp = this.player.stats.maxMp;
        this.player.invincibleTicks = 60; // 6秒无敌庇护
        this.addDamagePopup(this.player.gridPos, '✨安全区复活·无敌金身!', '#38bdf8', true);
        this.addBattleLog('【安全区复活】大侠已在安全区满血重聚元神，获得6秒无敌庇护金光！', 'system');
      }, 2500);
    }
  }

  addExp(amount: number): void {
    this.player.stats.exp += amount;
    this.autoStats.expGained += amount;

    while (this.player.stats.exp >= this.player.stats.maxExp) {
      this.player.stats.exp -= this.player.stats.maxExp;
      this.player.stats.level++;
      
      const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level, this.player.stats.ascensionTier || 0);
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

          // 拾取后自动穿戴最适合自己的装备 (即刻智能换装)
          if (drop.item.type === 'equipment' && drop.item.slot) {
            this.tryAutoEquipIfBetter(drop.item);
          }

          // 挂机智能回收：若开启了自动回收弱装，且背包容量已达 35 格以上
          if (this.autoConfig.enabled && this.autoConfig.autoRecycleWeaker && this.inventory.length >= 35) {
            this.recycleWeakerOrEqualItems();
          }
        }
      }
    }
  }

  /**
   * 拾取后自动穿戴最适合自己的装备 (智能即刻替换)
   */
  tryAutoEquipIfBetter(item: ItemInstance): boolean {
    if (item.type !== 'equipment' || !item.slot) return false;
    // 等级要求高于人物等级则暂不自动穿戴
    if (item.levelReq && item.levelReq > this.player.stats.level) return false;

    const itemPower = StatCalculator.getItemCombatPower(item);

    // 1. 双槽位手镯比对
    if (item.slot === 'bracelet_l' || item.slot === 'bracelet_r') {
      const p1 = this.equipped['bracelet_l'] ? StatCalculator.getItemCombatPower(this.equipped['bracelet_l']!) : -1;
      const p2 = this.equipped['bracelet_r'] ? StatCalculator.getItemCombatPower(this.equipped['bracelet_r']!) : -1;
      const weakerPower = Math.min(p1, p2);
      if (itemPower > weakerPower) {
        this.equipItem(item);
        this.onSound?.('levelup');
        this.addBattleLog(`【神装自动换装】拾获更优手镯 [${item.name}]，已自动替换穿戴！`, 'system');
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
        this.onSound?.('levelup');
        this.addBattleLog(`【神装自动换装】拾获更优戒指 [${item.name}]，已自动替换穿戴！`, 'system');
        return true;
      }
      return false;
    }

    // 3. 单槽位 (武器、衣服、头盔、项链、以及6大特戒)
    const currentEquip = this.equipped[item.slot];
    const currentPower = currentEquip ? StatCalculator.getItemCombatPower(currentEquip) : -1;
    if (itemPower > currentPower) {
      this.equipItem(item);
      this.onSound?.('levelup');
      const prefix = item.slot.startsWith('special_') ? '【特戒觉醒】' : '【神装自动换装】';
      this.addBattleLog(`${prefix}拾获更优装备 [${item.name}]，已自动替换穿戴！`, 'system');
      return true;
    }

    return false;
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
    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level, this.player.stats.ascensionTier || 0);
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

    // 1. 单槽位比对优化: weapon, armor, helmet, necklace 以及 6 大专属特戒
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
    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level, this.player.stats.ascensionTier || 0);
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

    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level, this.player.stats.ascensionTier || 0);
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
   * (严格按同位置比对：保留可能换上的更强神装，绝对豁免特戒、极品橙装与高阶潜力装)
   */
  recycleWeakerOrEqualItems(): { gold: number; exp: number; count: number } {
    let gainedGold = 0;
    let gainedExp = 0;
    let count = 0;

    // 标记需要保留在背包的极品神装 (避免误熔比身上更好的提升件或特戒)
    const keepIndices = new Set<number>();

    // 1. 全局豁免保护：所有特戒、橙色传说装备、高阶潜力装备、等级暂未达到的备用装
    for (let i = 0; i < this.inventory.length; i++) {
      const it = this.inventory[i];
      if (it.type !== 'equipment' || !it.slot) {
        keepIndices.add(i);
        continue;
      }

      // 绝对豁免所有特戒 (带 specialEffect 或 slot 以 special_ 开头)
      if (it.specialEffect || it.slot.startsWith('special_')) {
        keepIndices.add(i);
        continue;
      }

      // 绝对豁免橙色传说神装 (baseQuality/quality >= 4)
      if (it.quality >= 4) {
        keepIndices.add(i);
        continue;
      }

      // 绝对豁免当前等级暂未达到的高级神装 (未来可穿戴)
      if (it.levelReq && it.levelReq > this.player.stats.level) {
        keepIndices.add(i);
        continue;
      }

      // 绝对豁免高于身上穿戴部位阶数的高阶潜力装备
      const currentEquipped = this.equipped[it.slot];
      if (currentEquipped && it.tier > currentEquipped.tier) {
        keepIndices.add(i);
        continue;
      }
    }

    // 2. 单槽位优化比对: weapon, armor, helmet, necklace
    const singleSlots: EquipSlot[] = ['weapon', 'armor', 'helmet', 'necklace'];
    for (const slot of singleSlots) {
      const equippedItem = this.equipped[slot];
      const equippedPower = equippedItem ? StatCalculator.getItemCombatPower(equippedItem) : -1;

      // 找出背包内属于该部位且符合当前等级的所有装备
      const candidates: { index: number; power: number }[] = [];
      for (let i = 0; i < this.inventory.length; i++) {
        const it = this.inventory[i];
        if (it.type === 'equipment' && it.slot === slot && (!it.levelReq || it.levelReq <= this.player.stats.level)) {
          candidates.push({ index: i, power: StatCalculator.getItemCombatPower(it) });
        }
      }
      candidates.sort((a, b) => b.power - a.power);

      // 若背包内存在比身上更强的装备，保留所有更强者
      for (const cand of candidates) {
        if (cand.power > equippedPower) {
          keepIndices.add(cand.index);
        }
      }
    }

    // 3. 双槽位手镯比对优化: bracelets (bracelet_l, bracelet_r)
    this.markKeepForDualSlots(['bracelet_l', 'bracelet_r'], keepIndices);

    // 4. 双槽位戒指比对优化: rings (ring_l, ring_r)
    this.markKeepForDualSlots(['ring_l', 'ring_r'], keepIndices);

    // 5. 执行回收：所有装备类型中，未被保留的均 <= 身上同位置或同部位已有更优选，全部熔炼！
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
      this.addBattleLog('【智能回收】背包中无弱于身上的同部位冗余装备，极品与特戒已妥善保留！', 'system');
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

    // 背包内所有该类型且符合穿戴等级的装备从大到小排序
    const candidates: { index: number; power: number }[] = [];
    for (let i = 0; i < this.inventory.length; i++) {
      const it = this.inventory[i];
      if (it.type === 'equipment' && isMatchingSlot(it.slot)) {
        if (!it.levelReq || it.levelReq <= this.player.stats.level) {
          candidates.push({ index: i, power: StatCalculator.getItemCombatPower(it) });
        }
      }
    }
    candidates.sort((a, b) => b.power - a.power);

    // candidates[0] 需高于身上较弱的一件才能替代较弱者
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
        gold: this.player.stats.gold,
        ascensionTier: this.player.stats.ascensionTier || 0
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
    this.player.stats.ascensionTier = saved.player.ascensionTier || 0;
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

    // 重新根据飞升阶数觉醒技能
    for (let t = 1; t <= (this.player.stats.ascensionTier || 0); t++) {
      const ascDef = ASCENSION_DEFINITIONS[t];
      if (ascDef && ascDef.awakenedSkillId) {
        const skill = this.skills.find(s => s.id === ascDef.awakenedSkillId);
        if (skill && ascDef.awakenedSkillName) {
          skill.isAwakened = true;
          skill.awakenedName = ascDef.awakenedSkillName;
          skill.name = ascDef.awakenedSkillName;
        }
      }
    }

    // 重新更新怪物阶数血量与属性
    this.updateMonstersForAscension();

    const base = StatCalculator.getBaseStatsForLevel(this.player.stats.level, this.player.stats.ascensionTier || 0);
    this.player.stats = StatCalculator.applyEquipment(base, this.equipped);
    this.player.stats.hp = saved.player.hp || this.player.stats.maxHp;
    this.player.stats.mp = saved.player.mp || this.player.stats.maxMp;

    return true;
  }
}
