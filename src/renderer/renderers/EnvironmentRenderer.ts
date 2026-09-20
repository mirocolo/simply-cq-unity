import { GameWorld } from '../../domain/GameWorld';
import { PortalDef } from '../../types/map';
import { TelegraphedAOE } from '../../types/affix';

export class EnvironmentRenderer {
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
    const theme = world.currentMap.theme;

    // 视锥数学反推（Frustum Culling）: 计算屏幕 4 角对应的世界坐标网格范围
    const pad = 100;
    const c1x = camX - pad;
    const c1y = camY - pad;
    const c2x = camX + w + pad;
    const c2y = camY - pad;
    const c3x = camX - pad;
    const c3y = camY + h + pad;
    const c4x = camX + w + pad;
    const c4y = camY + h + pad;

    const g1x = (c1x / hw + c1y / hh) / 2;
    const g1y = (c1y / hh - c1x / hw) / 2;
    const g2x = (c2x / hw + c2y / hh) / 2;
    const g2y = (c2y / hh - c2x / hw) / 2;
    const g3x = (c3x / hw + c3y / hh) / 2;
    const g3y = (c3y / hh - c3x / hw) / 2;
    const g4x = (c4x / hw + c4y / hh) / 2;
    const g4y = (c4y / hh - c4x / hw) / 2;

    const minGx = Math.max(0, Math.floor(Math.min(g1x, g2x, g3x, g4x)) - 1);
    const maxGx = Math.min(world.MAP_WIDTH - 1, Math.ceil(Math.max(g1x, g2x, g3x, g4x)) + 1);
    const minGy = Math.max(0, Math.floor(Math.min(g1y, g2y, g3y, g4y)) - 1);
    const maxGy = Math.min(world.MAP_HEIGHT - 1, Math.ceil(Math.max(g1y, g2y, g3y, g4y)) + 1);

    for (let y = minGy; y <= maxGy; y++) {
      for (let x = minGx; x <= maxGx; x++) {
        const scr = gridToScreen(x, y);

        if (
          scr.x + hw < camX - 60 ||
          scr.x - hw > camX + w + 60 ||
          scr.y + hh < camY - 60 ||
          scr.y - hh > camY + h + 60
        ) {
          continue;
        }

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
          ctx.moveTo(scr.x, scr.y - hh);
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

    // 渲染位面传送门 (光涡与冲天接引光柱)
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
