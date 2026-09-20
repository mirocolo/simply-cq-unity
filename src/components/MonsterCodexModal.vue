<template>
  <div @click.self="$emit('close')" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
    <div class="relative w-full max-w-5xl max-h-[92vh] overflow-hidden legend-box p-5 rounded-xl flex flex-col gap-3.5 animate-fadeIn text-zinc-100 border-2 border-amber-700/70 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-gradient-to-b from-[#1c1815] via-[#141216] to-[#0f0e12]">
      
      <!-- 弹窗顶部栏 -->
      <div class="flex items-center justify-between border-b-2 border-amber-900/60 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-4xl filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">📖</span>
          <div>
            <div class="flex items-center gap-3">
              <span class="text-xl font-black text-amber-300 tracking-wide">百妖封魔录 · 万象悬赏令</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-700 to-amber-900 border border-amber-500 text-amber-200 font-extrabold shadow-sm">
                永久属性飞跃
              </span>
            </div>
            <p class="text-xs text-amber-100/70 mt-1">
              斩妖除魔录真名，参悟魔物神髓得永久全属性加成，揭榜悬赏赢取海量玄金与天工神石！
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- 一键全部领取总览 -->
          <button
            v-if="totalClaimableCount > 0"
            @click="handleClaimAll"
            class="px-4 py-2 rounded-lg text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center gap-2 animate-pulse transition-all cursor-pointer border border-yellow-200"
            title="一键参悟所有已达成的魔物里程碑并交令所有悬赏"
          >
            <span class="text-base">⚡</span>
            <span>一键全部领取</span>
            <span class="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-black shadow">
              {{ totalClaimableCount }}
            </span>
          </button>

          <!-- Tab 切换按钮 -->
          <div class="flex bg-black/70 p-1 rounded-lg border border-amber-900/50">
            <button
              @click="activeTab = 'codex'"
              class="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all relative cursor-pointer"
              :class="activeTab === 'codex' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-[0_0_8px_rgba(217,119,6,0.5)]' : 'text-zinc-400 hover:text-zinc-200'"
            >
              📖 百妖封魔录
              <span 
                v-if="claimableCodexCount > 0" 
                class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"
              />
            </button>
            <button
              @click="activeTab = 'bounty'"
              class="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all relative cursor-pointer"
              :class="activeTab === 'bounty' ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-[0_0_8px_rgba(217,119,6,0.5)]' : 'text-zinc-400 hover:text-zinc-200'"
            >
              📜 万象悬赏令
              <span 
                v-if="claimableBountyCount > 0" 
                class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"
              />
            </button>
          </div>

          <button 
            @click="$emit('close')"
            class="text-zinc-400 hover:text-white px-3 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-base font-black transition-all cursor-pointer shadow"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 全局封魔录永久累积属性栏 (明亮醒目) -->
      <div class="bg-gradient-to-r from-[#2a1e15] via-[#201812] to-[#1a1410] border border-amber-600/50 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        <div class="flex items-center gap-1.5 text-amber-300 font-black text-sm">
          <span class="text-base">✨</span>
          <span>全图鉴永久领悟加成：</span>
        </div>
        <div class="flex flex-wrap items-center gap-3 font-mono text-sm">
          <span v-if="totalBonus.maxHp > 0" class="text-emerald-300 font-bold bg-black/40 px-2.5 py-1 rounded border border-emerald-800/60 shadow-sm">
            生命上限 +{{ totalBonus.maxHp }}
          </span>
          <span v-if="totalBonus.maxDC > 0" class="text-amber-300 font-bold bg-black/40 px-2.5 py-1 rounded border border-amber-800/60 shadow-sm">
            攻击力 +{{ totalBonus.minDC }}-{{ totalBonus.maxDC }}
          </span>
          <span v-if="totalBonus.maxAC > 0" class="text-sky-300 font-bold bg-black/40 px-2.5 py-1 rounded border border-sky-800/60 shadow-sm">
            防御力 +{{ totalBonus.minAC }}-{{ totalBonus.maxAC }}
          </span>
          <span v-if="totalBonus.critRate > 0" class="text-rose-300 font-bold bg-black/40 px-2.5 py-1 rounded border border-rose-800/60 shadow-sm">
            暴击率 +{{ (totalBonus.critRate * 100).toFixed(1) }}%
          </span>
          <span v-if="totalBonus.maxHp === 0 && totalBonus.maxDC === 0" class="text-amber-200/60 italic text-xs">
            暂未领悟魔物里程碑，快去击杀魔物参悟神髓！
          </span>
        </div>
        <div class="text-xs text-amber-200/90 font-medium bg-black/50 px-3 py-1 rounded border border-amber-800/40">
          已参悟阶位: <span class="font-bold text-amber-300 font-mono text-sm">{{ totalClaimedCount }}</span> / {{ totalMilestoneCount }} 阶
        </div>
      </div>

      <!-- Tab 1: 百妖封魔录 -->
      <div v-if="activeTab === 'codex'" class="flex flex-col gap-2.5 overflow-hidden">
        <!-- 妖魔位面梯队分类标签栏 (分类筛选) -->
        <div class="flex items-center justify-between bg-black/50 p-1.5 rounded-lg border border-[#3e3226]">
          <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
            <button
              v-for="filter in tierFilters"
              :key="filter.id"
              @click="handleSelectTierFilter(filter.id)"
              class="px-2.5 py-1 rounded-md text-xs font-bold transition-all relative shrink-0 cursor-pointer"
              :class="selectedTierFilter === filter.id 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700/60'"
            >
              {{ filter.label }}
              <span 
                v-if="hasClaimableInFilter(filter.id)" 
                class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"
              />
            </button>
          </div>

          <button
            v-if="claimableCodexCount > 0"
            @click="handleClaimAllCodex"
            class="text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold transition-all shadow-md shadow-amber-950/60 animate-pulse flex items-center gap-1.5 shrink-0 cursor-pointer border border-amber-400/50"
            title="一键参悟所有已达标的魔物里程碑神髓"
          >
            <span>✨</span>
            <span>一键领悟全部 ({{ claimableCodexCount }})</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5 overflow-hidden max-h-[60vh]">
          <!-- 左侧魔物列表 (5列) -->
          <div class="md:col-span-5 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 max-h-[58vh]">
            <div
              v-for="item in filteredCodexList"
              :key="item.templateId"
              @click="selectedId = item.templateId"
              class="p-2.5 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all relative overflow-hidden"
              :class="selectedId === item.templateId 
                ? 'bg-gradient-to-r from-[#2c2014] to-[#201812] border-amber-400 ring-2 ring-amber-500/50 shadow-md shadow-amber-950/50' 
                : 'bg-[#151318] border-zinc-700/70 hover:border-amber-600/60 hover:bg-[#1a1720]'"
            >
              <div class="flex items-center gap-3">
                <span class="text-3xl filter drop-shadow">{{ item.avatarIcon }}</span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-amber-100">{{ item.name }}</span>
                    <span 
                      v-if="item.isBoss"
                      class="text-[11px] px-1.5 py-0.2 bg-red-950 border border-red-600 text-red-300 font-black rounded shadow"
                    >
                      首领
                    </span>
                  </div>
                  <span class="text-xs text-amber-400/90 font-medium">{{ item.title }}</span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span class="text-xs font-mono text-zinc-300">
                  斩杀: <strong class="text-amber-300 text-sm font-bold">{{ getKills(item.templateId) }}</strong>
                </span>
                <span 
                  class="text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm"
                  :class="getUnlockedCount(item.templateId) === item.milestones.length 
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600' 
                    : (hasClaimableMilestone(item.templateId) ? 'bg-amber-950/90 text-yellow-300 border-yellow-500 animate-pulse' : 'bg-zinc-900 text-zinc-400 border-zinc-700')"
                >
                  {{ getUnlockedCount(item.templateId) }}/{{ item.milestones.length }} 达成
                </span>
              </div>
            </div>
          </div>

          <!-- 右侧当前魔物神髓与里程碑突破 (7列) -->
          <div class="md:col-span-7 flex flex-col gap-3 bg-gradient-to-b from-[#18151c] to-[#121015] border-2 border-[#3e3226] rounded-xl p-4 overflow-y-auto custom-scrollbar max-h-[58vh] shadow-inner">
            <div v-if="currentCodex" class="flex flex-col gap-3">
              <!-- 头部魔物身份卡 -->
              <div class="flex items-center justify-between border-b border-amber-900/40 pb-3">
                <div class="flex items-center gap-3.5">
                  <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2a2219] to-[#181412] border-2 border-amber-600/70 flex items-center justify-center text-4xl shadow-inner">
                    {{ currentCodex.avatarIcon }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-xl font-black text-amber-300">{{ currentCodex.name }}</h3>
                      <span class="text-sm text-amber-400 font-bold">{{ currentCodex.title }}</span>
                      <span 
                        v-if="currentCodex.isBoss"
                        class="text-xs px-2 py-0.5 bg-red-900/90 border border-red-500 text-red-200 font-black rounded-md shadow"
                      >
                        位面霸主
                      </span>
                    </div>
                    <p class="text-xs text-zinc-200 mt-1 leading-relaxed max-w-md">
                      {{ currentCodex.desc }}
                    </p>
                  </div>
                </div>

                <div class="text-right flex flex-col items-end bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span class="text-xs text-zinc-300">累计斩杀</span>
                  <span class="font-mono text-2xl font-black text-amber-300">{{ getKills(currentCodex.templateId) }}</span>
                </div>
              </div>

              <!-- 参悟里程碑阶梯 (3 阶) -->
              <div class="flex flex-col gap-2.5">
                <div class="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <span>⚡</span>
                  <span>【神髓参悟阶梯】</span>
                </div>

                <div 
                  v-for="(ms, idx) in currentCodex.milestones" 
                  :key="idx"
                  class="p-3.5 rounded-xl border-2 flex flex-col gap-2 transition-all shadow-md"
                  :class="isClaimed(currentCodex.templateId, idx) 
                    ? 'bg-emerald-950/20 border-emerald-700/60' 
                    : (canClaim(currentCodex.templateId, idx) ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/40' : 'bg-black/40 border-zinc-800')"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <span class="font-mono text-xs font-black px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-amber-700/50">
                        阶位 {{ idx + 1 }}
                      </span>
                      <span class="text-sm font-black text-white">{{ ms.label }}</span>
                    </div>

                    <!-- 进度指示 -->
                    <span class="font-mono text-xs font-bold text-amber-200">
                      {{ Math.min(getKills(currentCodex.templateId), ms.kills) }} / {{ ms.kills }}
                    </span>
                  </div>

                  <!-- 进度条 (加粗为 h-2.5，渐变高亮) -->
                  <div class="w-full h-2.5 rounded-full bg-black/80 overflow-hidden border border-zinc-800">
                    <div 
                      class="h-full transition-all duration-300"
                      :class="isClaimed(currentCodex.templateId, idx) ? 'bg-gradient-to-r from-emerald-600 to-teal-400' : 'bg-gradient-to-r from-amber-600 to-yellow-400'"
                      :style="{ width: `${Math.min(100, (getKills(currentCodex.templateId) / ms.kills) * 100)}%` }"
                    />
                  </div>

                  <!-- 属性加成与领悟按钮 -->
                  <div class="flex items-center justify-between pt-1">
                    <div class="flex flex-wrap items-center gap-2 font-mono text-xs font-bold">
                      <span v-if="ms.maxHp" class="text-emerald-300 bg-black/50 px-2 py-0.5 rounded border border-emerald-900/60 shadow-sm">
                        +{{ ms.maxHp }}生命
                      </span>
                      <span v-if="ms.maxDC" class="text-amber-300 bg-black/50 px-2 py-0.5 rounded border border-amber-900/60 shadow-sm">
                        +{{ ms.minDC }}-{{ ms.maxDC }}攻击
                      </span>
                      <span v-if="ms.maxAC" class="text-sky-300 bg-black/50 px-2 py-0.5 rounded border border-sky-900/60 shadow-sm">
                        +{{ ms.minAC }}-{{ ms.maxAC }}防御
                      </span>
                      <span v-if="ms.critRate" class="text-rose-300 bg-black/50 px-2 py-0.5 rounded border border-rose-900/60 shadow-sm">
                        +{{ (ms.critRate * 100).toFixed(1) }}%暴击
                      </span>
                    </div>

                    <div>
                      <span 
                        v-if="isClaimed(currentCodex.templateId, idx)"
                        class="text-xs px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-black flex items-center gap-1 shadow"
                      >
                        ✓ 已参悟
                      </span>
                      <button
                        v-else-if="canClaim(currentCodex.templateId, idx)"
                        @click="claimMilestone(currentCodex.templateId, idx)"
                        class="text-xs px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black transition-all shadow-lg shadow-amber-950/80 animate-pulse border border-yellow-200 cursor-pointer active:scale-95"
                      >
                        领悟真解
                      </button>
                      <span 
                        v-else
                        class="text-xs text-amber-300/80 font-mono font-medium bg-zinc-900/90 px-2.5 py-1 rounded border border-zinc-700"
                      >
                        还需讨伐 {{ ms.kills - getKills(currentCodex.templateId) }} 只
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: 万象悬赏令 -->
      <div v-else class="flex flex-col gap-3.5 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
        <div class="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-amber-900/40">
          <div class="text-xs text-amber-100/90 leading-relaxed font-medium">
            每日完成除魔悬赏，可源源不断获得海量金币与强化所急需的【黑铁矿石】、【纯黑玄铁】与【天工神石】！
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="claimableBountyCount > 0"
              @click="handleClaimAllBounties"
              class="px-4 py-1.5 rounded-lg text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black transition-all shadow-md shadow-amber-950/60 animate-pulse flex items-center gap-1.5 cursor-pointer border border-yellow-200"
              title="一键交令并领取所有已完成的悬赏奖励"
            >
              <span>📜</span>
              <span>一键交令领赏 ({{ claimableBountyCount }})</span>
            </button>
            <button
              @click="refreshBounties"
              class="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 hover:text-white font-bold transition-all cursor-pointer shadow"
            >
              🔄 换一批悬赏
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div
            v-for="bounty in world.activeBounties"
            :key="bounty.id"
            class="p-4 rounded-xl border-2 flex flex-col justify-between gap-3 relative overflow-hidden transition-all shadow-md"
            :class="bounty.claimed 
              ? 'bg-[#151318]/70 border-zinc-800 opacity-75' 
              : (bounty.completed ? 'bg-gradient-to-b from-[#2a1e15] to-[#1c1410] border-amber-400 shadow-lg shadow-amber-950/50 ring-2 ring-amber-500/40' : 'bg-[#16141a] border-zinc-700/80')"
          >
            <div>
              <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-3">
                  <span class="text-4xl filter drop-shadow">{{ bounty.targetIcon }}</span>
                  <div>
                    <h4 class="text-base font-black text-white">{{ bounty.targetName }}</h4>
                    <span class="text-xs text-amber-400 font-medium">讨伐除妖委派</span>
                  </div>
                </div>
              </div>

              <!-- 进度条 -->
              <div class="flex items-center justify-between text-xs mb-1.5 font-mono">
                <span class="text-zinc-300">任务进度</span>
                <span :class="bounty.completed ? 'text-emerald-300 font-black' : 'text-amber-300 font-bold'">
                  {{ Math.min(bounty.currentKills, bounty.requiredKills) }} / {{ bounty.requiredKills }}
                </span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-black/80 overflow-hidden mb-3 border border-zinc-800">
                <div 
                  class="h-full transition-all duration-300"
                  :class="bounty.completed ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-600 to-yellow-400'"
                  :style="{ width: `${Math.min(100, (bounty.currentKills / bounty.requiredKills) * 100)}%` }"
                />
              </div>

              <!-- 悬赏奖赏 -->
              <div class="bg-black/50 border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-1 text-xs font-mono">
                <div class="text-xs font-black text-amber-300 mb-0.5">【完成赏赐】</div>
                <div class="flex items-center justify-between text-yellow-300 font-bold">
                  <span>💰 赏赐金币:</span>
                  <span>+{{ bounty.rewardGold.toLocaleString() }}</span>
                </div>
                <div v-if="bounty.rewardIronOre > 0" class="flex items-center justify-between text-zinc-200">
                  <span>⛏️ 黑铁矿石:</span>
                  <span>+{{ bounty.rewardIronOre }} 个</span>
                </div>
                <div v-if="bounty.rewardPureIron > 0" class="flex items-center justify-between text-sky-300 font-bold">
                  <span>💎 纯黑玄铁:</span>
                  <span>+{{ bounty.rewardPureIron }} 个</span>
                </div>
                <div v-if="bounty.rewardGodStone > 0" class="flex items-center justify-between text-purple-300 font-black">
                  <span>🌌 天工神石:</span>
                  <span>+{{ bounty.rewardGodStone }} 个</span>
                </div>
              </div>
            </div>

            <!-- 按钮操作 -->
            <div>
              <button
                v-if="bounty.claimed"
                disabled
                class="w-full py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-black cursor-not-allowed"
              >
                ✓ 悬赏已领取
              </button>
              <button
                v-else-if="bounty.completed"
                @click="claimBounty(bounty.id)"
                class="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-950/80 animate-bounce border border-yellow-200 cursor-pointer"
              >
                交令领取丰厚赏赐！
              </button>
              <div 
                v-else
                class="text-center py-2 text-xs text-amber-300/80 bg-black/40 rounded-lg border border-zinc-800 font-mono"
              >
                除妖进行中 (还需 {{ bounty.requiredKills - bounty.currentKills }} 只)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { GameWorld } from '../domain/GameWorld';
import { MONSTER_CODEX_DEFINITIONS } from '../domain/definitions/codex';
import { MonsterCodexDef } from '../types/codex';

const props = defineProps<{
  world: GameWorld;
  uiTick?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'claim'): void;
}>();

const refreshKey = ref(0);
const activeTab = ref<'codex' | 'bounty'>('codex');
const codexList = Object.values(MONSTER_CODEX_DEFINITIONS);
const selectedId = ref<string>(codexList[0]?.templateId || 'm_scarecrow');

const selectedTierFilter = ref<string>('all');
const tierFilters = [
  { id: 'all', label: '全部 (23)' },
  { id: '0', label: '0阶·比奇' },
  { id: '1', label: '1阶·沃玛' },
  { id: '2', label: '2阶·祖玛' },
  { id: '3', label: '3阶·赤月' },
  { id: '4_6', label: '4~6阶·雷霆' },
  { id: '7_9', label: '7~9阶·鸿蒙' },
];

const filteredCodexList = computed(() => {
  const _ = refreshKey.value + (props.uiTick || 0);
  const list = Object.values(MONSTER_CODEX_DEFINITIONS);
  if (selectedTierFilter.value === 'all') return list;
  if (selectedTierFilter.value === '4_6') {
    return list.filter(m => m.tier >= 4 && m.tier <= 6);
  }
  if (selectedTierFilter.value === '7_9') {
    return list.filter(m => m.tier >= 7 && m.tier <= 9);
  }
  const tierNum = parseInt(selectedTierFilter.value);
  return list.filter(m => m.tier === tierNum);
});

function handleSelectTierFilter(filterId: string) {
  selectedTierFilter.value = filterId;
  const list = filteredCodexList.value;
  if (list.length > 0 && !list.some(m => m.templateId === selectedId.value)) {
    selectedId.value = list[0].templateId;
  }
}

function hasClaimableInFilter(filterId: string): boolean {
  const _ = refreshKey.value + (props.uiTick || 0);
  let items = codexList;
  if (filterId === '4_6') items = items.filter(m => m.tier >= 4 && m.tier <= 6);
  else if (filterId === '7_9') items = items.filter(m => m.tier >= 7 && m.tier <= 9);
  else if (filterId !== 'all') {
    const t = parseInt(filterId);
    items = items.filter(m => m.tier === t);
  }
  return items.some(item => {
    for (let i = 0; i < item.milestones.length; i++) {
      if (canClaim(item.templateId, i)) return true;
    }
    return false;
  });
}

const currentCodex = computed<MonsterCodexDef | undefined>(() => {
  return MONSTER_CODEX_DEFINITIONS[selectedId.value];
});

function getKills(templateId: string): number {
  const _ = refreshKey.value + (props.uiTick || 0);
  return props.world.monsterKills[templateId] || 0;
}

function isClaimed(templateId: string, milestoneIdx: number): boolean {
  const _ = refreshKey.value + (props.uiTick || 0);
  const claimedList = props.world.codexClaimedTiers[templateId];
  return claimedList ? claimedList.includes(milestoneIdx) : false;
}

function canClaim(templateId: string, milestoneIdx: number): boolean {
  const _ = refreshKey.value + (props.uiTick || 0);
  if (isClaimed(templateId, milestoneIdx)) return false;
  const kills = getKills(templateId);
  const def = MONSTER_CODEX_DEFINITIONS[templateId];
  if (!def) return false;
  const ms = def.milestones[milestoneIdx];
  return ms ? kills >= ms.kills : false;
}

function hasClaimableMilestone(templateId: string): boolean {
  const def = MONSTER_CODEX_DEFINITIONS[templateId];
  if (!def) return false;
  for (let i = 0; i < def.milestones.length; i++) {
    if (canClaim(templateId, i)) return true;
  }
  return false;
}

function getUnlockedCount(templateId: string): number {
  const _ = refreshKey.value + (props.uiTick || 0);
  const list = props.world.codexClaimedTiers[templateId];
  return list ? list.length : 0;
}

const totalMilestoneCount = computed(() => {
  return codexList.reduce((acc, cur) => acc + cur.milestones.length, 0);
});

const totalClaimedCount = computed(() => {
  const _ = refreshKey.value + (props.uiTick || 0);
  let count = 0;
  for (const tiers of Object.values(props.world.codexClaimedTiers)) {
    count += tiers.length;
  }
  return count;
});

const totalBonus = computed(() => {
  const _ = refreshKey.value + (props.uiTick || 0);
  return props.world.getCodexStatsBonus();
});

const hasClaimableBounty = computed(() => {
  const _ = refreshKey.value + (props.uiTick || 0);
  return props.world.activeBounties.some(b => b.completed && !b.claimed);
});

const claimableCodexCount = computed(() => {
  const _ = refreshKey.value + (props.uiTick || 0);
  let count = 0;
  for (const def of codexList) {
    const kills = getKills(def.templateId);
    const claimed = props.world.codexClaimedTiers[def.templateId] || [];
    for (let i = 0; i < def.milestones.length; i++) {
      if (!claimed.includes(i) && kills >= def.milestones[i].kills) {
        count++;
      }
    }
  }
  return count;
});

const claimableBountyCount = computed(() => {
  const _ = refreshKey.value + (props.uiTick || 0);
  return props.world.activeBounties.filter(b => b.completed && !b.claimed).length;
});

const totalClaimableCount = computed(() => claimableCodexCount.value + claimableBountyCount.value);

function handleClaimAll() {
  props.world.claimAllCodexAndBounties();
  refreshKey.value++;
  emit('claim');
}

function handleClaimAllCodex() {
  props.world.claimAllCodexRewards();
  refreshKey.value++;
  emit('claim');
}

function handleClaimAllBounties() {
  props.world.claimAllBounties();
  refreshKey.value++;
  emit('claim');
}

function claimMilestone(templateId: string, milestoneIdx: number) {
  props.world.claimCodexReward(templateId, milestoneIdx);
  refreshKey.value++;
  emit('claim');
}

function claimBounty(bountyId: string) {
  props.world.claimBounty(bountyId);
  refreshKey.value++;
  emit('claim');
}

function refreshBounties() {
  props.world.refreshBounties();
  refreshKey.value++;
  emit('claim');
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key.toLowerCase() === 'k') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(217, 119, 6, 0.9);
}
</style>
