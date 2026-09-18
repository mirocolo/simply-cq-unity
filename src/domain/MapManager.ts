import { GridCoord } from '../types/game';
import { MapDefinition, PortalDef } from '../types/map';
import { MAP_DEFINITIONS } from './definitions/maps';

export class MapManager {
  currentMapId = 'map_biqi_0';
  unlockedMaps = new Set<string>(['map_biqi_0']);
  obstacles = new Set<string>();
  bossRespawnTimers = new Map<string, number>();

  constructor(initialMapId = 'map_biqi_0') {
    this.switchMap(initialMapId);
  }

  get currentMap(): MapDefinition {
    return MAP_DEFINITIONS[this.currentMapId] || MAP_DEFINITIONS['map_biqi_0'];
  }

  switchMap(mapId: string): boolean {
    const mapDef = MAP_DEFINITIONS[mapId];
    if (!mapDef) return false;

    this.currentMapId = mapId;
    this.unlockedMaps.add(mapId);

    // 重建当前地图静态障碍物拓扑
    this.obstacles.clear();
    for (const ob of mapDef.fixedObstacles) {
      this.obstacles.add(`${ob.x},${ob.y}`);
    }

    return true;
  }

  isWalkable = (x: number, y: number): boolean => {
    const map = this.currentMap;
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      return false;
    }
    return !this.obstacles.has(`${x},${y}`);
  };

  checkPortalTrigger(pos: GridCoord): PortalDef | undefined {
    return this.currentMap.portals.find(p => p.pos.x === pos.x && p.pos.y === pos.y);
  }

  canEnterPortal(portal: PortalDef, playerLevel: number, playerTier: number): { allowed: boolean; reason?: string } {
    if (playerTier < portal.requiredTier) {
      return {
        allowed: false,
        reason: `位面封印阻挡！需达到【${portal.requiredTier}转飞升】方可踏入此界！`
      };
    }
    if (playerLevel < portal.requiredLevel) {
      return {
        allowed: false,
        reason: `等级不足！需达到 Lv.${portal.requiredLevel} 方可进入！`
      };
    }
    return { allowed: true };
  }

  canFastTravelToMap(mapId: string, playerLevel: number, playerTier: number): { allowed: boolean; reason?: string } {
    const map = MAP_DEFINITIONS[mapId];
    if (!map) return { allowed: false, reason: '位面不存在' };

    // 0阶比奇无门槛
    if (map.tier === 0) return { allowed: true };

    if (playerTier < map.tier) {
      return { allowed: false, reason: `需达到【${map.tier}转飞升】方可传送！` };
    }

    // 各阶位面最低等级指引
    const minLevels: Record<number, number> = {
      1: 25, 2: 35, 3: 42, 4: 48, 5: 53, 6: 58, 7: 63, 8: 68, 9: 72
    };
    const reqLevel = minLevels[map.tier] || 1;
    if (playerLevel < reqLevel) {
      return { allowed: false, reason: `需达到 Lv.${reqLevel} 方可进入！` };
    }

    return { allowed: true };
  }

  recordBossDeath(templateId: string, respawnTicks: number, currentTick: number): void {
    this.bossRespawnTimers.set(templateId, currentTick + respawnTicks);
  }

  isBossReady(templateId: string, currentTick: number): boolean {
    const readyTick = this.bossRespawnTimers.get(templateId);
    if (!readyTick) return true;
    return currentTick >= readyTick;
  }

  getBossRemainingTicks(templateId: string, currentTick: number): number {
    const readyTick = this.bossRespawnTimers.get(templateId);
    if (!readyTick) return 0;
    return Math.max(0, readyTick - currentTick);
  }

  getAllMaps(): MapDefinition[] {
    return Object.values(MAP_DEFINITIONS).sort((a, b) => a.tier - b.tier);
  }

  isMapUnlocked(mapId: string): boolean {
    return this.unlockedMaps.has(mapId);
  }

  unlockMap(mapId: string): void {
    this.unlockedMaps.add(mapId);
  }

  exportState(): { currentMapId: string; unlockedMaps: string[] } {
    return {
      currentMapId: this.currentMapId,
      unlockedMaps: Array.from(this.unlockedMaps)
    };
  }

  importState(data: { currentMapId?: string; unlockedMaps?: string[] }): void {
    if (data.unlockedMaps && Array.isArray(data.unlockedMaps)) {
      for (const m of data.unlockedMaps) {
        if (MAP_DEFINITIONS[m]) this.unlockedMaps.add(m);
      }
    }
    if (data.currentMapId && MAP_DEFINITIONS[data.currentMapId]) {
      this.switchMap(data.currentMapId);
    }
  }
}
