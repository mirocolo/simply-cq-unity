import type { GameWorld } from '../GameWorld';
import { BountyTask } from '../../types/codex';
import { MONSTER_CODEX_DEFINITIONS, generateBounties } from '../definitions/codex';
import { DropSystem } from '../DropSystem';

export class CodexManager {
  codexClaimedTiers: Record<string, number[]> = {};
  activeBounties: BountyTask[] = [];
  bountyRefreshCost: number = 2000;

  constructor(private world: GameWorld) {
    this.activeBounties = generateBounties();
  }

  /**
   * 汇总所有已参悟图鉴里程碑带来的全属性加成
   */
  getCodexStatsBonus(): { minDC: number; maxDC: number; minAC: number; maxAC: number; maxHp: number; critRate: number } {
    let minDC = 0;
    let maxDC = 0;
    let minAC = 0;
    let maxAC = 0;
    let maxHp = 0;
    let critRate = 0;

    for (const [tmplId, tiers] of Object.entries(this.codexClaimedTiers)) {
      const def = MONSTER_CODEX_DEFINITIONS[tmplId];
      if (!def) continue;
      for (const idx of tiers) {
        const ms = def.milestones[idx];
        if (ms) {
          minDC += ms.minDC || 0;
          maxDC += ms.maxDC || 0;
          minAC += ms.minAC || 0;
          maxAC += ms.maxAC || 0;
          maxHp += ms.maxHp || 0;
          critRate += ms.critRate || 0;
        }
      }
    }
    return { minDC, maxDC, minAC, maxAC, maxHp, critRate };
  }

  /**
   * 领取百妖封魔录里程碑成就奖励
   */
  claimCodexReward(templateId: string, milestoneIdx: number): boolean {
    const codex = MONSTER_CODEX_DEFINITIONS[templateId];
    if (!codex) return false;
    const milestone = codex.milestones[milestoneIdx];
    if (!milestone) return false;
    const kills = this.world.monsterKills[templateId] || 0;
    if (kills < milestone.kills) return false;

    if (!this.codexClaimedTiers[templateId]) {
      this.codexClaimedTiers[templateId] = [];
    }
    if (this.codexClaimedTiers[templateId].includes(milestoneIdx)) return false;

    this.codexClaimedTiers[templateId].push(milestoneIdx);
    this.world.recalculatePlayerStats();
    this.world.onSound?.('levelup');
    this.world.addDamagePopup(this.world.player.gridPos, `📖封魔突破·${milestone.label}!`, '#fbbf24', true);
    this.world.addBattleLog(`【百妖封魔录】成功达成 [${codex.name}·${milestone.label}]！获得全属性永久飞跃！`, 'system');
    return true;
  }

  /**
   * 一键领取所有已达成的百妖封魔录里程碑
   */
  claimAllCodexRewards(): { count: number; statsGain: string } {
    let totalClaimed = 0;
    const oldBonus = this.getCodexStatsBonus();

    for (const [templateId, codex] of Object.entries(MONSTER_CODEX_DEFINITIONS)) {
      const kills = this.world.monsterKills[templateId] || 0;
      if (!this.codexClaimedTiers[templateId]) {
        this.codexClaimedTiers[templateId] = [];
      }
      const claimed = this.codexClaimedTiers[templateId];

      for (let idx = 0; idx < codex.milestones.length; idx++) {
        const ms = codex.milestones[idx];
        if (kills >= ms.kills && !claimed.includes(idx)) {
          claimed.push(idx);
          totalClaimed++;
        }
      }
    }

    if (totalClaimed > 0) {
      this.world.recalculatePlayerStats();
      const newBonus = this.getCodexStatsBonus();
      this.world.onSound?.('levelup');
      this.world.addDamagePopup(this.world.player.gridPos, `📖一键参悟 x${totalClaimed}!`, '#fbbf24', true);
      const hpDiff = newBonus.maxHp - oldBonus.maxHp;
      const dcDiff = newBonus.maxDC - oldBonus.maxDC;
      const acDiff = newBonus.maxAC - oldBonus.maxAC;
      const critDiff = (newBonus.critRate - oldBonus.critRate) * 100;
      const summaryParts = [];
      if (hpDiff > 0) summaryParts.push(`生命+${hpDiff}`);
      if (dcDiff > 0) summaryParts.push(`攻击+${dcDiff}`);
      if (acDiff > 0) summaryParts.push(`防御+${acDiff}`);
      if (critDiff > 0) summaryParts.push(`暴击+${critDiff.toFixed(1)}%`);
      const statsGain = summaryParts.join('，') || '全属性飞跃';
      this.world.addBattleLog(`【百妖封魔录】一键参悟了 ${totalClaimed} 阶魔物神髓！获得永久属性提升：${statsGain}！`, 'system');
      return { count: totalClaimed, statsGain };
    }

    return { count: 0, statsGain: '' };
  }

