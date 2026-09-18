import { Direction8, GridCoord } from '../types/game';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class PathFinder {
  // 8 方向位移向量与朝向映射
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
   * 8 方向 A* 寻路算法
   */
  static findPath(
    start: GridCoord,
    goal: GridCoord,
    isWalkable: (x: number, y: number) => boolean,
    maxSearchSteps = 300
  ): GridCoord[] {
    if (start.x === goal.x && start.y === goal.y) return [];

    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.chebyshevDistance(start, goal) * 10,
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    let steps = 0;

    while (openList.length > 0 && steps < maxSearchSteps) {
      steps++;
      // 取 f 最小节点
      let lowestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIdx].f) {
          lowestIdx = i;
        }
      }
      const current = openList.splice(lowestIdx, 1)[0];
      const key = `${current.x},${current.y}`;
      closedSet.add(key);

      // 到达目标
      if (current.x === goal.x && current.y === goal.y) {
        const path: GridCoord[] = [];
        let curr: PathNode | null = current;
        while (curr && curr.parent) {
          path.unshift({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path;
      }

      // 遍历 8 个邻居
      for (const dir of this.DIRS) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const nKey = `${nx},${ny}`;

        if (closedSet.has(nKey)) continue;

        // 如果不是目标点，必须可行走
        const isGoal = nx === goal.x && ny === goal.y;
        if (!isGoal && !isWalkable(nx, ny)) {
          continue;
        }

        const gScore = current.g + dir.cost;
        let neighbor = openList.find(n => n.x === nx && n.y === ny);

        if (!neighbor) {
          neighbor = {
            x: nx,
            y: ny,
            g: gScore,
            h: this.chebyshevDistance({ x: nx, y: ny }, goal) * 10,
            f: 0,
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          openList.push(neighbor);
        } else if (gScore < neighbor.g) {
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
    }

    // 无法直达时，寻找离目标最近的可达点
    return [];
  }
}
