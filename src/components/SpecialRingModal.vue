<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
    <!-- 特戒神殿主面板 -->
    <div class="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto legend-box p-5 rounded-lg flex flex-col gap-4 animate-fadeIn text-zinc-200 custom-scrollbar border-2 border-[#8c6d3b] bg-gradient-to-b from-[#181410] to-[#0d0a08] shadow-[0_0_35px_rgba(0,0,0,0.9)]">
      
      <!-- 顶部标题栏 -->
      <div class="flex items-center justify-between border-b border-[#5c4a34] pb-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl animate-pulse">💍</span>
          <div class="flex flex-col">
            <span class="text-lg font-black text-gold-gradient tracking-wide">至尊六大特戒神殿</span>
            <span class="text-[11px] text-amber-400/80">传世神戒独立法阵 · 不占基础双戒位 · 刀刀神技觉醒</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="oneKeyEquipSpecialRings"
            class="px-3 py-1 bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-black text-xs font-black rounded border border-yellow-300 shadow active:scale-95 transition-all"
          >
            ⚡ 一键激活全部
          </button>
          <button 
            @click="$emit('close')"
            class="text-zinc-400 hover:text-white px-2.5 py-1 rounded hover:bg-zinc-800 text-lg font-bold transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 当前特戒神力总览光环条 -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-black/60 p-2.5 rounded border border-[#4a3a28]">
        <div 
          v-for="info in ringInfos" 
          :key="info.slot"
          class="flex flex-col items-center p-1.5 rounded transition-all"
          :class="equipped[info.slot] ? 'bg-amber-950/40 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'opacity-40 border border-zinc-800'"
        >
          <span class="text-xl">{{ info.icon }}</span>
          <span class="text-[10px] font-bold mt-0.5" :class="equipped[info.slot] ? 'text-amber-300' : 'text-zinc-500'">
            {{ info.title }}
          </span>
          <span class="text-[9px] font-mono mt-0.5" :class="equipped[info.slot] ? 'text-emerald-400' : 'text-zinc-600'">
            {{ equipped[info.slot] ? '已激活' : '未激活' }}
          </span>
        </div>
      </div>

      <!-- 六大特戒神座卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div 
          v-for="info in ringInfos" 
          :key="info.slot"
          class="relative p-3 rounded-lg border-2 flex flex-col justify-between transition-all"
          :class="getRingCardClass(info.slot)"
        >
          <!-- 顶部：特戒基础与状态 -->
          <div>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2.5">
                <!-- 特戒徽标插座 -->
                <div 
                  class="relative w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl shadow-inner transition-all"
                  :class="equipped[info.slot] ? 'border-amber-400 bg-amber-950/60 shadow-[0_0_12px_rgba(251,191,36,0.5)]' : (getInventoryRing(info.slot) ? 'border-amber-600 bg-black/80 animate-bounce' : 'border-zinc-700 bg-zinc-900')"
                >
                  <span>{{ info.icon }}</span>
                  <span 
                    v-if="equipped[info.slot]" 
                    class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-black animate-ping"
                  ></span>
                </div>

                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-black" :class="equipped[info.slot] ? 'text-amber-300' : (getInventoryRing(info.slot) ? 'text-zinc-200' : 'text-zinc-400')">
                      {{ info.title }}
                    </span>
                    <span class="text-[9px] px-1 py-0.2 rounded bg-black/80 border border-amber-600/40 text-amber-300 font-bold font-mono">
                      {{ info.tierName }}
                    </span>
                  </div>
                  <span class="text-[10px] text-amber-400/90 font-bold font-sans">
                    {{ info.skillName }}
                  </span>
                </div>
              </div>

              <!-- 状态标牌 -->
              <div>
                <span 
                  v-if="equipped[info.slot]"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600 shadow"
                >
                  ⚡ 神力生效中
                </span>
                <span 
                  v-else-if="getInventoryRing(info.slot)"
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600 animate-pulse shadow"
                >
                  📦 包裹待激活
                </span>
                <span 
                  v-else
                  class="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 text-zinc-500 border border-zinc-700"
                >
                  🔒 尚未获得
                </span>
              </div>
            </div>

            <!-- 神技专属描述 -->
            <div class="mt-2 text-[11px] leading-relaxed p-2 rounded bg-black/50 border border-zinc-800 text-zinc-300">
              <p class="text-amber-200/90 font-medium">{{ info.effectDesc }}</p>
              <!-- 复活戒指专属冷却显示 -->
              <div v-if="info.slot === 'special_revive' && equipped['special_revive']" class="mt-1 flex items-center justify-between border-t border-zinc-800 pt-1 text-[10px] font-mono">
                <span class="text-zinc-400">涅槃冷却状态:</span>
                <span v-if="(player.reviveCooldownTicks || 0) > 0" class="text-red-400 font-bold">
                  ⏳ 冷却中: {{ Math.ceil((player.reviveCooldownTicks || 0) / 10) }}秒
                </span>
                <span v-else class="text-emerald-400 font-bold">
                  💖 涅槃就绪 (随时触发金身回满)
                </span>
              </div>
            </div>

            <!-- 佩戴后四维属性一览 -->
            <div v-if="equipped[info.slot] || getInventoryRing(info.slot)" class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-zinc-400">
              <span class="text-orange-400 font-bold">攻击: {{ (equipped[info.slot] || getInventoryRing(info.slot))?.minDC }}-{{ (equipped[info.slot] || getInventoryRing(info.slot))?.maxDC }}</span>
              <span class="text-blue-400">防御: {{ (equipped[info.slot] || getInventoryRing(info.slot))?.minAC }}-{{ (equipped[info.slot] || getInventoryRing(info.slot))?.maxAC }}</span>
              <span class="text-rose-400">生命: +{{ (equipped[info.slot] || getInventoryRing(info.slot))?.maxHp }}</span>
              <span class="text-cyan-400">魔法: +{{ (equipped[info.slot] || getInventoryRing(info.slot))?.maxMp }}</span>
              <span v-if="(equipped[info.slot] || getInventoryRing(info.slot))?.hasteBonus" class="text-teal-300">急速: +{{ (equipped[info.slot] || getInventoryRing(info.slot))?.hasteBonus }}</span>
              <span v-if="(equipped[info.slot] || getInventoryRing(info.slot))?.luck" class="text-yellow-300">幸运: +{{ (equipped[info.slot] || getInventoryRing(info.slot))?.luck }}</span>
            </div>

            <!-- 掉落出处提示 -->
            <div v-else class="mt-1.5 text-[10px] text-zinc-500 italic flex items-center gap-1">
              <span>📍 产出途径:</span>
              <span class="text-amber-500/80">{{ info.dropSource }}</span>
            </div>
          </div>

          <!-- 底部操作按钮 -->
          <div class="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
            <span class="text-[10px] font-mono text-zinc-500">
              佩戴要求: <b class="text-zinc-300">{{ info.levelReq }}级</b>
            </span>

            <!-- 动作按钮 -->
            <div class="flex gap-2">
              <button 
                v-if="equipped[info.slot]"
                @click="$emit('unequip', info.slot)"
                class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 rounded text-xs font-bold active:scale-95 transition-all"
              >
                卸下退回包裹
              </button>
              <button 
                v-else-if="getInventoryRing(info.slot)"
                @click="equipRing(getInventoryRing(info.slot)!)"
                class="px-3.5 py-1 bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-black border border-yellow-300 rounded text-xs font-black shadow-md active:scale-95 transition-all"
              >
                ⚡ 立即镶嵌激活
              </button>
              <span v-else class="text-[10px] text-zinc-600 py-1 font-mono">
                未获该戒
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Entity, EquipSlot, ItemInstance } from '../types/game';

