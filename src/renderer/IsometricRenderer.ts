import { Direction8, Entity, GroundItem } from '../types/game';
import { GameWorld } from '../domain/GameWorld';
import { PortalDef } from '../types/map';
import { getActiveResonance } from '../domain/definitions/enhancement';
import { PlayerRenderer } from './renderers/PlayerRenderer';
import { MonsterRenderer } from './renderers/MonsterRenderer';

interface SlashAnimation {
  gridX: number;
  gridY: number;
  dir: Direction8;
  isFire: boolean;
  isPhantom?: boolean;
  progress: number;
  maxTicks: number;
}

interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

type RenderItem = 
  | { type: 'ground_item'; depthY: number; item: GroundItem; renderPos: { x: number; y: number } }
  | { type: 'entity'; depthY: number; entity: Entity; posX: number; posY: number; isSelected: boolean }
  | { type: 'slash'; depthY: number; slash: SlashAnimation; pos: { x: number; y: number } };

export class IsometricRenderer {
  readonly TILE_WIDTH = 72;
  readonly TILE_HEIGHT = 36;

  private playerRenderer = new PlayerRenderer();
  private monsterRenderer = new MonsterRenderer();

  private slashes: SlashAnimation[] = [];
  private bloods: BloodParticle[] = [];
  private renderList: RenderItem[] = [];
  private animFrame = 0;
  private curCamX: number | null = null;
  private curCamY: number | null = null;

  getCamPos(): { x: number; y: number } {
    return {
      x: this.curCamX ?? 0,
      y: this.curCamY ?? 0
    };
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | number[] = 2
  ): void {
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, radius);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  gridToScreen(gx: number, gy: number): { x: number; y: number } {
    return {
      x: (gx - gy) * (this.TILE_WIDTH / 2),
      y: (gx + gy) * (this.TILE_HEIGHT / 2)
    };
  }

  screenToGrid(sx: number, sy: number, camX: number, camY: number): { x: number; y: number } {
    const worldX = sx + camX;
    const worldY = sy + camY;
    const gx = (worldX / (this.TILE_WIDTH / 2) + worldY / (this.TILE_HEIGHT / 2)) / 2;
    const gy = (worldY / (this.TILE_HEIGHT / 2) - worldX / (this.TILE_WIDTH / 2)) / 2;
    return {
      x: Math.round(gx),
      y: Math.round(gy)
    };
  }

