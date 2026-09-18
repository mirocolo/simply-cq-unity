<template>
  <div class="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center select-none">
    <!-- 经验条 (铺满整条底部) -->
    <div class="pointer-events-auto relative w-full h-3 bg-zinc-950 border-t border-legend-border overflow-hidden">
      <div 
        class="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300"
        :style="{ width: `${expPercent}%` }"
      ></div>
      <span class="absolute inset-0 flex items-center justify-center text-[10px] text-emerald-100 font-mono font-bold leading-none">
        EXP: {{ expPercent.toFixed(1) }}% ({{ player.stats.exp }} / {{ player.stats.maxExp }})
      </span>
    </div>

    <!-- 核心操作底栏 -->
    <div class="pointer-events-auto w-full bg-gradient-to-t from-black via-zinc-950/95 to-zinc-900/90 border-t border-legend-border px-4 py-2 flex items-center justify-between">
      <!-- 左侧：快捷药水栏 (Q, W) -->
      <div class="flex items-center gap-2">
        <!-- Q 键生命药 -->
        <button 
          @click="$emit('useHpPotion')"
          class="relative w-12 h-12 bg-zinc-900 rounded-lg border-2 border-red-900/80 hover:border-red-500 flex flex-col items-center justify-center transition-all group active:scale-95 shadow-md"
        >
          <span class="text-xl">🍷</span>
          <span class="absolute top-0.5 left-1 text-[10px] font-bold text-red-400 font-mono">Q</span>
          <span class="absolute bottom-0.5 right-1 text-[10px] font-bold text-white bg-red-900/90 px-1 rounded-full">
            {{ hpPotionCount }}
          </span>
        </button>

        <!-- W 键法力药 -->
        <button 
          @click="$emit('useMpPotion')"
          class="relative w-12 h-12 bg-zinc-900 rounded-lg border-2 border-blue-900/80 hover:border-blue-500 flex flex-col items-center justify-center transition-all group active:scale-95 shadow-md"
        >
          <span class="text-xl">🍶</span>
          <span class="absolute top-0.5 left-1 text-[10px] font-bold text-blue-400 font-mono">W</span>
          <span class="absolute bottom-0.5 right-1 text-[10px] font-bold text-white bg-blue-900/90 px-1 rounded-full">
            {{ mpPotionCount }}
          </span>
        </button>
      </div>

      <!-- 中间：经典技能快捷栏 (1 ~ 4) -->
      <div class="flex items-center gap-2">
        <div 
          v-for="(skill, index) in skills" 
          :key="skill.id"
          @click="$emit('castSkill', skill)"
          class="relative w-13 h-13 p-1 bg-zinc-900 rounded-lg border-2 border-amber-900/80 hover:border-amber-400 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-panel group"
        >
          <!-- 技能图标 -->
          <span class="text-2xl">{{ skill.icon }}</span>

          <!-- 快捷键编号 -->
          <span class="absolute top-0.5 left-1 text-[10px] font-black text-amber-400 font-mono">
            {{ index + 1 }}
          </span>

          <!-- 技能名称微缩 -->
          <span class="text-[9px] text-zinc-300 truncate max-w-[48px] leading-tight mt-0.5">
            {{ skill.name }}
          </span>

          <!-- 冷却遮罩 (半透明扇形/矩形倒计时) -->
          <div 
            v-if="skill.currentCdTicks > 0"
            class="absolute inset-0 bg-black/75 rounded-lg flex items-center justify-center text-xs font-bold text-amber-300 font-mono"
          >
            {{ (skill.currentCdTicks / 10).toFixed(1) }}s
          </div>
        </div>
      </div>

      <!-- 右侧：功能弹窗菜单按钮 -->
      <div class="flex items-center gap-2">
        <button 
          @click="$emit('openModal', 'character')"
          class="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-legend-gold border border-legend-border rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow"
        >
          <span>👤</span>
          <span>人物(C)</span>
        </button>

        <button 
          @click="$emit('openModal', 'inventory')"
          class="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-legend-gold border border-legend-border rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow"
        >
          <span>🎒</span>
          <span>背包(B)</span>
        </button>

        <button 
          @click="$emit('openModal', 'autopilot')"
          class="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-legend-gold border border-legend-border rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow"
        >
          <span>⚙️</span>
          <span>挂机(L)</span>
        </button>

        <button 
          @click="$emit('openModal', 'settings')"
          class="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-legend-border rounded-lg text-xs font-bold transition-all shadow"
          title="系统设置 (O)"
        >
          ⚙
        </button>

        <button 
          @click="$emit('toggleSound')"
          class="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-legend-border rounded-lg text-xs font-bold transition-all shadow"
          :title="isSoundOn ? '音效开启' : '音效静音'"
        >
          {{ isSoundOn ? '🔊' : '🔇' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Entity, ItemInstance, SkillDef } from '../types/game';

const props = defineProps<{
  player: Entity;
  skills: SkillDef[];
  inventory: ItemInstance[];
  isSoundOn: boolean;
}>();

defineEmits<{
  (e: 'castSkill', skill: SkillDef): void;
  (e: 'useHpPotion'): void;
  (e: 'useMpPotion'): void;
  (e: 'openModal', modalName: string): void;
  (e: 'toggleSound'): void;
}>();

const expPercent = computed(() => {
  if (!props.player.stats.maxExp) return 0;
  return Math.min(100, (props.player.stats.exp / props.player.stats.maxExp) * 100);
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
