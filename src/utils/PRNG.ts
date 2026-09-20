/**
 * 可种子化的高性能确定性伪随机数生成器 (Mulberry32 算法)
 * 用于单元测试、确定性数值回放与无头战斗仿真
 */
export class PRNG {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
  }

  /**
   * 重置或更新种子
   */
  seed(newSeed: number): void {
    this.state = newSeed >>> 0;
  }

  /**
   * 生成 [0, 1) 浮点随机数，性能超越并完全可代替 Math.random()
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * 产生 [min, max] 闭区间的整数随机值
   */
  range(min: number, max: number): number {
    if (min >= max) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * 产生 [min, max] 闭区间的浮点随机值
   */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * 概率判定：以 probability (0~1) 几率返回 true
   */
  chance(probability: number): boolean {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return this.next() < probability;
  }

  /**
   * 从非空数组中随机选择一个元素
   */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }

  /**
   * 洗牌算法 (Fisher-Yates Shuffle)
   */
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }
}

export const defaultPRNG = new PRNG();