  addSlashVFX(gridPos: { x: number; y: number }, dir: Direction8, isFire: boolean, haste: number, isPhantom = false): void {
    const maxTicks = Math.max(3, Math.floor(7 * 100 / (100 + haste)));
    this.slashes.push({
      gridX: gridPos.x,
      gridY: gridPos.y,
      dir,
      isFire,
      isPhantom,
      progress: 0,
      maxTicks
    });

    const pos = this.gridToScreen(gridPos.x, gridPos.y);
    for (let i = 0; i < 6; i++) {
      this.bloods.push({
        x: pos.x + (Math.random() - 0.5) * 16,
        y: pos.y - 15 + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5 - 2,
        life: 0,
        maxLife: 14 + Math.random() * 8,
        size: 2 + Math.random() * 3
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    width: number,
    height: number,
    selectedTargetId: string | null
  ): void {
    this.animFrame++;

    ctx.fillStyle = '#0a090b';
    ctx.fillRect(0, 0, width, height);

    const p = world.player;
    let pInterpX = p.gridPos.x;
    let pInterpY = p.gridPos.y;
    if (p.targetGridPos) {
      pInterpX += (p.targetGridPos.x - p.gridPos.x) * p.moveProgress;
      pInterpY += (p.targetGridPos.y - p.gridPos.y) * p.moveProgress;
    }
    const playerScreen = this.gridToScreen(pInterpX, pInterpY);

    const targetCamX = playerScreen.x - width / 2;
    const targetCamY = playerScreen.y - height / 2;

    // 平滑相机跟随 (Exponential Smoothing Lerp)，彻底消除每 100ms 移动一步产生的剧烈锯齿顿挫与抽搐
    if (this.curCamX === null || this.curCamY === null || Math.hypot(targetCamX - this.curCamX, targetCamY - this.curCamY) > 600) {
      this.curCamX = targetCamX;
      this.curCamY = targetCamY;
    } else {
      const lerp = 0.16;
      this.curCamX += (targetCamX - this.curCamX) * lerp;
      this.curCamY += (targetCamY - this.curCamY) * lerp;
    }

    // 核心打击感：震屏 (Screen Shake) 仅在暴击和绝招时轻微抖动，杜绝高频晃眼
    let shakeX = 0;
    let shakeY = 0;
    if (world.screenShake > 0) {
      const dampenedShake = Math.min(world.screenShake, 3);
      shakeX = (Math.random() - 0.5) * dampenedShake;
      shakeY = (Math.random() - 0.5) * dampenedShake;
    }

    const camX = Math.round(this.curCamX + shakeX);
    const camY = Math.round(this.curCamY + shakeY);

    ctx.save();
    ctx.translate(-camX, -camY);

    this.renderTiles(ctx, world, camX, camY, width, height);
    this.renderAOEWarnings(ctx, world.aoeWarnings);

    // 零分配渲染管线：复用 renderList 数组容器
    this.renderList.length = 0;

    // 地面战利品 (带喷泉抛物线动画)
    for (const item of world.groundItems) {
      const finalPos = this.gridToScreen(item.gridPos.x, item.gridPos.y);
      const renderPos = { ...finalPos };

      if (item.burstProgress !== undefined && item.burstProgress < 1.0 && item.burstOrigin) {
        const originPos = this.gridToScreen(item.burstOrigin.x, item.burstOrigin.y);
        const t = item.burstProgress;
        renderPos.x = originPos.x + (finalPos.x - originPos.x) * t;
        renderPos.y = originPos.y + (finalPos.y - originPos.y) * t - Math.sin(t * Math.PI) * 45;
      }

      this.renderList.push({
        type: 'ground_item',
        depthY: finalPos.y,
        item,
        renderPos
      });
    }

    // 怪物与玩家
    const allEntities = [...world.monsters, world.player];
    for (const ent of allEntities) {
      if (ent.state === 'dead' && !ent.isPlayer) continue;
      let gx = ent.gridPos.x;
      let gy = ent.gridPos.y;
      if (ent.targetGridPos) {
        gx += (ent.targetGridPos.x - ent.gridPos.x) * ent.moveProgress;
        gy += (ent.targetGridPos.y - ent.gridPos.y) * ent.moveProgress;
      }
      const pos = this.gridToScreen(gx, gy);

      // 受击击退位移
      if (ent.knockbackOffset && ent.hitStunTicks && ent.hitStunTicks > 0) {
        pos.x += ent.knockbackOffset.x;
        pos.y += ent.knockbackOffset.y;
      }

      this.renderList.push({
        type: 'entity',
        depthY: pos.y,
        entity: ent,
        posX: pos.x,
        posY: pos.y,
        isSelected: selectedTargetId === ent.id
      });
    }

    // 刀光
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i];
      slash.progress++;
      const pos = this.gridToScreen(slash.gridX, slash.gridY);
      this.renderList.push({
        type: 'slash',
        depthY: pos.y + 6,
        slash,
        pos
      });
      if (slash.progress >= slash.maxTicks) {
        this.slashes.splice(i, 1);
      }
    }

    // 飞溅血迹
    for (let i = this.bloods.length - 1; i >= 0; i--) {
      const b = this.bloods[i];
      b.life++;
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.22;
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      if (b.life >= b.maxLife) {
        this.bloods.splice(i, 1);
      }
    }

    this.renderList.sort((a, b) => a.depthY - b.depthY);
    for (const obj of this.renderList) {
      if (obj.type === 'ground_item') {
        this.renderGroundItem(ctx, obj.item, obj.renderPos);
      } else if (obj.type === 'entity') {
        this.renderEntity(ctx, obj.entity, obj.posX, obj.posY, obj.isSelected, world);
      } else if (obj.type === 'slash') {
        this.renderSlash(ctx, obj.slash, obj.pos);
      }
    }

    this.renderDamagePopups(ctx, world.damagePopups);

    ctx.restore();

    // 屏幕中央连斩提示 (Combo Count)
    if (world.comboCount > 1) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px "SimSun", "Songti SC", sans-serif';
      ctx.fillStyle = world.isBerserk ? '#f97316' : '#fde047';
      ctx.shadowColor = world.isBerserk ? '#ea580c' : '#b45309';
      ctx.shadowBlur = 12;
      const comboText = world.isBerserk ? `🔥 狂暴连斩 x${world.comboCount}！🔥` : `⚔️ 连斩 x${world.comboCount}`;
      ctx.fillText(comboText, width / 2, 72);
      ctx.restore();
    }
  }

