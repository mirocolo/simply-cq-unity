<template>
  <div class="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 select-none">
    <!-- 顶栏区域 -->
    <div class="flex items-start justify-between w-full">
      <!-- 左上角：人物血蓝、等级与战力 -->
      <div class="pointer-events-auto flex items-center gap-3 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-legend-border shadow-panel">
        <!-- 头像与等级 -->
        <div class="relative w-14 h-14 rounded-full border-2 border-legend-gold bg-legend-panel flex items-center justify-center shadow-gold-glow">
          <span class="text-2xl">⚔️</span>
          <span class="absolute -bottom-1 -right-1 bg-red-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full border border-yellow-400">
            Lv.{{ player.stats.level }}
          </span>
        </div>

        <!-- 名字、血条、蓝条与战力 -->
        <div class="flex flex-col gap-1 w-48">
          <div class="flex items-center justify-between text-xs text-legend-gold font-bold">
            <span>{{ player.name }}</span>
            <span class="text-yellow-400 flex items-center gap-1">
              <span>🪙</span> {{ player.stats.gold.toLocaleString() }}
            </span>
          </div>

          <!-- HP 条 -->
          <div class="relative w-full h-3.5 bg-slate-900 rounded border border-red-900 overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-200"
              :style="{ width: `${hpPercent}%` }"
            ></div>
            <span class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-mono leading-none drop-shadow">
              {{ player.stats.hp }} / {{ player.stats.maxHp }}
            </span>
          </div>

          <!-- MP 条 -->
          <div class="relative w-full h-2.5 bg-slate-900 rounded border border-blue-900 overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-blue-700 to-cyan-500 transition-all duration-200"
              :style="{ width: `${mpPercent}%` }"
            ></div>
            <span class="absolute inset-0 flex items-center justify-center text-[9px] text-white font-mono leading-none drop-shadow">
              {{ player.stats.mp }} / {{ player.stats.maxMp }}
            </span>
          </div>

          <!-- 战力值大字 -->
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="text-[11px] text-amber-300/80 font-bold">战斗力:</span>
            <span class="text-gold-gradient text-xl font-black tracking-wider text-gold-glow">
              {{ player.stats.combatPower.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- 顶中：锁定目标血条 (若选中) -->
      <div 
        v-if="selectedMonster" 
        class="pointer-events-auto bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-red-900 shadow-panel flex items-center gap-3 animate-fadeIn"
      >
        <span class="text-2xl">{{ selectedMonster.icon || '👾' }}</span>
        <div class="w-44">
          <div class="flex justify-between text-xs font-bold text-red-300 mb-1">
            <span>{{ selectedMonster.name }}</span>
            <span>Lv.{{ selectedMonster.stats.level }}</span>
          </div>
          <div class="relative w-full h-3 bg-slate-900 rounded border border-red-950 overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-rose-700 to-red-500 transition-all duration-200"
              :style="{ width: `${Math.max(0, (selectedMonster.stats.hp / selectedMonster.stats.maxHp) * 100)}%` }"
            ></div>
            <span class="absolute inset-0 flex items-center justify-center text-[9px] text-white font-mono">
              {{ selectedMonster.stats.hp }} / {{ selectedMonster.stats.maxHp }}
            </span>
          </div>
        </div>
      </div>

      <!-- 顶右：挂机指示与地图信息 -->
      <div class="flex flex-col items-end gap-2">
        <div class="pointer-events-auto flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-legend-border">
          <span class="text-xs text-yellow-200/90 font-medium">📍 比奇野外 [{{ player.gridPos.x }}, {{ player.gridPos.y }}]</span>
        </div>

        <!-- 挂机开关状态胶囊 -->
        <button 
          @click="$emit('toggleAuto')"
          class="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-bold shadow-lg"
          :class="isAutoEnabled 
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-900/50 animate-pulse' 
            : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
        >
          <span class="w-2 h-2 rounded-full" :class="isAutoEnabled ? 'bg-emerald-400' : 'bg-zinc-500'"></span>
          <span>{{ isAutoEnabled ? '挂机战斗中 (按T)' : '手动操作中 (按T挂机)' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Entity } from '../types/game';

const props = defineProps<{
  player: Entity;
  selectedMonster: Entity | null;
  isAutoEnabled: boolean;
}>();

defineEmits<{
  (e: 'toggleAuto'): void;
}>();

const hpPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.player.stats.hp / props.player.stats.maxHp) * 100));
});

const mpPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.player.stats.mp / props.player.stats.maxMp) * 100));
});
</script>
