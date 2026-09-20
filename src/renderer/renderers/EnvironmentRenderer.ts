import { GameWorld } from '../../domain/GameWorld';
import { PortalDef } from '../../types/map';
import { TelegraphedAOE } from '../../types/affix';

export class EnvironmentRenderer {
  private cachedMapId: string | null = null;
  private cachedCanvas: HTMLCanvasElement | null = null;
  private cachedOffsetX = 0;
  private cachedOffsetY = 0;

  /**
   * 构建离屏静态瓦片与高墙烘焙缓存，消除每帧近万次矢量路径绘制开销
   */
  private buildTileCache(
    world: GameWorld,
    hw: number,
    hh: number,
    gridToScreen: (gx: number, gy: number) => { x: number; y: number }
  ): void {
    if (typeof document === 'undefined') return;

    const theme = world.currentMap.theme;
    const mw = world.MAP_WIDTH;
    const mh = world.MAP_HEIGHT;

    // 计算整张地图的屏幕外接矩形范围
    const minX = -mh * hw - 80;
    const maxX = mw * hw + 80;
    const minY = -60;
    const maxY = (mw + mh) * hh + 60;

    const width = Math.ceil(maxX - minX);
    const height = Math.ceil(maxY - minY);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.cachedOffsetX = -minX;
    this.cachedOffsetY = -minY;

    ctx.save();
    ctx.translate(this.cachedOffsetX, this.cachedOffsetY);

    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const scr = gridToScreen(x, y);
        const isWall = !world.isWalkable(x, y);

        ctx.beginPath();
        ctx.moveTo(scr.x, scr.y - hh);
        ctx.lineTo(scr.x + hw, scr.y);
        ctx.lineTo(scr.x, scr.y + hh);
        ctx.lineTo(scr.x - hw, scr.y);
        ctx.closePath();

        if (isWall) {
          ctx.fillStyle = theme.wallBaseColor;
          ctx.fill();
          ctx.strokeStyle = theme.wallBorderColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = theme.wallBaseColor;
          ctx.beginPath();
          ctx.moveTo(scr.x - hw, scr.y);
          ctx.lineTo(scr.x, scr.y - hh);
          ctx.lineTo(scr.x, scr.y - hh - 24);
          ctx.lineTo(scr.x - hw, scr.y - 24);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = theme.wallTopColor;
          ctx.beginPath();
          ctx.moveTo(scr.x - hh, scr.y);
          ctx.lineTo(scr.x + hw, scr.y);
          ctx.lineTo(scr.x + hw, scr.y - 24);
          ctx.lineTo(scr.x, scr.y - hh - 24);
          ctx.closePath();
          ctx.fill();
        } else {
          const seed = (x * 13 + y * 17) % 10;
          ctx.fillStyle = seed > 6 ? theme.secondaryColor : (seed > 2 ? theme.primaryColor : theme.accentColor);
          ctx.fill();

          ctx.strokeStyle = theme.wallBorderColor;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
    this.cachedCanvas = canvas;
    this.cachedMapId = world.currentMap.id;
  }

  renderTiles(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    camX: number,
    camY: number,
    w: number,
    h: number,
    animFrame: number,
    tileWidth: number,
    tileHeight: number,
    gridToScreen: (gx: number, gy: number) => { x: number; y: number }
  ): void {
    const hw = tileWidth / 2;
    const hh = tileHeight / 2;

    // 检查并自动更新离屏地砖瓦片烘焙缓存 (Map Cache)
    if (world.currentMap.id !== this.cachedMapId || !this.cachedCanvas) {
      this.buildTileCache(world, hw, hh, gridToScreen);
    }

    if (this.cachedCanvas) {
      // 一次 GPU 贴图直冲绘制，彻底替代数千次循环几何绘制
      ctx.drawImage(this.cachedCanvas, -this.cachedOffsetX, -this.cachedOffsetY);
    }

    // 渲染位面传送门 (带动态奥术光涡与冲天接引光柱)
    for (const portal of world.currentMap.portals) {
      const pScr = gridToScreen(portal.pos.x, portal.pos.y);
      if (
        pScr.x + hw < camX - 100 ||
        pScr.x - hw > camX + w + 100 ||
        pScr.y + hh < camY - 260 ||
        pScr.y - hh > camY + h + 100
      ) {
        continue;
      }
      this.renderPortal(ctx, portal, pScr, animFrame);
    }
  }

  renderPortal(
    ctx: CanvasRenderingContext2D,
    portal: PortalDef,
    pos: { x: number; y: number },
    animFrame: number
  ): void {
    const color = portal.beamColor || '#38bdf8';

    ctx.save();
    // 1. 地面旋转奥术光涡
    const vortexAngle = animFrame * 0.04;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(vortexAngle);
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 2. 通天接引传送光柱
    const beamPulse = 0.65 + Math.sin(animFrame * 0.1) * 0.25;
    const beamGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y - 180);
    beamGrad.addColorStop(0, color);
    beamGrad.addColorStop(0.7, color);
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.globalAlpha = beamPulse;
    ctx.fillRect(pos.x - 10, pos.y - 180, 20, 180);

    // 内部高亮白芯
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(pos.x - 2, pos.y - 180, 4, 180);
    ctx.restore();

    // 3. 悬浮传送门铭牌
    ctx.save();
    ctx.font = 'bold 12px "SimSun", "Songti SC", sans-serif';
    const tagText = portal.name;
    const tw = (ctx.measureText && ctx.measureText(tagText)?.width) || 60;
    const pad = 6;
    const tagX = pos.x - tw / 2 - pad;
    const tagY = pos.y - 50;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(tagX, tagY, tw + pad * 2, 20);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tagX, tagY, tw + pad * 2, 20);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(tagText, pos.x, tagY + 14);

    // 需求门槛小标
    ctx.font = '10px sans-serif';
    const reqText = portal.requiredTier > 0 ? `需${portal.requiredTier}转·Lv.${portal.requiredLevel}` : `需Lv.${portal.requiredLevel}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(reqText, pos.x, tagY + 32);
    ctx.restore();
  }

  renderAOEWarnings(
    ctx: CanvasRenderingContext2D,
    warnings: TelegraphedAOE[],
    animFrame: number,
    tileWidth: number,
    tileHeight: number,
    gridToScreen: (gx: number, gy: number) => { x: number; y: number }
  ): void {
    if (!warnings || warnings.length === 0) return;

    for (const aoe of warnings) {
      const pos = gridToScreen(aoe.center.x, aoe.center.y);
      const radiusX = (aoe.radius + 0.5) * tileWidth;
      const radiusY = (aoe.radius + 0.5) * tileHeight;
      const progress = Math.min(1.0, aoe.currentTick / aoe.durationTicks);
      const pulse = 0.22 + 0.12 * Math.sin(animFrame * 0.25);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // 半透明背景填充
      ctx.fillStyle = aoe.color ? `${aoe.color}33` : `rgba(239, 68, 68, ${pulse})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();

      // 外周红色警戒线
      ctx.strokeStyle = aoe.color || '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 内圈收缩警示圈
      const shrinkX = Math.max(2, (1 - progress) * radiusX);
      const shrinkY = Math.max(2, (1 - progress) * radiusY);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 0, shrinkX, shrinkY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 中心倒计时与技能名称标签
      const remainingSec = Math.max(0, (aoe.durationTicks - aoe.currentTick) * 0.1).toFixed(1);
      ctx.font = 'bold 12px "SimSun", "Songti SC", serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`⚠️${aoe.skillName} ${remainingSec}s`, 0, -radiusY * 0.4);
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  }
}
