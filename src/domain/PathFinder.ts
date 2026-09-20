import { Direction8, GridCoord } from '../types/game';

interface FastPathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  heapIndex: number;
  closed: boolean;
  parent: FastPathNode | null;
}

/**
 * 专为 A* 寻路打造的高性能二叉最小堆 (Binary Min-Heap)
 * 节点内置 heapIndex，支持在 O(log N) 时间内调整已降低 f 值的节点，杜绝线性扫描
 */
class FastMinHeap {
  private heap: FastPathNode[] = [];

  get size(): number {
    return this.heap.length;
  }

  clear(): void {
    this.heap.length = 0;
  }

  push(node: FastPathNode): void {
    node.heapIndex = this.heap.length;
    this.heap.push(node);
    this.bubbleUp(node.heapIndex);
  }

  pop(): FastPathNode | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      bottom.heapIndex = 0;
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.heap[idx].f >= this.heap[parentIdx].f) break;

      const temp = this.heap[idx];
      this.heap[idx] = this.heap[parentIdx];
      this.heap[parentIdx] = temp;

      this.heap[idx].heapIndex = idx;
      this.heap[parentIdx].heapIndex = parentIdx;

      idx = parentIdx;
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.heap.length;
    while (true) {
      const leftIdx = (idx << 1) + 1;
      const rightIdx = leftIdx + 1;
      let smallestIdx = idx;

      if (leftIdx < length && this.heap[leftIdx].f < this.heap[smallestIdx].f) {
        smallestIdx = leftIdx;
      }
      if (rightIdx < length && this.heap[rightIdx].f < this.heap[smallestIdx].f) {
        smallestIdx = rightIdx;
      }

      if (smallestIdx === idx) break;

      const temp = this.heap[idx];
      this.heap[idx] = this.heap[smallestIdx];
      this.heap[smallestIdx] = temp;

      this.heap[idx].heapIndex = idx;
      this.heap[smallestIdx].heapIndex = smallestIdx;

      idx = smallestIdx;
    }
  }
}

// 最大支持 256x256 广袤位面地图，一次性预分配平坦内存，实现寻路全程 0 GC
const MAX_DIM = 256;
const TOTAL_CELLS = MAX_DIM * MAX_DIM;
const visitedStamp = new Int32Array(TOTAL_CELLS);
const nodePool: (FastPathNode | undefined)[] = new Array(TOTAL_CELLS);
let currentSearchId = 0;
const heap = new FastMinHeap();

export class PathFinder {
  // 8 方向位移向量与朝向映射 (直走消耗 10，斜走消耗 14)
  private static readonly DIRS: { dx: number; dy: number; dir: Direction8; cost: number }[] = [
    { dx: 0, dy: -1, dir: 0, cost: 10 }, // 0: 上
    { dx: 1, dy: -1, dir: 1, cost: 14 }, // 1: 东北
    { dx: 1, dy: 0, dir: 2, cost: 10 },  // 2: 右
    { dx: 1, dy: 1, dir: 3, cost: 14 },  // 3: 东南
    { dx: 0, dy: 1, dir: 4, cost: 10 },  // 4: 下
    { dx: -1, dy: 1, dir: 5, cost: 14 }, // 5: 西南
    { dx: -1, dy: 0, dir: 6, cost: 10 }, // 6: 左
    { dx: -1, dy: -1, dir: 7, cost: 14 } // 7: 西北
  ];

  /**
   * 根据坐标差计算 8 方向朝向
   */
  static getDirection(from: GridCoord, to: GridCoord): Direction8 {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    if (dx === 0 && dy < 0) return 0;
    if (dx > 0 && dy < 0) return 1;
    if (dx > 0 && dy === 0) return 2;
    if (dx > 0 && dy > 0) return 3;
    if (dx === 0 && dy > 0) return 4;
    if (dx < 0 && dy > 0) return 5;
    if (dx < 0 && dy === 0) return 6;
    if (dx < 0 && dy < 0) return 7;
    return 4; // 默认朝南
  }

