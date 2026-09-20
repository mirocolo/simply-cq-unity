<template>
  <div @click.self="$emit('close')" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
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
      <!-- 挂机策略配置选项 -->
      <div class="bg-zinc-950/90 p-3 rounded-lg border border-legend-border flex flex-col gap-3 text-xs">
        <span class="text-xs font-bold text-amber-300/90 border-b border-zinc-800 pb-1 flex items-center gap-1">
          <span>⚙️</span>
          <span>挂机智能策略调节</span>
        </span>

        <!-- 自动喝生命药开关与血线 -->
        <div class="flex flex-col gap-1.5 bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="config.autoHpPotion"
                class="w-4 h-4 accent-red-600 rounded"
              />
              <span class="text-zinc-200 font-semibold">自动饮用金创药 (生命恢复)</span>
            </label>
            <span class="font-mono font-bold text-red-400 text-xs">
              {{ config.autoHpPotion ? `< ${config.autoPotionHpPercent}% 触发` : '已禁用' }}
            </span>
          </div>
          <div v-if="config.autoHpPotion" class="flex items-center justify-between pl-6 text-zinc-400">
            <span>生命低于阈值喝药:</span>
            <div class="flex items-center gap-2">
              <input 
                type="range" 
                min="20" 
                max="85" 
                step="5"
                v-model.number="config.autoPotionHpPercent"
                class="w-28 accent-red-600 cursor-pointer"
              />
              <span class="font-mono font-bold text-red-300 w-10 text-right">{{ config.autoPotionHpPercent }}%</span>
            </div>
          </div>
        </div>

        <!-- 自动喝法力药开关与蓝线 -->
        <div class="flex flex-col gap-1.5 bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                v-model="config.autoMpPotion"
                class="w-4 h-4 accent-blue-600 rounded"
              />
              <span class="text-zinc-200 font-semibold">自动饮用魔法药 (法力恢复)</span>
            </label>
            <span class="font-mono font-bold text-blue-400 text-xs">
              {{ config.autoMpPotion ? `< ${config.autoPotionMpPercent}% 触发` : '已禁用' }}
            </span>
          </div>
          <div v-if="config.autoMpPotion" class="flex items-center justify-between pl-6 text-zinc-400">
            <span>法力低于阈值喝药:</span>
            <div class="flex items-center gap-2">
              <input 
                type="range" 
                min="10" 
                max="70" 
                step="5"
                v-model.number="config.autoPotionMpPercent"
                class="w-28 accent-blue-600 cursor-pointer"
              />
              <span class="font-mono font-bold text-blue-300 w-10 text-right">{{ config.autoPotionMpPercent }}%</span>
            </div>
          </div>
        </div>

        <!-- 自动技能开关 -->
        <div class="flex items-center justify-between bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              v-model="config.autoSkill"
              class="w-4 h-4 accent-amber-500 rounded"
            />
            <span class="text-zinc-300">就绪时自动释放技能 (烈火/刺杀/攻杀)</span>
          </label>
          <span class="text-[10px] text-zinc-500 font-mono">{{ config.autoSkill ? '已开启' : '关闭' }}</span>
        </div>

        <!-- 自动拾取开关 -->
        <div class="flex items-center justify-between bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              v-model="config.autoPickup"
              class="w-4 h-4 accent-amber-500 rounded"
            />
            <span class="text-zinc-300">自动走位拾取附近掉落战利品</span>
          </label>
          <span class="text-[10px] text-zinc-500 font-mono">{{ config.autoPickup ? '已开启' : '关闭' }}</span>
        </div>

        <!-- 自动回收战力更低装备 -->
        <div class="flex items-center justify-between bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              v-model="config.autoRecycleWeaker"
              class="w-4 h-4 accent-amber-500 rounded"
            />
            <span class="text-zinc-300">背包拥挤时自动穿戴最强装并熔炼弱装</span>
          </label>
          <span class="text-[10px] text-zinc-500 font-mono">{{ config.autoRecycleWeaker ? '防爆仓' : '关闭' }}</span>
        </div>

        <!-- 自动熔炼多余装备品质范围 -->
        <div v-if="config.autoRecycleWeaker" class="flex items-center justify-between bg-zinc-900/40 p-2 rounded border border-zinc-800/60 pl-6 text-xs">
          <span class="text-zinc-400">防爆仓自动熔炼冗余品阶：</span>
          <select 
            v-model.number="config.autoRecycleMaxQuality"
            class="bg-zinc-950 text-amber-300 border border-zinc-700 rounded px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option :value="1">白/绿普通装</option>
            <option :value="2">蓝装及以下 (推荐·防爆仓)</option>
            <option :value="3">紫装及以下 (极速高阶图)</option>
          </select>
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
