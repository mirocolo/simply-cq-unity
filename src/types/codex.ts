export interface CodexMilestoneReward {
  kills: number;
  label: string;
  minDC?: number;
  maxDC?: number;
  minAC?: number;
  maxAC?: number;
  maxHp?: number;
  critRate?: number;
}

export interface MonsterCodexDef {
  templateId: string;
  name: string;
  title: string;
  tier: number;
  isBoss: boolean;
  avatarIcon: string;
  desc: string;
  milestones: CodexMilestoneReward[];
}

export interface BountyTask {
  id: string;
  templateId: string;
  targetName: string;
  targetIcon: string;
  requiredKills: number;
  currentKills: number;
  rewardGold: number;
  rewardIronOre: number;
  rewardPureIron: number;
  rewardGodStone: number;
  completed: boolean;
  claimed: boolean;
}
