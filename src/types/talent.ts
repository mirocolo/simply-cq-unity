export type TalentBranchId = 'berserker' | 'fire_burst' | 'diamond_counter';

export interface TalentNodeDef {
  id: string;
  branch: TalentBranchId;
  name: string;
  tier: number; // 1, 2, 3, 4 (4 为终极大招)
  maxRank: number; // 通常 3 或 5，大招为 1
  icon: string;
  desc: string;
  reqBranchPoints: number; // 需要在该流派累计投入的点数门槛
  statsPerRank: {
    maxHpPercent?: number;     // 生命百分比加成
    flatHp?: number;
    minDC?: number;
    maxDC?: number;
    dcPercent?: number;        // 攻击力百分比加成
    minAC?: number;
    maxAC?: number;
    acPercent?: number;        // 防御百分比加成
    haste?: number;            // 攻速急速
    critRate?: number;         // 暴击率 (如 0.05 代表 +5%)
    critMult?: number;         // 暴击伤害 (如 0.30 代表 +30%)
    lifestealRate?: number;    // 吸血率 (如 0.03 代表 +3%)
    defenseIgnoreRate?: number;// 破甲率 (如 0.15 代表 +15%)
    damageMultRatio?: number;  // 独立倍攻
    thornsRate?: number;       // 荆棘反震率 (如 0.20 代表 +20%)
  };
  specialEffect?: string; // 特殊机制标签
}

export interface ArchetypeRating {
  title: string;
  branch: TalentBranchId | 'balanced';
  color: string;
  desc: string;
  scores: {
    attack: number;     // 攻击 (0~100)
    survivability: number; // 生存 (0~100)
    haste: number;      // 攻速 (0~100)
    crit: number;       // 暴击 (0~100)
    sustain: number;    // 续航 (0~100)
    counter: number;    // 反伤 (0~100)
  };
}