  private renderTiles(
    ctx: CanvasRenderingContext2D, 
    world: GameWorld, 
    camX: number, 
    camY: number, 
    w: number, 
    h: number
  ): void {
    const hw = this.TILE_WIDTH / 2;
    const hh = this.TILE_HEIGHT / 2;
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
        const scr = this.gridToScreen(x, y);

        if (scr.x + hw < camX - 60 || scr.x - hw > camX + w + 60 ||
            scr.y + hh < camY - 60 || scr.y - hh > camY + h + 60) {
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
      const pScr = this.gridToScreen(portal.pos.x, portal.pos.y);
      if (pScr.x + hw < camX - 100 || pScr.x - hw > camX + w + 100 ||
          pScr.y + hh < camY - 260 || pScr.y - hh > camY + h + 100) {
        continue;
      }
      this.renderPortal(ctx, portal, pScr);
    }
  }

  private renderPortal(ctx: CanvasRenderingContext2D, portal: PortalDef, pos: { x: number; y: number }): void {
    const color = portal.beamColor || '#38bdf8';

    ctx.save();
    // 1. 地面旋转奥术光涡
    const vortexAngle = this.animFrame * 0.04;
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
    const beamPulse = 0.65 + Math.sin(this.animFrame * 0.1) * 0.25;
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

  private renderGroundItem(ctx: CanvasRenderingContext2D, drop: GroundItem, pos: { x: number; y: number }): void {
    if (drop.beamColor) {
      ctx.save();
      const haloGrad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 28);
      haloGrad.addColorStop(0, drop.beamColor);
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 26, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      const beamGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y - 200);
      beamGrad.addColorStop(0, drop.beamColor);
      beamGrad.addColorStop(0.3, drop.beamColor);
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.globalAlpha = 0.7 + Math.sin(this.animFrame * 0.12) * 0.2;
      ctx.fillRect(pos.x - 7, pos.y - 200, 14, 200);

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.fillRect(pos.x - 1.5, pos.y - 200, 3, 200);
      ctx.restore();
    }

