<template>
  <div class="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center select-none font-serif">
    <!-- 经验条 (铺满整条底部，经典墨玉绿刻度) -->
    <div class="pointer-events-auto relative w-full h-3 bg-black border-t border-b border-[#3c2f21] overflow-hidden">
      <div 
        class="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-teal-400 transition-all duration-300"
        :style="{ width: `${expPercent}%` }"
      ></div>
      <span class="absolute inset-0 flex items-center justify-center text-[10px] text-amber-200 font-mono leading-none drop-shadow">
        【经验】 {{ expPercent.toFixed(1) }}% ({{ player.stats.exp }} / {{ player.stats.maxExp }})
      </span>
    </div>

    <!-- 传奇最经典青铜石雕主控制台底座 -->
    <div class="pointer-events-auto w-full bg-gradient-to-t from-[#0e0c0b] via-[#1a1612] to-[#252019] border-t-2 border-[#5c4a34] px-4 py-2 flex items-center justify-between shadow-[0_-8px_25px_rgba(0,0,0,0.9)]">
      
      <!-- 左翼：嵌入式传奇聊天与战斗日志窗口 -->
      <div class="w-80 h-28 bg-black/85 rounded border-2 border-[#4a3b2b] p-2 flex flex-col justify-between shadow-inner">
        <!-- 频道标签 -->
        <div class="flex items-center gap-2 border-b border-[#3c2f21] pb-1 text-[10px]">
          <span 
            @click="activeTab = 'all'" 
            class="cursor-pointer px-1.5 py-0.5 rounded font-bold"
            :class="activeTab === 'all' ? 'bg-[#4a3b2b] text-amber-300' : 'text-zinc-500 hover:text-zinc-300'"
          >综合</span>
          <span 
            @click="activeTab = 'drop'" 
            class="cursor-pointer px-1.5 py-0.5 rounded font-bold"
            :class="activeTab === 'drop' ? 'bg-[#4a3b2b] text-purple-300' : 'text-zinc-500 hover:text-zinc-300'"
          >极品爆装</span>
          <span 
            @click="activeTab = 'system'" 
            class="cursor-pointer px-1.5 py-0.5 rounded font-bold"
            :class="activeTab === 'system' ? 'bg-[#4a3b2b] text-yellow-300' : 'text-zinc-500 hover:text-zinc-300'"
          >系统提示</span>
        </div>

        <!-- 日志流 -->
        <div class="overflow-y-auto max-h-20 flex flex-col gap-1 pr-1 text-[11px] leading-tight font-sans">
          <div 
            v-for="log in filteredLogs" 
            :key="log.id"
            class="flex items-baseline gap-1"
          >
            <span class="text-zinc-500 text-[9px] shrink-0 font-mono">[{{ log.timestamp }}]</span>
            <span :class="getLogClass(log)">{{ log.text }}</span>
          </div>
        </div>
      </div>

      <!-- 中央核心：传奇标志性【红蓝太极双血球】 (太极阴阳双半圆) -->
      <div class="flex flex-col items-center -mt-6">
        <!-- 双血球玻璃圆盘 (直经 84px) -->
        <div class="relative w-[88px] h-[88px] rounded-full border-4 border-[#8c6d3b] bg-zinc-950 overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.9),inset_0_0_15px_rgba(0,0,0,0.8)] flex">
          <!-- 左半边：红血球 (HP) -->
          <div class="relative w-1/2 h-full bg-[#1c0808] border-r-2 border-[#5c4a34] overflow-hidden">
            <div 
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-900 via-red-600 to-rose-500 transition-all duration-200"
              :style="{ height: `${hpPercent}%` }"
            ></div>
            <!-- 液面高光波纹 -->
            <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none"></div>
          </div>

          <!-- 右半边：蓝魔球 (MP) -->
          <div class="relative w-1/2 h-full bg-[#08111c] overflow-hidden">
            <div 
              class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-900 via-blue-600 to-cyan-400 transition-all duration-200"
              :style="{ height: `${mpPercent}%` }"
            ></div>
            <!-- 液面高光波纹 -->
            <div class="absolute inset-0 bg-gradient-to-tl from-transparent via-white/15 to-transparent pointer-events-none"></div>
          </div>

          <!-- 球心金色太极徽标与数字 -->
          <div class="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-mono font-bold leading-tight pointer-events-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span class="text-rose-200">{{ player.stats.hp }}</span>
            <span class="text-cyan-200">{{ player.stats.mp }}</span>
          </div>

          <!-- 玻璃反光弧形罩 -->
          <div class="absolute inset-0 rounded-full border border-white/20 pointer-events-none bg-gradient-to-b from-white/20 via-transparent to-black/30"></div>
        </div>

        <!-- 药水快捷按键提示 -->
        <div class="flex gap-4 mt-1">
          <button 
            @click="$emit('useHpPotion')"
            class="px-2 py-0.5 bg-red-950/80 hover:bg-red-800 border border-red-800 rounded text-[10px] text-red-300 font-bold active:scale-95 transition-all flex items-center gap-1 shadow"
            title="快捷喝金创药 (按 Q)"
          >
            <span>🍷 Q</span>
            <span class="text-white font-mono">({{ hpPotionCount }})</span>
          </button>
          <button 
            @click="$emit('useMpPotion')"
            class="px-2 py-0.5 bg-blue-950/80 hover:bg-blue-800 border border-blue-800 rounded text-[10px] text-blue-300 font-bold active:scale-95 transition-all flex items-center gap-1 shadow"
            title="快捷喝魔法药 (按 W)"
          >
            <span>🍶 W</span>
            <span class="text-white font-mono">({{ mpPotionCount }})</span>
          </button>
        </div>
      </div>

      <!-- 右翼中：经典 7 技能石雕卡槽 -->
      <div class="flex items-center gap-1.5">
        <div 
          v-for="(skill, index) in skills" 
          :key="skill.id"
          @click="$emit('castSkill', skill)"
          class="relative w-12 h-12 bg-gradient-to-b from-[#211b15] to-[#120f0c] rounded border border-[#5c4a34] hover:border-amber-400 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_0_8px_rgba(0,0,0,0.9)] group"
          :class="{ 'opacity-50 grayscale hover:border-zinc-700': player.stats.level < skill.unlockLevel }"
        >
          <span class="text-xl">{{ skill.icon }}</span>
          
          <!-- 快捷键编号 -->
          <span class="absolute top-0.5 left-1 text-[9px] font-black text-amber-400 font-mono">
            {{ index + 1 }}
          </span>

          <!-- 觉醒神通光标 -->
          <span 
            v-if="skill.isAwakened"
            class="absolute -top-1.5 -left-1 text-[8px] font-black text-amber-950 bg-gradient-to-r from-amber-300 to-yellow-400 px-1 rounded-sm shadow-gold-glow border border-amber-500 leading-tight z-10 scale-90"
          >
            神通
          </span>

          <!-- 技能等级金标 (支持无限升级) / 未解锁提示 -->
          <span 
            v-if="player.stats.level >= skill.unlockLevel"
            class="absolute top-0.5 right-0.5 text-[8px] font-extrabold text-yellow-300 font-mono bg-black/80 px-0.5 rounded-bl leading-tight border-b border-l border-amber-600/40"
          >
            Lv.{{ skill.level }}
          </span>
          <span 
            v-else
            class="absolute top-0.5 right-0.5 text-[7px] font-bold text-zinc-400 font-mono bg-black/90 px-0.5 rounded-bl leading-tight border-b border-l border-zinc-700"
          >
            {{ skill.unlockLevel }}级
          </span>

          <span 
            class="text-[8px] truncate max-w-[42px] leading-tight font-sans"
            :class="skill.isAwakened ? 'text-amber-300 font-bold' : 'text-zinc-300'"
          >
            {{ skill.name }}
          </span>

          <!-- 熟练度微型底槽进度条 -->
          <div v-if="player.stats.level >= skill.unlockLevel" class="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950 overflow-hidden" title="熟练度进度">
            <div 
              class="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-300"
              :style="{ width: `${Math.min(100, ((skill.proficiency || 0) / (skill.maxProficiency || 100)) * 100)}%` }"
            ></div>
          </div>

          <!-- 冷却遮罩 -->
          <div 
            v-if="skill.currentCdTicks > 0"
            class="absolute inset-0 bg-black/80 rounded flex items-center justify-center text-[10px] font-bold text-amber-300 font-mono"
          >
            {{ (skill.currentCdTicks / 10).toFixed(1) }}s
          </div>

          <!-- 鼠标悬浮 Tooltip 技能详情卡 -->
          <div class="absolute bottom-14 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-1 w-52 p-2 bg-black/95 border border-amber-600/60 rounded shadow-2xl z-50 text-left pointer-events-none animate-fadeIn">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-1">
              <span class="text-xs font-bold text-amber-400 flex items-center gap-1">
                <span>{{ skill.name }}</span>
                <span v-if="skill.isAwakened" class="text-[9px] text-amber-300 font-bold bg-amber-950/80 px-1 py-0.2 rounded border border-amber-600/40">神通</span>
              </span>
              <span v-if="player.stats.level >= skill.unlockLevel" class="text-[10px] text-yellow-300 font-mono font-bold">Lv.{{ skill.level }}</span>
              <span v-else class="text-[10px] text-red-400 font-mono font-bold">Lv.{{ skill.unlockLevel }} 解锁</span>
            </div>
            <div class="text-[10px] text-zinc-300 flex flex-col gap-0.5">
              <span>伤害倍率: <b class="text-orange-400 font-mono">{{ skill.damageMult }}x</b></span>
              <span>冷却时间: <b class="text-amber-300 font-mono">{{ (skill.cdTicks * 0.1).toFixed(1) }}s</b></span>
              <span v-if="skill.manaCost > 0">法力消耗: <b class="text-cyan-400 font-mono">{{ skill.manaCost }} MP</b></span>
              <span v-if="player.stats.level >= skill.unlockLevel">熟练进度: <b class="text-emerald-400 font-mono">{{ skill.proficiency || 0 }}/{{ skill.maxProficiency }}</b></span>
            </div>
            <div v-if="skill.isAwakened" class="text-[9px] text-amber-300 font-bold bg-gradient-to-r from-amber-950/60 to-yellow-950/30 px-1.5 py-0.5 rounded border border-amber-500/40">
              ⚡ 飞升觉醒神通 · 威能与范围发生质变！
            </div>
            <p class="text-[9px] text-zinc-400 italic border-t border-zinc-900 pt-1 leading-snug">
              {{ skill.desc }}
            </p>
          </div>
        </div>
      </div>

      <!-- 右翼尾：经典青铜刻字菜单操作按钮 -->
      <div class="flex flex-col gap-1.5">
        <div class="flex gap-1.5">
          <button 
            @click="$emit('openModal', 'character')"
            class="w-14 py-1.5 bg-gradient-to-b from-[#3a2f23] to-[#1e1710] hover:from-[#4d3e2d] hover:to-[#2c2217] text-[#f3c258] border-2 border-[#6d563a] rounded text-xs font-bold transition-all shadow-md active:scale-95"
          >
            人物(C)
          </button>
          <button 
            @click="$emit('openModal', 'inventory')"
            class="w-14 py-1.5 bg-gradient-to-b from-[#3a2f23] to-[#1e1710] hover:from-[#4d3e2d] hover:to-[#2c2217] text-[#f3c258] border-2 border-[#6d563a] rounded text-xs font-bold transition-all shadow-md active:scale-95"
          >
            包裹(B)
          </button>
          <button 
            @click="$emit('openModal', 'special_ring')"
            class="w-14 py-1.5 bg-gradient-to-b from-[#4a361e] to-[#241a0d] hover:from-[#614827] hover:to-[#362713] text-[#fde047] border-2 border-[#8c6d3b] rounded text-xs font-black transition-all shadow-[0_0_8px_rgba(251,191,36,0.25)] active:scale-95 flex items-center justify-center gap-0.5"
            title="查看与镶嵌六大特戒 (按 R)"
          >
            <span>💍</span>
            <span>特戒(R)</span>
          </button>
          <button 
            @click="$emit('openModal', 'world_map')"
            class="w-14 py-1.5 bg-gradient-to-b from-[#1e293b] to-[#0f172a] hover:from-[#334155] hover:to-[#1e293b] text-[#38bdf8] border-2 border-[#38bdf8]/60 rounded text-xs font-black transition-all shadow-[0_0_8px_rgba(56,189,248,0.25)] active:scale-95 flex items-center justify-center gap-0.5"
            title="查看九州十界万象星图 (按 M)"
          >
            <span>🗺️</span>
            <span>星图(M)</span>
          </button>
          <button 
            @click="$emit('openModal', 'codex')"
            class="w-14 py-1.5 bg-gradient-to-b from-[#312e81] to-[#1e1b4b] hover:from-[#3730a3] hover:to-[#2e1065] text-[#c084fc] border-2 border-[#818cf8]/60 rounded text-xs font-black transition-all shadow-[0_0_8px_rgba(192,132,252,0.25)] active:scale-95 flex items-center justify-center gap-0.5"
            title="百妖封魔录与万象悬赏令 (按 K)"
          >
            <span>📖</span>
            <span>封魔(K)</span>
          </button>
          <button 
            @click="$emit('openModal', 'talent')"
            class="w-14 py-1.5 bg-gradient-to-b from-[#1e3a5f] to-[#0f1e35] hover:from-[#275485] hover:to-[#152a4a] text-[#7dd3fc] border-2 border-[#38bdf8]/60 rounded text-xs font-black transition-all shadow-[0_0_8px_rgba(125,211,252,0.25)] active:scale-95 flex items-center justify-center gap-0.5"
            title="战士三大变异流派天赋星盘 (按 N)"
          >
            <span>⭐</span>
            <span>天赋(N)</span>
          </button>
        </div>

        <div class="flex gap-2">
          <button 
            @click="$emit('openModal', 'autopilot')"
            class="w-16 py-1.5 bg-gradient-to-b from-[#3a2f23] to-[#1e1710] hover:from-[#4d3e2d] hover:to-[#2c2217] text-[#f3c258] border-2 border-[#6d563a] rounded text-xs font-bold transition-all shadow-md active:scale-95"
          >
            挂机(L)
          </button>
          <button 
            @click="$emit('openModal', 'enhance')"
            class="w-16 py-1.5 bg-gradient-to-b from-[#3a2023] to-[#1e0f12] hover:from-[#522c31] hover:to-[#2c151a] text-[#f87171] border-2 border-[#7a3b45] rounded text-xs font-black transition-all shadow-[0_0_8px_rgba(248,113,113,0.25)] active:scale-95 flex items-center justify-center gap-0.5"
            title="装备部位强化与共鸣 (按 U)"
          >
            <span>⚒️</span>
            <span>强化(U)</span>
          </button>
          <button 
            @click="$emit('openModal', 'settings')"
            class="w-16 py-1.5 bg-gradient-to-b from-[#3a2f23] to-[#1e1710] hover:from-[#4d3e2d] hover:to-[#2c2217] text-[#f3c258] border-2 border-[#6d563a] rounded text-xs font-bold transition-all shadow-md active:scale-95"
          >
            设置(O)
          </button>
          <button 
            @click="$emit('toggleSound')"
            class="w-16 py-1.5 bg-gradient-to-b from-[#3a2f23] to-[#1e1710] hover:from-[#4d3e2d] hover:to-[#2c2217] text-[#f3c258] border-2 border-[#6d563a] rounded text-xs font-bold transition-all shadow-md active:scale-95"
          >
            {{ isSoundOn ? '🔊 声音' : '🔇 静音' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { BattleLog, Entity, ItemInstance, SkillDef } from '../types/game';

const props = defineProps<{
  player: Entity;
  skills: SkillDef[];
  inventory: ItemInstance[];
  logs: BattleLog[];
  isSoundOn: boolean;
}>();

defineEmits<{
  (e: 'castSkill', skill: SkillDef): void;
  (e: 'useHpPotion'): void;
  (e: 'useMpPotion'): void;
  (e: 'openModal', modalName: string): void;
  (e: 'toggleSound'): void;
}>();

const activeTab = ref<'all' | 'drop' | 'system'>('all');

const filteredLogs = computed(() => {
  if (activeTab.value === 'drop') return props.logs.filter(l => l.type === 'drop');
  if (activeTab.value === 'system') return props.logs.filter(l => l.type === 'system');
  return props.logs;
});

const getLogClass = (log: BattleLog) => {
  if (log.type === 'system') return 'text-amber-400 font-semibold';
  if (log.type === 'drop') {
    if (log.quality === 4) return 'text-orange-400 font-bold';
    if (log.quality === 3) return 'text-purple-400 font-bold';
    if (log.quality === 2) return 'text-blue-400 font-medium';
    if (log.quality === 1) return 'text-emerald-400';
    return 'text-slate-300';
  }
  if (log.type === 'kill') return 'text-zinc-300';
  return 'text-zinc-400';
};

const expPercent = computed(() => {
  if (!props.player.stats.maxExp) return 0;
  return Math.min(100, (props.player.stats.exp / props.player.stats.maxExp) * 100);
});

const hpPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.player.stats.hp / props.player.stats.maxHp) * 100));
});

const mpPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.player.stats.mp / props.player.stats.maxMp) * 100));
});

const hpPotionCount = computed(() => {
  return props.inventory
    .filter(i => i.type === 'potion' && (i.recoverHp || 0) > 0)
    .reduce((sum, i) => sum + (i.count || 1), 0);
});

const mpPotionCount = computed(() => {
  return props.inventory
    .filter(i => i.type === 'potion' && (i.recoverMp || 0) > 0)
    .reduce((sum, i) => sum + (i.count || 1), 0);
});
</script>
