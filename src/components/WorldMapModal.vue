<template>
  <div @click.self="$emit('close')" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
    <div class="relative w-full max-w-4xl max-h-[92vh] overflow-hidden legend-box p-5 rounded-lg flex flex-col gap-4 animate-fadeIn text-zinc-200 border border-amber-900/60 shadow-2xl">
      <!-- 弹窗头部 -->
      <div class="flex items-center justify-between border-b border-amber-900/50 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">🌌</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-amber-300">九州十界·万象星图</span>
              <span class="text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300">
                [快捷键 M]
              </span>
            </div>
            <p class="text-xs text-zinc-400 mt-0.5">
              破空飞升穿梭于洪荒诸天，探寻各大位面隐秘禁地与太古神兽首领
            </p>
          </div>
        </div>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 text-base font-bold transition-all"
        >
          ✕
        </button>
      </div>

      <!-- 地图卡片列表 -->
      <div class="overflow-y-auto max-h-[68vh] pr-1 flex flex-col gap-3 custom-scrollbar">
        <div 
          v-for="map in allMaps" 
          :key="map.id"
          class="relative p-3.5 rounded-lg border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
          :class="getCardClass(map.id, map.tier)"
        >
          <!-- 左侧：位面信息 -->
          <div class="flex items-start gap-3.5">
            <!-- 位面阶数徽章 -->
            <div 
              class="w-12 h-12 rounded-lg flex flex-col items-center justify-center border shadow-inner flex-shrink-0"
              :class="getBadgeClass(map.tier)"
            >
              <span class="text-base font-bold">{{ map.tier }}阶</span>
              <span class="text-[9px] opacity-80">位面</span>
            </div>

            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-base font-bold" :class="isCurrent(map.id) ? 'text-amber-300' : 'text-zinc-100'">
                  {{ map.name }}
                </span>
                <span 
                  v-if="isCurrent(map.id)" 
                  class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse"
                >
                  📍 当前位面
                </span>
                <span class="text-xs px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-300 border border-zinc-700/40">
                  {{ map.recommendedLevel }}
                </span>
              </div>
              <p class="text-xs text-zinc-400 leading-relaxed max-w-xl">
                {{ map.desc }}
              </p>

              <!-- 首领与守关怪信息 -->
              <div class="flex items-center gap-3 mt-1 text-xs flex-wrap">
                <div class="flex items-center gap-1.5">
                  <span class="text-zinc-500">守关首领:</span>
                  <span class="font-bold text-red-400">{{ getBossName(map) }}</span>
                </div>

                <div class="flex items-center gap-1.5">
                  <span class="text-zinc-500">首领状态:</span>
                  <span :class="getBossStatus(map).colorClass" class="font-bold text-xs">
                    {{ getBossStatus(map).text }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：传送交互按钮 -->
          <div class="flex items-center gap-2 self-end md:self-center flex-shrink-0">
            <button
              v-if="isCurrent(map.id)"
              disabled
              class="px-4 py-2 rounded text-xs font-bold bg-amber-950/40 text-amber-300 border border-amber-700/50 cursor-default opacity-90"
            >
              当前驻留中
            </button>

            <button
              v-else-if="canTravel(map.id).allowed"
              @click="$emit('fastTravel', map.id)"
              class="px-4 py-2 rounded text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-950 shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>🌀</span>
              <span>破空传送</span>
            </button>

            <button
              v-else
              disabled
              class="px-4 py-2 rounded text-xs font-bold bg-zinc-900/60 text-zinc-500 border border-zinc-800 cursor-not-allowed flex items-center gap-1.5"
              :title="canTravel(map.id).reason"
            >
              <span>🔒</span>
              <span>{{ canTravel(map.id).reason }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部提示栏 -->
      <div class="border-t border-amber-900/40 pt-3 flex flex-col md:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
        <div class="flex items-center gap-2">
          <span class="text-amber-400">💡 穿梭法则:</span>
          <span>每个位面深处皆有接引光柱传送门；亦可达成等级与飞升门槛后在此随时传送。</span>
        </div>
        <div class="text-zinc-500 font-mono text-[11px]">
          当前战力: {{ world.player.stats.combatPower.toLocaleString() }} | 境界: {{ world.player.stats.ascensionTier }}转飞升
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { GameWorld } from '../domain/GameWorld';
import { MapDefinition } from '../types/map';
import { MONSTER_TEMPLATES } from '../domain/definitions/monsters';

const props = defineProps<{
  world: GameWorld;
  currentTick: number;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'fastTravel', mapId: string): void;
}>();

const allMaps = computed(() => {
  return props.world.mapManager.getAllMaps();
});

function isCurrent(mapId: string): boolean {
  return props.world.mapManager.currentMapId === mapId;
}

function canTravel(mapId: string) {
  const level = props.world.player.stats.level;
  const tier = props.world.player.stats.ascensionTier || 0;
  return props.world.mapManager.canFastTravelToMap(mapId, level, tier);
}

function getBossTemplateId(map: MapDefinition): string | null {
  const bossSpawn = map.spawns.find(s => s.isGuaranteedBoss);
  if (bossSpawn) return bossSpawn.templateId;
  const anyBoss = map.spawns.find(s => MONSTER_TEMPLATES[s.templateId]?.isBoss);
  return anyBoss ? anyBoss.templateId : null;
}

function getBossName(map: MapDefinition): string {
  const tid = getBossTemplateId(map);
  if (!tid || !MONSTER_TEMPLATES[tid]) return '未知霸主';
  return MONSTER_TEMPLATES[tid].name;
}

function getBossStatus(map: MapDefinition): { text: string; colorClass: string } {
  const tid = getBossTemplateId(map);
  if (!tid) return { text: '无守关霸主', colorClass: 'text-zinc-500' };

  const isReady = props.world.mapManager.isBossReady(tid, props.currentTick);
  if (isReady) {
    return { text: '⚔️ 凶煞降临 (速来讨伐)', colorClass: 'text-emerald-400' };
  } else {
    const rem = props.world.mapManager.getBossRemainingTicks(tid, props.currentTick);
    const secs = Math.ceil(rem / 10);
    return { text: `⏳ 元神凝聚中 (${secs}s)`, colorClass: 'text-amber-400' };
  }
}

function getCardClass(mapId: string, _tier: number): string {
  if (isCurrent(mapId)) {
    return 'bg-amber-950/25 border-amber-600/60 shadow-lg shadow-amber-950/20';
  }
  return 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/80';
}

function getBadgeClass(tier: number): string {
  if (tier === 0) return 'bg-zinc-900 border-zinc-700 text-zinc-300';
  if (tier <= 2) return 'bg-sky-950/60 border-sky-600/60 text-sky-300';
  if (tier <= 5) return 'bg-purple-950/60 border-purple-600/60 text-purple-300';
  if (tier <= 8) return 'bg-amber-950/60 border-amber-600/60 text-amber-300';
  return 'bg-rose-950/60 border-rose-600/60 text-rose-300';
}
</script>

<style scoped>
.legend-box {
  background: radial-gradient(circle at 50% 0%, #1c1511 0%, #0d0b0a 100%);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #78350f;
  border-radius: 3px;
}
</style>
