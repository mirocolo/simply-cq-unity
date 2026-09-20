<template>
  <div class="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 select-none font-serif">
    <!-- 顶栏区域 -->
    <div class="flex items-start justify-between w-full">
      <!-- 左上角：经典龙纹浮雕人物信息框 -->
      <div class="pointer-events-auto flex items-center gap-3 bg-gradient-to-r from-[#17130e] via-[#221c15] to-[#120f0c] p-2.5 rounded-lg border-2 border-[#6d563a] shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
        <!-- 战士青铜头盔勋章头像 -->
        <div class="relative w-14 h-14 rounded-full border-2 border-[#d4af37] bg-black flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.5)]">
          <span class="text-3xl">⚔️</span>
          <span class="absolute -bottom-1 -right-1 bg-red-800 text-yellow-300 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-yellow-500 font-mono">
            {{ player.stats.level }}
          </span>
        </div>

        <div class="flex flex-col gap-1 w-44">
          <div class="flex items-center justify-between text-xs text-[#f3c258] font-bold">
            <span class="tracking-wide text-sm">{{ player.name }}</span>
            <span class="text-yellow-400 font-mono flex items-center gap-1 text-[11px]">
              🪙 {{ player.stats.gold.toLocaleString() }}
            </span>
          </div>

          <!-- 战力大字 -->
          <div class="flex items-baseline gap-1 bg-black/60 px-2 py-0.5 rounded border border-[#4a3b2b]">
            <span class="text-[10px] text-amber-200/80 font-bold">战力:</span>
            <span class="text-gold-gradient text-xl font-black tracking-wider text-gold-glow font-mono">
              {{ player.stats.combatPower.toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- 挂机快捷胶囊 -->
        <button 
          @click="$emit('toggleAuto')"
          class="ml-1 px-3 py-2 rounded-lg border-2 font-bold text-xs shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
          :class="isAutoEnabled 
            ? 'bg-emerald-950 border-emerald-500 text-emerald-300 animate-pulse' 
            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
        >
          <span class="text-base">{{ isAutoEnabled ? '⚡' : '💤' }}</span>
          <span class="text-[10px]">{{ isAutoEnabled ? '挂机中' : '手动' }}</span>
        </button>
      </div>

      <!-- 顶中：锁定目标血条 (若选中怪物) -->
      <div 
        v-if="selectedMonster" 
        class="pointer-events-auto bg-black/85 backdrop-blur-md px-4 py-2 rounded-lg border-2 border-red-900 shadow-panel flex items-center gap-3 animate-fadeIn"
      >
        <span class="text-2xl">{{ selectedMonster.icon || '👾' }}</span>
        <div class="w-44">
          <div class="flex justify-between text-xs font-bold text-red-300 mb-1">
            <span>{{ selectedMonster.name }}</span>
            <span>Lv.{{ selectedMonster.stats.level }}</span>
          </div>
          <div class="relative w-full h-3 bg-slate-950 rounded border border-red-950 overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-red-700 to-rose-500 transition-all duration-200"
              :style="{ width: `${Math.max(0, (selectedMonster.stats.hp / selectedMonster.stats.maxHp) * 100)}%` }"
            ></div>
            <span class="absolute inset-0 flex items-center justify-center text-[9px] text-white font-mono">
              {{ selectedMonster.stats.hp }} / {{ selectedMonster.stats.maxHp }}
            </span>
          </div>
        </div>
      </div>

      <!-- 右上角：传奇经典青铜罗盘小地图 (Mini-map Radar) -->
      <div class="pointer-events-auto flex flex-col items-end gap-1">
        <!-- 罗盘外壳 -->
        <div class="relative w-36 h-36 bg-[#0e0c0a] rounded-full border-4 border-[#7a603c] shadow-[0_0_15px_rgba(0,0,0,0.9),inset_0_0_15px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
          <!-- 罗盘背景十字刻度 -->
          <div class="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div class="w-full h-0.5 bg-[#d4af37]"></div>
            <div class="h-full w-0.5 bg-[#d4af37] absolute"></div>
          </div>

          <!-- 雷达点集：以玩家为中心映射周边坐标 -->
          <div class="relative w-28 h-28">
            <!-- 自身绿点 (处于正中) -->
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white shadow-[0_0_6px_#10b981] animate-ping"></div>
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full border border-white"></div>

            <!-- 周边怪物红点 -->
            <div 
              v-for="m in radarMonsters" 
              :key="m.id"
              class="absolute rounded-full -translate-x-1/2 -translate-y-1/2 transition-all"
              :class="m.isBoss 
                ? 'w-2.5 h-2.5 bg-purple-500 border border-yellow-300 shadow-[0_0_8px_#a855f7] animate-pulse' 
                : 'w-1.5 h-1.5 bg-red-500 border border-black'"
              :style="{
                left: `${50 + (m.gridPos.x - player.gridPos.x) * 4.5}%`,
                top: `${50 + (m.gridPos.y - player.gridPos.y) * 4.5}%`
              }"
            ></div>
          </div>

          <!-- 罗盘外圈金属反光与四方刻度 -->
          <span class="absolute top-1 text-[9px] font-bold text-[#d4af37] font-mono">北</span>
          <span class="absolute bottom-1 text-[9px] font-bold text-[#d4af37] font-mono">南</span>
          <span class="absolute left-1 text-[9px] font-bold text-[#d4af37] font-mono">西</span>
          <span class="absolute right-1 text-[9px] font-bold text-[#d4af37] font-mono">东</span>
        </div>

        <!-- 坐标与地图名牌 -->
        <div class="bg-black/80 px-2.5 py-0.5 rounded border border-[#5c4a34] text-[10px] text-amber-200 font-mono text-center shadow">
          {{ currentMapName || '比奇荒原' }} [{{ player.gridPos.x }}, {{ player.gridPos.y }}]
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Entity } from '../types/game';

const props = defineProps<{
  player: Entity;
  monsters?: Entity[];
  selectedMonster: Entity | null;
  isAutoEnabled: boolean;
  currentMapName?: string;
}>();

defineEmits<{
  (e: 'toggleAuto'): void;
}>();

// 雷达上只显示离玩家 12 格以内的怪物
const radarMonsters = computed(() => {
  if (!props.monsters) return [];
  const px = props.player.gridPos.x;
  const py = props.player.gridPos.y;
  return props.monsters.filter(m => {
    if (m.state === 'dead') return false;
    const dx = Math.abs(m.gridPos.x - px);
    const dy = Math.abs(m.gridPos.y - py);
    return dx <= 10 && dy <= 10;
  });
});
</script>
