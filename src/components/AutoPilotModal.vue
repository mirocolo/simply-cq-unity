<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
    <!-- 挂机设置与收益看板容器 -->
    <div class="relative w-full max-w-lg legend-box p-4 rounded-lg flex flex-col gap-3 animate-fadeIn text-zinc-200">
      <!-- 标题 -->
      <div class="flex items-center justify-between border-b border-legend-border pb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">⚙️</span>
          <span class="text-base font-bold text-gold-gradient">智能挂机与收益看板</span>
        </div>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-zinc-800 text-lg font-bold"
        >
          ✕
        </button>
      </div>

      <!-- 挂机状态大按钮 -->
      <div class="flex items-center justify-between p-3 rounded-lg border" :class="config.enabled ? 'bg-emerald-950/40 border-emerald-600' : 'bg-zinc-900 border-zinc-800'">
        <div class="flex flex-col">
          <span class="text-sm font-bold" :class="config.enabled ? 'text-emerald-400' : 'text-zinc-400'">
            {{ config.enabled ? '● 自动挂机已开启' : '○ 自动挂机已暂停' }}
          </span>
          <span class="text-[11px] text-zinc-500">
            快捷键【T】可全局秒切挂机状态；手操时自动让位
          </span>
        </div>
        <button 
          @click="config.enabled = !config.enabled"
          class="px-4 py-2 rounded font-bold text-xs shadow transition-all active:scale-95"
          :class="config.enabled ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
        >
          {{ config.enabled ? '停止挂机' : '开启挂机' }}
        </button>
      </div>

      <!-- 本次挂机收益战绩实时大盘 -->
      <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col gap-2">
        <div class="text-xs font-bold text-amber-300/90 flex justify-between">
          <span>📊 本次挂机战绩统计</span>
          <span class="text-zinc-500 font-mono text-[10px]">运行时长: {{ formattedDuration }}</span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-400 text-[10px] block">击杀怪物</span>
            <span class="text-amber-400 font-bold text-base">{{ stats.killCount }} 只</span>
            <span class="text-[9px] text-zinc-500 block">({{ killPerMin }} 只/分)</span>
          </div>
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-400 text-[10px] block">获得经验</span>
            <span class="text-emerald-400 font-bold text-base">+{{ stats.expGained.toLocaleString() }}</span>
          </div>
          <div class="bg-zinc-900/80 p-2 rounded border border-zinc-800">
            <span class="text-zinc-400 text-[10px] block">拾取金币</span>
            <span class="text-yellow-400 font-bold text-base">🪙 {{ stats.goldGained.toLocaleString() }}</span>
          </div>
        </div>

        <!-- 极品爆装掉落分布 -->
        <div class="flex justify-around bg-zinc-900/50 p-2 rounded border border-zinc-800/80 text-[11px]">
          <span class="text-blue-400">精良蓝装: <b>{{ stats.blueDrops }}</b></span>
          <span class="text-purple-400">史诗紫装: <b>{{ stats.purpleDrops }}</b></span>
          <span class="text-orange-400">传说橙装: <b>{{ stats.orangeDrops }}</b></span>
        </div>
      </div>

      <!-- 挂机策略配置选项 -->
      <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col gap-2.5 text-xs">
        <span class="text-xs font-bold text-amber-300/90">⚙️ 智能策略调节</span>

        <!-- 自动喝血线 -->
        <div class="flex items-center justify-between">
          <span class="text-zinc-300">自动喝生命药血线:</span>
          <div class="flex items-center gap-2">
            <input 
              type="range" 
              min="20" 
              max="80" 
              step="5"
              v-model.number="config.autoPotionHpPercent"
              class="w-28 accent-red-600"
            />
            <span class="font-mono font-bold text-red-400 w-8 text-right">&lt;{{ config.autoPotionHpPercent }}%</span>
          </div>
        </div>

        <!-- 自动喝蓝线 -->
        <div class="flex items-center justify-between">
          <span class="text-zinc-300">自动喝法力药蓝线:</span>
          <div class="flex items-center gap-2">
            <input 
              type="range" 
              min="10" 
              max="60" 
              step="5"
              v-model.number="config.autoPotionMpPercent"
              class="w-28 accent-blue-600"
            />
            <span class="font-mono font-bold text-blue-400 w-8 text-right">&lt;{{ config.autoPotionMpPercent }}%</span>
          </div>
        </div>

        <!-- 自动技能开关 -->
        <div class="flex items-center justify-between">
          <span class="text-zinc-300">就绪时自动释放技能 (烈火/刺杀/攻杀):</span>
          <input 
            type="checkbox" 
            v-model="config.autoSkill"
            class="w-4 h-4 accent-amber-500 rounded"
          />
        </div>

        <!-- 自动拾取开关 -->
        <div class="flex items-center justify-between">
          <span class="text-zinc-300">自动拾取附近掉落战利品:</span>
          <input 
            type="checkbox" 
            v-model="config.autoPickup"
            class="w-4 h-4 accent-amber-500 rounded"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AutoPilotConfig, AutoPilotStats } from '../types/game';

const props = defineProps<{
  config: AutoPilotConfig;
  stats: AutoPilotStats;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const formattedDuration = computed(() => {
  const sec = Math.floor(props.stats.activeTimeSeconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
});

const killPerMin = computed(() => {
  if (props.stats.activeTimeSeconds < 10) return '0.0';
  const mins = props.stats.activeTimeSeconds / 60;
  return (props.stats.killCount / mins).toFixed(1);
});
</script>