const props = defineProps<{
  player: Entity;
  equipped: Partial<Record<EquipSlot, ItemInstance>>;
  inventory: ItemInstance[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'equip', item: ItemInstance): void;
  (e: 'unequip', slot: EquipSlot): void;
  (e: 'oneKeyEquip'): void;
}>();

interface RingMeta {
  slot: EquipSlot;
  defId: string;
  icon: string;
  title: string;
  tierName: string;
  skillName: string;
  effectDesc: string;
  levelReq: number;
  dropSource: string;
}

const ringInfos: RingMeta[] = [
  {
    slot: 'special_paralyze',
    defId: 'r_mabi',
    icon: '⚡',
    title: '麻痹戒指',
    tierName: '一阶特戒',
    skillName: '【特戒神技 · 石化禁锢】',
    effectDesc: '平砍与技能出刀有 25% 概率使怪物陷入石化麻痹 3 秒，怪物被锁链禁锢无法移动与反击！',
    levelReq: 25,
    dropSource: '击败白野猪、沃玛教主或高阶位面精英怪大爆产出'
  },
  {
    slot: 'special_revive',
    defId: 'r_fuhuo',
    icon: '💖',
    title: '复活戒指',
    tierName: '二阶特戒',
    skillName: '【特戒神技 · 涅槃真身】',
    effectDesc: '受到致命伤害时免疫阵亡，瞬间回满 100% 生命与法力，并赐予 3 秒无敌金身！(冷却90秒)',
    levelReq: 32,
    dropSource: '击败赤月恶魔、沃玛教主或高级飞升Boss绝世大爆'
  },
  {
    slot: 'special_protect',
    defId: 'r_hushen',
    icon: '🛡️',
    title: '护身戒指',
    tierName: '一阶特戒',
    skillName: '【特戒神技 · 魔道金刚】',
    effectDesc: '受到伤害的 80% 优先扣除法力值 (MP) 进行抵御，只要法力未空，肉身不死不灭！',
    levelReq: 25,
    dropSource: '击败沃玛教主、赤月恶魔或高转首领大爆'
  },
  {
    slot: 'special_wind',
    defId: 'r_kuangfeng_ring',
    icon: '🌪️',
    title: '狂风特戒',
    tierName: '初始特戒',
    skillName: '【特戒神技 · 极速狂风】',
    effectDesc: '极限攻速狂飙 +35 急速，大幅缩短出刀间隔，连击斩与风雷残影触发率翻倍！',
    levelReq: 20,
    dropSource: '击败骷髅王、僵尸王、白野猪均有概率大爆'
  },
  {
    slot: 'special_luck',
    defId: 'r_xingyun',
    icon: '🎲',
    title: '幸运特戒',
    tierName: '二阶特戒',
    skillName: '【特戒神技 · 天命眷顾】',
    effectDesc: '永久获得【幸运 Luck +3】，助力轻松达成运9极境，享受刀刀刀发挥最大攻击上限的无上快感！',
    levelReq: 32,
    dropSource: '击败赤月恶魔、白野猪等首领大爆'
  },
  {
    slot: 'special_greed',
    defId: 'r_tanlan',
    icon: '💰',
    title: '贪婪特戒',
    tierName: '初始特戒',
    skillName: '【特戒神技 · 聚宝天运】',
    effectDesc: '击杀怪物金币掉落 +150%，极品神装、冲天光柱大爆几率翻倍提升！打宝挂机必备！',
    levelReq: 20,
    dropSource: '击败钉耙猫王、骷髅精灵、白野猪均可爆出'
  }
];

const getInventoryRing = (slot: EquipSlot): ItemInstance | null => {
  return props.inventory.find(it => it.type === 'equipment' && it.slot === slot) || null;
};

const getRingCardClass = (slot: EquipSlot) => {
  if (props.equipped[slot]) {
    return 'border-amber-500/70 bg-gradient-to-br from-[#2a1d0f] to-[#140e08] shadow-[0_0_15px_rgba(245,158,11,0.25)]';
  }
  if (getInventoryRing(slot)) {
    return 'border-amber-700/60 bg-[#1e1712] shadow-inner';
  }
  return 'border-zinc-800 bg-zinc-950/60 opacity-60';
};

const equipRing = (item: ItemInstance) => {
  emit('equip', item);
};

const oneKeyEquipSpecialRings = () => {
  for (const info of ringInfos) {
    if (!props.equipped[info.slot]) {
      const invRing = getInventoryRing(info.slot);
      if (invRing && invRing.levelReq <= props.player.stats.level) {
        emit('equip', invRing);
      }
    }
  }
};
</script>
