<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
    <div class="relative w-full max-w-md legend-box p-5 rounded-lg flex flex-col gap-3 animate-fadeIn text-zinc-200 border-2 border-amber-600 shadow-gold-glow">
      <!-- 弹窗标题 -->
      <div class="text-center pb-2 border-b border-legend-border">
        <span class="text-3xl block mb-1">🏮</span>
        <h2 class="text-lg font-black text-gold-gradient text-gold-glow">
          欢迎大侠归来！
        </h2>
        <span class="text-xs text-amber-300/80">
          离开江湖期间，您的角色仍在勤勉挂机修行
        </span>
      </div>

      <!-- 挂机时长 -->
      <div class="bg-zinc-950/80 p-2.5 rounded border border-zinc-800 text-center text-xs">
        <span class="text-zinc-400">本次离线时长: </span>
        <span class="font-bold text-amber-400 font-mono">{{ formatTime(reward.offlineSeconds) }}</span>
      </div>

      <!-- 挂机收益明细 -->
      <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col gap-2">
        <div class="flex justify-between text-xs py-1 border-b border-zinc-900">
          <span class="text-zinc-400">收获经验:</span>
          <span class="font-bold text-emerald-400 font-mono">+{{ reward.expGained.toLocaleString() }} EXP</span>
        </div>
        <div class="flex justify-between text-xs py-1 border-b border-zinc-900">
          <span class="text-zinc-400">拾取金币:</span>
          <span class="font-bold text-yellow-400 font-mono">🪙 {{ reward.goldGained.toLocaleString() }}</span>
        </div>

        <!-- 获得装备 -->
        <div v-if="reward.itemsGained.length > 0" class="flex flex-col gap-1.5 mt-1">
          <span class="text-[11px] text-zinc-400">偶遇战利品:</span>
          <div class="flex gap-2">
            <div 
              v-for="item in reward.itemsGained" 
              :key="item.instanceId"
              class="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-xs"
            >
              <span>{{ item.icon }}</span>
              <span :class="getQualityClass(item.quality)">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 领取按钮 -->
      <button 
        @click="$emit('claim')"
        class="w-full py-2.5 bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-white font-black rounded-lg text-sm shadow-gold-glow active:scale-95 transition-all mt-1"
      >
        收入囊中，再战江湖！
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OfflineReward } from '../domain/StorageManager';
import { ItemQuality } from '../types/game';

defineProps<{
  reward: OfflineReward;
}>();

defineEmits<{
  (e: 'claim'): void;
}>();

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}小时${m}分钟`;
  return `${m}分钟`;
};

const getQualityClass = (q: ItemQuality) => {
  switch (q) {
    case 3: return 'text-purple-400 font-bold';
    case 2: return 'text-blue-400 font-medium';
    case 1: return 'text-emerald-400';
    default: return 'text-slate-300';
  }
};
</script>
