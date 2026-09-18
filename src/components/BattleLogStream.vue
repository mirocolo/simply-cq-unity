<template>
  <div class="pointer-events-none absolute bottom-16 left-3 z-10 w-80 max-h-48 flex flex-col justify-end select-none">
    <div class="pointer-events-auto bg-black/60 backdrop-blur-md rounded-lg border border-legend-border/80 shadow-panel p-2 flex flex-col">
      <!-- 标题栏微缩 -->
      <div class="flex items-center justify-between text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1 mb-1">
        <span>📜 战斗与掉落信息流</span>
        <span class="text-zinc-500">自动滚动</span>
      </div>

      <!-- 日志列表 -->
      <div 
        ref="listRef"
        class="overflow-y-auto max-h-36 flex flex-col gap-1 pr-1 text-[11px] leading-relaxed"
      >
        <div 
          v-for="log in logs" 
          :key="log.id"
          class="flex items-baseline gap-1"
        >
          <span class="text-zinc-500 font-mono text-[9px] shrink-0">[{{ log.timestamp }}]</span>
          <span :class="getLogClass(log)">{{ log.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { BattleLog } from '../types/game';

const props = defineProps<{
  logs: BattleLog[];
}>();

const listRef = ref<HTMLDivElement | null>(null);

const getLogClass = (log: BattleLog) => {
  if (log.type === 'system') return 'text-amber-400 font-semibold';
  if (log.type === 'drop') {
    if (log.quality === 4) return 'text-orange-400 font-bold text-crit-glow';
    if (log.quality === 3) return 'text-purple-400 font-bold';
    if (log.quality === 2) return 'text-blue-400 font-medium';
    if (log.quality === 1) return 'text-emerald-400';
    return 'text-slate-300';
  }
  if (log.type === 'kill') return 'text-zinc-300';
  return 'text-zinc-400';
};

watch(() => props.logs.length, () => {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = 0; // 最新的在顶部
    }
  });
});
</script>