    ctx.save();
    if (drop.item.type === 'potion') {
      ctx.fillStyle = (drop.item.recoverHp || 0) > 0 ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(pos.x - 2, pos.y - 9, 4, 3);
    } else if (drop.item.name.includes('金币')) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(pos.x - 2, pos.y - 2, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, -12, 4, 14);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5, -4, 10, 2);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(drop.item.name).width;
    const pad = 4;
    const tagX = pos.x - textWidth / 2 - pad;
    const tagY = pos.y + 6;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(tagX, tagY, textWidth + pad * 2, 16);
    ctx.strokeStyle = drop.beamColor || '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(tagX, tagY, textWidth + pad * 2, 16);

    ctx.fillStyle = drop.beamColor || '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(drop.item.name, pos.x, tagY + 12);
    ctx.restore();
  }

  private renderAOEWarnings(ctx: CanvasRenderingContext2D, warnings: import('../types/affix').TelegraphedAOE[]): void {
    if (!warnings || warnings.length === 0) return;

    for (const aoe of warnings) {
      const pos = this.gridToScreen(aoe.center.x, aoe.center.y);
      const radiusX = (aoe.radius + 0.5) * this.TILE_WIDTH;
      const radiusY = (aoe.radius + 0.5) * this.TILE_HEIGHT;
      const progress = Math.min(1.0, aoe.currentTick / aoe.durationTicks);
      const pulse = 0.22 + 0.12 * Math.sin(this.animFrame * 0.25);

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

  private renderEntity(
    ctx: CanvasRenderingContext2D,
    ent: Entity,
    sx: number,
    sy: number,
    isSelected: boolean,
    world: GameWorld
  ): void {
    ctx.save();
    ctx.translate(sx, sy);

    const scale = ent.isPlayer ? 1.85 : (ent.isBoss ? 3.0 : (ent.isElite ? 2.25 : 1.65));
    const shadowGrad = ctx.createRadialGradient(0, 0, 2 * scale, 0, 0, 16 * scale);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    shadowGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.28)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 变异精英怪/地精 脚下特色光环
    if (ent.affixes && ent.affixes.length > 0) {
      ctx.save();
      const auraColor = ent.color || '#facc15';
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = auraColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20 * scale, 10 * scale, (this.animFrame * 0.05) % (Math.PI * 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (isSelected) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22 * scale, 11 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 25 * scale, 12.5 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 受击红白闪烁 (Hit Flash)
    if (ent.hitStunTicks && ent.hitStunTicks > 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(0, -20 * scale, 22 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ent.isPlayer) {
      this.playerRenderer.drawPlayerWarrior(ctx, ent, world, scale, this.animFrame);
    } else {
      this.monsterRenderer.drawMonster(ctx, ent, scale, this.animFrame);
    }

    const barW = Math.floor(34 * scale);
    const barH = Math.max(4, Math.floor(2.4 * scale));
    const barY = -42 * scale;

    // 首领限时玄金护盾条
    if (ent.shieldHp && ent.shieldHp > 0 && ent.maxShieldHp) {
      const shieldRatio = Math.min(1.0, ent.shieldHp / ent.maxShieldHp);
      const sBarY = barY - 6;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-barW / 2, sBarY, barW, 3);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2, sBarY, barW, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-barW / 2, sBarY, barW * shieldRatio, 3);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, barY, barW, barH);

    const hpRatio = Math.max(0, ent.stats.hp / ent.stats.maxHp);
    ctx.fillStyle = ent.isPlayer ? '#22c55e' : (ent.isBoss ? '#dc2626' : '#ea580c');
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

    // 破盾瘫痪虚弱旋转晕眩星标
    if (ent.isWeakened) {
      ctx.save();
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      const starAngle = (this.animFrame * 0.12) % (Math.PI * 2);
      const offX = Math.cos(starAngle) * 16 * scale;
      const offY = Math.sin(starAngle) * 6 * scale;
      ctx.fillText('💫', offX, barY - 14 + offY);
      ctx.restore();
    }

    ctx.font = ent.isBoss ? 'bold 15px "SimSun", "Songti SC", serif' : (ent.isElite || ent.isPlayer ? 'bold 13px "SimSun", "Songti SC", serif' : 'bold 12px "SimSun", "Songti SC", serif');
    ctx.textAlign = 'center';
    ctx.fillStyle = ent.invincibleTicks && ent.invincibleTicks > 0 ? '#38bdf8' : (ent.isPlayer ? '#fef08a' : (ent.isBoss ? '#f87171' : (ent.isElite ? '#fde047' : '#e2e8f0')));
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    const displayName = ent.invincibleTicks && ent.invincibleTicks > 0 
      ? `🛡️[无敌] ${ent.name}` 
      : (ent.shieldHp && ent.shieldHp > 0 ? `🛡️[金身] ${ent.name}` : (ent.isWeakened ? `💫[瘫痪] ${ent.name}` : ent.name));
    ctx.fillText(displayName, 0, barY - 4);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private renderSlash(ctx: CanvasRenderingContext2D, slash: SlashAnimation, pos: { x: number; y: number }): void {
    ctx.save();
    ctx.translate(pos.x, pos.y - 18);

    const angleMap: Record<Direction8, number> = {
      0: -Math.PI / 2,
      1: -Math.PI / 4,
      2: 0,
      3: Math.PI / 4,
      4: Math.PI / 2,
      5: (3 * Math.PI) / 4,
      6: Math.PI,
      7: (-3 * Math.PI) / 4
    };

    ctx.rotate(angleMap[slash.dir]);

    const sweepProgress = slash.progress / slash.maxTicks;
    const sweepAngle = (sweepProgress - 0.5) * (Math.PI * 0.75); // 顺劈更宽扇面

    ctx.beginPath();
    ctx.arc(20, 0, slash.isPhantom ? 44 : 42, sweepAngle - 0.8, sweepAngle + 0.8);
    if (slash.isPhantom) {
      // 外层金芒
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.stroke();

      // 内层青色电芒残影
      ctx.beginPath();
      ctx.arc(20, 0, 38, sweepAngle - 0.7, sweepAngle + 0.7);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#67e8f9';
      ctx.shadowBlur = 10;
      ctx.stroke();
    } else {
      ctx.strokeStyle = slash.isFire ? '#f97316' : '#38bdf8';
      ctx.lineWidth = slash.isFire ? 8 : 5;
      ctx.shadowColor = slash.isFire ? '#ea580c' : '#0284c7';
      ctx.shadowBlur = 16;
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderDamagePopups(ctx: CanvasRenderingContext2D, popups: any[]): void {
    for (const p of popups) {
      const pos = this.gridToScreen(p.worldX, p.worldY);
      const alpha = Math.max(0, 1 - p.life / p.maxLife);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';

      if (p.isCrit) {
        ctx.font = 'bold 24px "SimSun", "Songti SC", sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 14;
        ctx.fillText(p.text, pos.x, pos.y - 50);
      } else if (p.isHeal) {
        ctx.font = 'bold 16px "SimSun", sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.fillText(p.text, pos.x, pos.y - 38);
      } else {
        ctx.font = 'bold 15px "SimSun", sans-serif';
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(p.text, pos.x, pos.y - 38);
      }

      ctx.restore();
    }
  }
}
