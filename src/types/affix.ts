import { GridCoord } from './game';

export type MonsterAffixType = 
  | 'berserk'          // 【狂暴迅捷】
  | 'thorns'           // 【荆棘反伤】
  | 'frost'            // 【极寒冰霜】
  | 'shielded'         // 【神圣金身】
  | 'vampiric'         // 【嗜血撕咬】
  | 'teleport'         // 【虚空闪烁】
  | 'treasure_goblin'; // 【盗宝地精】

export interface AffixDef {
  type: MonsterAffixType;
  name: string;        // 如 "狂暴"
  title: string;       // 如 "【狂暴迅捷】"
  desc: string;
  auraColor: string;   // 脚下光环颜色
  dcMult?: number;
  hasteBonus?: number;
  speedBonus?: number;
  thornsRate?: number;
  lifestealRate?: number;
}

export interface TelegraphedAOE {
  id: string;
  bossId: string;
  skillName: string;
  center: GridCoord;
  radius: number;          // 切比雪夫范围半径
  currentTick: number;
  durationTicks: number;   // 预警持续时间 (默认 15 ticks = 1.5秒)
  damage: number;
  color?: string;
}
