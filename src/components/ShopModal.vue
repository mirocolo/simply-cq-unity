<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none font-serif">
    <div class="relative w-full max-w-2xl bg-gradient-to-b from-[#1c1813] via-[#14120e] to-[#0a0907] border-2 border-[#8c6d3b] rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[85vh]">
      
      <!-- 弹窗标题栏 -->
      <div class="px-5 py-3.5 bg-gradient-to-r from-[#2c2419] via-[#3a2f20] to-[#2c2419] border-b-2 border-[#5c4a34] flex items-center justify-between shadow-md">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl animate-pulse">🏮</span>
          <div>
            <h2 class="text-base font-black tracking-wider text-amber-300 drop-shadow flex items-center gap-2">
              <span>神秘黑市行商</span>
              <span class="text-[10px] font-normal px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-600/40">万界游商</span>
            </h2>
            <p class="text-[10px] text-zinc-400">汇聚九霄奇珍，万物皆可互市，助力勇士登临绝巅</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- 玩家金币展示 -->
          <div class="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded border border-amber-600/30 text-xs font-mono font-bold text-amber-300 shadow-inner">
            <span>💰</span>
            <span>{{ playerGold.toLocaleString() }}</span>
          </div>

          <button 
            @click="$emit('close')"
            class="text-zinc-400 hover:text-white text-lg font-mono px-2 py-0.5 rounded hover:bg-zinc-800/60 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 货架列表 -->
      <div class="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
        <div 
          v-for="item in merchandise" 
          :key="item.defId"
          class="bg-gradient-to-b from-[#211b14] to-[#14110d] border border-[#4a3b2b] hover:border-amber-500/60 rounded p-3 flex flex-col justify-between transition-all duration-200 shadow-md group relative overflow-hidden"
        >
          <!-- 装饰发光底纹 -->
          <div class="absolute -right-6 -bottom-6 text-6xl opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            {{ item.icon }}
          </div>

          <div>
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-2">
                <div 
                  class="w-10 h-10 rounded border flex items-center justify-center text-xl shadow-inner shrink-0"
                  :style="{ borderColor: getQualityBorder(item.quality), backgroundColor: getQualityBg(item.quality) }"
                >
                  {{ item.icon }}
                </div>
                <div>
                  <div class="text-xs font-black" :style="{ color: getQualityColor(item.quality) }">
                    {{ item.name }}
                  </div>
                  <div class="text-[10px] text-zinc-400 font-mono">
                    单价: <span class="text-amber-300 font-bold">{{ item.price.toLocaleString() }}</span> 金币
                  </div>
                </div>
              </div>

              <!-- 类别徽标 -->
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-700/50">
                {{ item.category }}
              </span>
            </div>

            <!-- 物品效用描述 -->
            <p class="text-[11px] text-zinc-300 leading-snug mb-2.5 font-sans min-h-[32px]">
              {{ item.desc }}
            </p>
          </div>

          <!-- 购买操作区 -->
          <div class="pt-2 border-t border-[#3a2f23]/60 flex items-center justify-between gap-1.5">
            <span class="text-[10px] text-zinc-400">批量购买:</span>
            <div class="flex items-center gap-1.5">
              <button 
                @click="buy(item.defId, 1, item.price)"
                :disabled="playerGold < item.price"
                class="px-2.5 py-1 bg-gradient-to-b from-[#3a2f23] to-[#241a12] hover:from-[#524130] hover:to-[#36271c] disabled:opacity-40 disabled:pointer-events-none text-amber-200 border border-[#6d563a] rounded text-[11px] font-bold transition-all active:scale-95 shadow"
              >
                买 1
              </button>
              <button 
                @click="buy(item.defId, 5, item.price * 5)"
                :disabled="playerGold < item.price * 5"
                class="px-2.5 py-1 bg-gradient-to-b from-[#3a2f23] to-[#241a12] hover:from-[#524130] hover:to-[#36271c] disabled:opacity-40 disabled:pointer-events-none text-amber-300 border border-[#6d563a] rounded text-[11px] font-bold transition-all active:scale-95 shadow"
              >
                买 5
              </button>
              <button 
                @click="buy(item.defId, 10, item.price * 10)"
                :disabled="playerGold < item.price * 10"
                class="px-2.5 py-1 bg-gradient-to-b from-[#4a361e] to-[#2c1e0e] hover:from-[#664b28] hover:to-[#3d2913] disabled:opacity-40 disabled:pointer-events-none text-yellow-300 border border-amber-600/60 rounded text-[11px] font-black transition-all active:scale-95 shadow"
              >
                买 10
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部提示栏 -->
      <div class="px-5 py-2.5 bg-black/80 border-t border-[#3c2f21] flex items-center justify-between text-[11px] text-zinc-400">
        <div class="flex items-center gap-1.5">
          <span class="text-amber-400">💡 提示：</span>
          <span>洗炼石可为武器/防具重铸彩色极品词缀；超级祝福油 100% 成功且洗清诅咒。</span>
        </div>
        <button 
          @click="$emit('close')"
          class="px-4 py-1 bg-[#2c2419] hover:bg-[#3c3121] text-amber-300 border border-[#5c4a34] rounded font-bold transition-colors"
        >
          离开黑市
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  playerGold: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'buy', defId: string, count: number): void;
}>();