  /**
   * 切比雪夫网格距离 (8 方向移动中的实际步数)
   */
  static chebyshevDistance(a: GridCoord, b: GridCoord): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  /**
   * 8 方向高性能 A* 寻路算法
   * 特性：二叉最小堆 O(log N) 调度 + 平坦位图访问戳标记 + 对象复用零内存分配
   */
  static findPath(
    start: GridCoord,
    goal: GridCoord,
    isWalkable: (x: number, y: number) => boolean,
    maxSearchSteps = 600
  ): GridCoord[] {
    if (start.x === goal.x && start.y === goal.y) return [];
    if (start.x < 0 || start.x >= MAX_DIM || start.y < 0 || start.y >= MAX_DIM) return [];
    if (goal.x < 0 || goal.x >= MAX_DIM || goal.y < 0 || goal.y >= MAX_DIM) return [];

    // 单调自增 searchId 避免每次 fill(0) 清空大型数组；溢出时快速归零
    currentSearchId++;
    if (currentSearchId >= 2_000_000_000) {
      visitedStamp.fill(0);
      currentSearchId = 1;
    }
    const searchId = currentSearchId;

    heap.clear();

    const startIdx = (start.y << 8) | start.x;
    visitedStamp[startIdx] = searchId;

    let startNode = nodePool[startIdx];
    if (!startNode) {
      startNode = {
        x: start.x,
        y: start.y,
        g: 0,
        h: this.chebyshevDistance(start, goal) * 10,
        f: 0,
        heapIndex: -1,
        closed: false,
        parent: null
      };
      startNode.f = startNode.h;
      nodePool[startIdx] = startNode;
    } else {
      startNode.x = start.x;
      startNode.y = start.y;
      startNode.g = 0;
      startNode.h = this.chebyshevDistance(start, goal) * 10;
      startNode.f = startNode.h;
      startNode.closed = false;
      startNode.parent = null;
    }

    heap.push(startNode);
    let steps = 0;

    while (heap.size > 0 && steps < maxSearchSteps) {
      steps++;
      const current = heap.pop()!;
      current.closed = true;

      // 到达目标
      if (current.x === goal.x && current.y === goal.y) {
        const path: GridCoord[] = [];
        let curr: FastPathNode | null = current;
        while (curr && curr.parent) {
          path.push({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        path.reverse();
        return path;
      }

      // 遍历 8 个相邻网格
      for (let i = 0; i < 8; i++) {
        const dir = this.DIRS[i];
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (nx < 0 || nx >= MAX_DIM || ny < 0 || ny >= MAX_DIM) continue;

        const isGoal = nx === goal.x && ny === goal.y;
        if (!isGoal && !isWalkable(nx, ny)) {
          continue;
        }

        const cellIdx = (ny << 8) | nx;
        const gScore = current.g + dir.cost;

        if (visitedStamp[cellIdx] === searchId) {
          const neighbor = nodePool[cellIdx]!;
          if (neighbor.closed) continue;

          if (gScore < neighbor.g) {
            neighbor.g = gScore;
            neighbor.f = gScore + neighbor.h;
            neighbor.parent = current;
            heap.bubbleUp(neighbor.heapIndex);
          }
          continue;
        }

        // 首次访问该邻居节点
        visitedStamp[cellIdx] = searchId;
        let neighbor = nodePool[cellIdx];
        const hScore = this.chebyshevDistance({ x: nx, y: ny }, goal) * 10;

        if (!neighbor) {
          neighbor = {
            x: nx,
            y: ny,
            g: gScore,
            h: hScore,
            f: gScore + hScore,
            heapIndex: -1,
            closed: false,
            parent: current
          };
          nodePool[cellIdx] = neighbor;
        } else {
          neighbor.x = nx;
          neighbor.y = ny;
          neighbor.g = gScore;
          neighbor.h = hScore;
          neighbor.f = gScore + hScore;
          neighbor.closed = false;
          neighbor.parent = current;
        }

        heap.push(neighbor);
      }
    }

    return [];
  }
}
