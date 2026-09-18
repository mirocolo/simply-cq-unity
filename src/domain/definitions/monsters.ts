export interface MonsterLootEntry {
  defId: string;
  chance: number; // 0 ~ 1, 例如 0.2 表示 20%
  minCount?: number;
  maxCount?: number;
}

export interface MonsterTemplate {
  templateId: string;
  name: string;
  level: number;
  hp: number;
  mp: number;
  minDC: number;
  maxDC: number;
  minAC: number;
  maxAC: number;
  critRate: number;
  haste: number;
  baseAttackInterval: number; // 默认 9 ticks (0.9s)
  goldDrop: [number, number]; // [min, max]
  expReward: number;
  isElite?: boolean;
  isBoss?: boolean;
  respawnTicks: number; // 死亡后复活延迟 (10 ticks = 1s)
  color: string;
  icon: string;
  lootTable: MonsterLootEntry[];
}

export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  'm_scarecrow': {
    templateId: 'm_scarecrow',
    name: '稻草人',
    level: 2,
    hp: 50,
    mp: 0,
    minDC: 2,
    maxDC: 5,
    minAC: 1,
    maxAC: 2,
    critRate: 0.02,
    haste: 0,
    baseAttackInterval: 10,
    goldDrop: [10, 30],
    expReward: 15,
    respawnTicks: 40,
    color: '#a16207',
    icon: '🌾',
    lootTable: [
      { defId: 'pot_hp_small', chance: 0.5, minCount: 1, maxCount: 2 },
      { defId: 'w_wood_sword', chance: 0.2 },
      { defId: 'a_buyi', chance: 0.15 }
    ]
  },
  'm_cat': {
    templateId: 'm_cat',
    name: '钉耙猫',
    level: 5,
    hp: 90,
    mp: 0,
    minDC: 4,
    maxDC: 9,
    minAC: 2,
    maxAC: 3,
    critRate: 0.05,
    haste: 2,
    baseAttackInterval: 9,
    goldDrop: [25, 60],
    expReward: 35,
    respawnTicks: 50,
    color: '#ca8a04',
    icon: '🐱',
    lootTable: [
      { defId: 'pot_hp_small', chance: 0.6, minCount: 1, maxCount: 3 },
      { defId: 'w_bronze_sword', chance: 0.18 },
      { defId: 'h_qingtong', chance: 0.12 },
      { defId: 'b_tieshou', chance: 0.15 }
    ]
  },
  'm_spider': {
    templateId: 'm_spider',
    name: '毒蜘蛛',
    level: 9,
    hp: 160,
    mp: 0,
    minDC: 7,
    maxDC: 15,
    minAC: 3,
    maxAC: 5,
    critRate: 0.08,
    haste: 5,
    baseAttackInterval: 8,
    goldDrop: [50, 120],
    expReward: 70,
    respawnTicks: 60,
    color: '#16a34a',
    icon: '🕷️',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.4, minCount: 1, maxCount: 2 },
      { defId: 'n_chuantong', chance: 0.15 },
      { defId: 'r_gutong', chance: 0.2 },
      { defId: 'w_bahuang', chance: 0.08 }
    ]
  },
  'm_skeleton': {
    templateId: 'm_skeleton',
    name: '骷髅战士',
    level: 15,
    hp: 350,
    mp: 0,
    minDC: 12,
    maxDC: 24,
    minAC: 5,
    maxAC: 9,
    critRate: 0.10,
    haste: 6,
    baseAttackInterval: 8,
    goldDrop: [120, 280],
    expReward: 160,
    respawnTicks: 70,
    color: '#94a3b8',
    icon: '💀',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.5, minCount: 2, maxCount: 4 },
      { defId: 'pot_mp_large', chance: 0.4, minCount: 1, maxCount: 3 },
      { defId: 'w_lingfeng', chance: 0.1 },
      { defId: 'a_qingkai', chance: 0.12 },
      { defId: 'b_jinshou', chance: 0.12 },
      { defId: 'h_daoshi', chance: 0.08 }
    ]
  },
  'm_zombie': {
    templateId: 'm_zombie',
    name: '矿区尸王',
    level: 22,
    hp: 750,
    mp: 0,
    minDC: 20,
    maxDC: 38,
    minAC: 8,
    maxAC: 14,
    critRate: 0.12,
    haste: 8,
    baseAttackInterval: 8,
    goldDrop: [250, 600],
    expReward: 350,
    respawnTicks: 80,
    color: '#7c3aed',
    icon: '🧟',
    lootTable: [
      { defId: 'pot_hp_large', chance: 0.7, minCount: 3, maxCount: 5 },
      { defId: 'w_zhanma', chance: 0.12 },
      { defId: 'n_kuangfeng', chance: 0.08 },
      { defId: 'r_shanhu', chance: 0.15 },
      { defId: 'a_zhongkai', chance: 0.1 }
    ]
  },
  'm_white_pig': {
    templateId: 'm_white_pig',
    name: '★ 白野猪(精英)',
    level: 30,
    hp: 2000,
    mp: 0,
    minDC: 35,
    maxDC: 65,
    minAC: 12,
    maxAC: 22,
    critRate: 0.18,
    haste: 12,
    baseAttackInterval: 7,
    goldDrop: [800, 2000],
    expReward: 1200,
    isElite: true,
    respawnTicks: 120, // 12秒复活
    color: '#e11d48',
    icon: '🐗',
    lootTable: [
      { defId: 'pot_sun', chance: 0.8, minCount: 2, maxCount: 4 },
      { defId: 'w_lianyu', chance: 0.25 },
      { defId: 'w_jingzhongyue', chance: 0.12 },
      { defId: 'h_heitie', chance: 0.15 },
      { defId: 'b_qishi', chance: 0.15 },
      { defId: 'r_liliang', chance: 0.1 }
    ]
  },
  'm_wooma_boss': {
    templateId: 'm_wooma_boss',
    name: '★★ 沃玛教主(首领)',
    level: 38,
    hp: 6000,
    mp: 1000,
    minDC: 60,
    maxDC: 110,
    minAC: 20,
    maxAC: 35,
    critRate: 0.25,
    haste: 20,
    baseAttackInterval: 6,
    goldDrop: [3000, 8000],
    expReward: 4500,
    isBoss: true,
    respawnTicks: 250, // 25秒复活
    color: '#dc2626',
    icon: '👹',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 4, maxCount: 8 },
      { defId: 'w_caijue', chance: 0.35 }, // 35% 裁决！
      { defId: 'a_zhanshen', chance: 0.3 },
      { defId: 'n_jiyi', chance: 0.25 },
      { defId: 'r_liliang', chance: 0.3 },
      { defId: 'r_mabi', chance: 0.05 } // 5% 概率出麻痹戒指
    ]
  },
  'm_red_moon': {
    templateId: 'm_red_moon',
    name: '★★★ 赤月恶魔(神话)',
    level: 45,
    hp: 15000,
    mp: 3000,
    minDC: 90,
    maxDC: 170,
    minAC: 30,
    maxAC: 50,
    critRate: 0.35,
    haste: 25,
    baseAttackInterval: 5,
    goldDrop: [10000, 30000],
    expReward: 15000,
    isBoss: true,
    respawnTicks: 400,
    color: '#b91c1c',
    icon: '👿',
    lootTable: [
      { defId: 'pot_sun', chance: 1.0, minCount: 8, maxCount: 15 },
      { defId: 'w_tulong', chance: 0.4 }, // 40% 烈焰屠龙！
      { defId: 'a_shengzhan', chance: 0.45 },
      { defId: 'r_mabi', chance: 0.15 } // 15% 特戒麻痹
    ]
  }
};