interface MerchandiseDef {
  defId: string;
  name: string;
  icon: string;
  category: string;
  price: number;
  quality: number;
  desc: string;
}

const merchandise: MerchandiseDef[] = [
  {
    defId: 'mat_reforge_stone',
    name: '乾坤洗炼石',
    icon: '🔮',
    category: '重铸神石',
    price: 100000,
    quality: 3,
    desc: '洗涤装备造化，为任意装备重新随机赋予 1~3 条稀有彩色神级词缀！'
  },
  {
    defId: 'pot_blessing_oil',
    name: '祝福油',
    icon: '🏺',
    category: '幸运神油',
    price: 150000,
    quality: 2,
    desc: '涂抹于武器，提升幸运(最高+7)；武器遭诅咒时有概率涤除诅咒。'
  },
  {
    defId: 'pot_luosha_water',
    name: '罗刹神水',
    icon: '🧪',
    category: '解煞圣水',
    price: 500000,
    quality: 3,
    desc: '九幽神泉凝练的圣水，100% 彻底涤除武器所遭到的所有血煞诅咒！'
  },
  {
    defId: 'pot_super_blessing_oil',
    name: '超级祝福油',
    icon: '🌟',
    category: '天地奇珍',
    price: 10000000,
    quality: 4,
    desc: '天道至尊神露，100% 必定提升武器幸运+1，并直接驱散所有诅咒！'
  },
  {
    defId: 'pot_liaoshang',
    name: '强效疗伤药',
    icon: '🍯',
    category: '救命圣药',
    price: 25000,
    quality: 3,
    desc: '玛法秘传急救膏，瞬间回复 2000 HP 与 1000 MP，大战 Boss 保命利器！'
  },
  {
    defId: 'pot_sun',
    name: '万年雪霜',
    icon: '❄️',
    category: '双料回春',
    price: 5000,
    quality: 2,
    desc: '昆仑万年寒霜凝练，瞬间回复 800 HP 与 400 MP，强劲持久续航。'
  },
  {
    defId: 'mat_iron_ore',
    name: '纯度20黑铁矿石',
    icon: '⛏️',
    category: '强化石料',
    price: 50000,
    quality: 2,
    desc: '用于装备部位 +1 ~ +5 基础强化锻造，提升攻防血量。'
  },
  {
    defId: 'mat_pure_iron',
    name: '纯阳真铁',
    icon: '🧱',
    category: '强化高阶',
    price: 200000,
    quality: 3,
    desc: '用于装备部位 +6 ~ +10 高阶强化淬火，觉醒套装共鸣。'
  },
  {
    defId: 'mat_god_stone',
    name: '太虚神石',
    icon: '💎',
    category: '绝世仙石',
    price: 1000000,
    quality: 4,
    desc: '用于装备部位 +11 ~ +15 终极入道强化，激发神圣破甲与独立倍攻！'
  }
];

function buy(defId: string, count: number, _cost: number) {
  emit('buy', defId, count);
}

function getQualityColor(q: number): string {
  switch (q) {
    case 1: return '#22c55e';
    case 2: return '#3b82f6';
    case 3: return '#a855f7';
    case 4: return '#f97316';
    default: return '#e4e4e7';
  }
}

function getQualityBorder(q: number): string {
  switch (q) {
    case 1: return 'rgba(34, 197, 94, 0.4)';
    case 2: return 'rgba(59, 130, 246, 0.4)';
    case 3: return 'rgba(168, 85, 247, 0.5)';
    case 4: return 'rgba(249, 115, 22, 0.6)';
    default: return 'rgba(113, 113, 122, 0.3)';
  }
}

function getQualityBg(q: number): string {
  switch (q) {
    case 1: return 'rgba(34, 197, 94, 0.1)';
    case 2: return 'rgba(59, 130, 246, 0.1)';
    case 3: return 'rgba(168, 85, 247, 0.12)';
    case 4: return 'rgba(249, 115, 22, 0.15)';
    default: return 'rgba(0, 0, 0, 0.4)';
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #5c4a34;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #8c6d3b;
}
</style>