  /**
   * 领取悬赏令奖励
   */
  claimBounty(bountyId: string): boolean {
    const bounty = this.activeBounties.find(b => b.id === bountyId);
    if (!bounty || !bounty.completed || bounty.claimed) return false;
    bounty.claimed = true;
    this.world.player.stats.gold += bounty.rewardGold;
    this.world.autoStats.goldGained += bounty.rewardGold;
    if (bounty.rewardIronOre > 0) {
      const it = DropSystem.createItemInstance('mat_iron_ore', undefined, bounty.rewardIronOre);
      if (it) this.world.addItemToInventory(it);
    }
    if (bounty.rewardPureIron > 0) {
      const it = DropSystem.createItemInstance('mat_pure_iron', undefined, bounty.rewardPureIron);
      if (it) this.world.addItemToInventory(it);
    }
    if (bounty.rewardGodStone > 0) {
      const it = DropSystem.createItemInstance('mat_god_stone', undefined, bounty.rewardGodStone);
      if (it) this.world.addItemToInventory(it);
    }
    this.world.onSound?.('coin');
    this.world.addDamagePopup(this.world.player.gridPos, `💰悬赏金 +${bounty.rewardGold}!`, '#facc15', true);
    this.world.addBattleLog(`【悬赏交令】除魔大捷！完成 [${bounty.targetName}]，领取奖励：金币 +${bounty.rewardGold}，强化玄铁神石已存入背包！`, 'system');
    return true;
  }

  /**
   * 一键领取所有已完成的悬赏令
   */
  claimAllBounties(): { count: number; gold: number; iron: number; pureIron: number; godStone: number } {
    let count = 0;
    let gold = 0;
    let iron = 0;
    let pureIron = 0;
    let godStone = 0;

    for (const bounty of this.activeBounties) {
      if (bounty.completed && !bounty.claimed) {
        bounty.claimed = true;
        count++;
        gold += bounty.rewardGold;
        iron += bounty.rewardIronOre || 0;
        pureIron += bounty.rewardPureIron || 0;
        godStone += bounty.rewardGodStone || 0;
      }
    }

    if (count > 0) {
      this.world.player.stats.gold += gold;
      this.world.autoStats.goldGained += gold;
      if (iron > 0) {
        const it = DropSystem.createItemInstance('mat_iron_ore', undefined, iron);
        if (it) this.world.addItemToInventory(it);
      }
      if (pureIron > 0) {
        const it = DropSystem.createItemInstance('mat_pure_iron', undefined, pureIron);
        if (it) this.world.addItemToInventory(it);
      }
      if (godStone > 0) {
        const it = DropSystem.createItemInstance('mat_god_stone', undefined, godStone);
        if (it) this.world.addItemToInventory(it);
      }

      this.world.onSound?.('coin');
      this.world.addDamagePopup(this.world.player.gridPos, `💰悬赏一键结赏 x${count}!`, '#facc15', true);
      this.world.addBattleLog(
        `【万象悬赏令】一键交令 ${count} 项除魔委派！领取赏金 +${gold.toLocaleString()}，强化矿石玄铁已存入随身包裹！`,
        'system'
      );
    }

    return { count, gold, iron, pureIron, godStone };
  }

  /**
   * 一键全部领取封魔录与悬赏令
   */
  claimAllCodexAndBounties(): { codexCount: number; bountyCount: number; gold: number; message: string } {
    const codexRes = this.claimAllCodexRewards();
    const bountyRes = this.claimAllBounties();
    const totalCount = codexRes.count + bountyRes.count;
    if (totalCount === 0) {
      return { codexCount: 0, bountyCount: 0, gold: 0, message: '暂无可领取的封魔神髓或悬赏奖励！' };
    }
    const msg = `一键领取成功！参悟 ${codexRes.count} 阶神髓，交令 ${bountyRes.count} 项悬赏，赏金 +${bountyRes.gold.toLocaleString()}！`;
    return {
      codexCount: codexRes.count,
      bountyCount: bountyRes.count,
      gold: bountyRes.gold,
      message: msg
    };
  }

  /**
   * 刷新悬赏令任务
   */
  refreshBounties(): void {
    this.activeBounties = generateBounties();
    this.world.addBattleLog('【悬赏令刷新】万象除魔悬赏令已发布新委派，勇士速速前往封魔录(K)查验！', 'system');
  }

  /**
   * 累积怪物击杀数并推进悬赏任务进度
   */
  recordMonsterKill(templateId: string): void {
    this.world.monsterKills[templateId] = (this.world.monsterKills[templateId] || 0) + 1;
    // 兼容魔龙教主别名
    if (templateId === 'm_molong_boss') {
      this.world.monsterKills['m_dragon_boss'] = (this.world.monsterKills['m_dragon_boss'] || 0) + 1;
    } else if (templateId === 'm_dragon_boss') {
      this.world.monsterKills['m_molong_boss'] = (this.world.monsterKills['m_molong_boss'] || 0) + 1;
    }

    for (const b of this.activeBounties) {
      if ((b.templateId === templateId || (b.templateId === 'm_molong_boss' && templateId === 'm_dragon_boss')) && !b.completed) {
        b.currentKills++;
        if (b.currentKills >= b.requiredKills) {
          b.completed = true;
          this.world.addBattleLog(`【悬赏达成】[${b.targetName}] 目标数已达成！速在封魔录(K)中领取赏金与矿石！`, 'system');
        }
      }
    }
  }
}
