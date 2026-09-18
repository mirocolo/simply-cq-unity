import { Direction8, Entity, GroundItem } from '../types/game';
import { GameWorld } from '../domain/GameWorld';

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

export class IsometricRenderer {
  readonly TILE_WIDTH = 72;
  readonly TILE_HEIGHT = 36;

  private slashes: SlashAnimation[] = [];
  private bloods: BloodParticle[] = [];
  private animFrame = 0;

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

    // 核心打击感：震屏 (Screen Shake)
    let shakeX = 0;
    let shakeY = 0;
    if (world.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * world.screenShake * 1.5;
      shakeY = (Math.random() - 0.5) * world.screenShake * 1.5;
    }

    const camX = playerScreen.x - width / 2 + shakeX;
    const camY = playerScreen.y - height / 2 + shakeY;

    ctx.save();
    ctx.translate(-camX, -camY);

    this.renderTiles(ctx, world, camX, camY, width, height);

    const renderList: Array<{
      depthY: number;
      draw: () => void;
    }> = [];

    // 地面战利品 (带喷泉抛物线动画)
    for (const item of world.groundItems) {
      let finalPos = this.gridToScreen(item.gridPos.x, item.gridPos.y);
      let renderPos = { ...finalPos };

      if (item.burstProgress !== undefined && item.burstProgress < 1.0 && item.burstOrigin) {
        const originPos = this.gridToScreen(item.burstOrigin.x, item.burstOrigin.y);
        const t = item.burstProgress;
        renderPos.x = originPos.x + (finalPos.x - originPos.x) * t;
        renderPos.y = originPos.y + (finalPos.y - originPos.y) * t - Math.sin(t * Math.PI) * 45;
      }

      renderList.push({
        depthY: finalPos.y,
        draw: () => this.renderGroundItem(ctx, item, renderPos)
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
      let pos = this.gridToScreen(gx, gy);

      // 受击击退位移
      if (ent.knockbackOffset && ent.hitStunTicks && ent.hitStunTicks > 0) {
        pos.x += ent.knockbackOffset.x;
        pos.y += ent.knockbackOffset.y;
      }

      renderList.push({
        depthY: pos.y,
        draw: () => this.renderEntity(ctx, ent, pos.x, pos.y, selectedTargetId === ent.id, world)
      });
    }

    // 刀光
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i];
      slash.progress++;
      const pos = this.gridToScreen(slash.gridX, slash.gridY);
      renderList.push({
        depthY: pos.y + 6,
        draw: () => this.renderSlash(ctx, slash, pos)
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

    renderList.sort((a, b) => a.depthY - b.depthY);
    for (const obj of renderList) {
      obj.draw();
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

    for (let y = 0; y < world.MAP_HEIGHT; y++) {
      for (let x = 0; x < world.MAP_WIDTH; x++) {
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
          ctx.fillStyle = '#1c1815';
          ctx.fill();
          ctx.strokeStyle = '#2c251f';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#29221b';
          ctx.beginPath();
          ctx.moveTo(scr.x - hw, scr.y);
          ctx.lineTo(scr.x, scr.y - hh);
          ctx.lineTo(scr.x, scr.y - hh - 24);
          ctx.lineTo(scr.x - hw, scr.y - 24);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#3a3026';
          ctx.beginPath();
          ctx.moveTo(scr.x, scr.y - hh);
          ctx.lineTo(scr.x + hw, scr.y);
          ctx.lineTo(scr.x + hw, scr.y - 24);
          ctx.lineTo(scr.x, scr.y - hh - 24);
          ctx.closePath();
          ctx.fill();
        } else {
          const seed = (x * 13 + y * 17) % 10;
          if (x >= 16 && x <= 20) {
            ctx.fillStyle = seed > 5 ? '#24201c' : '#1f1c18';
          } else {
            ctx.fillStyle = seed > 6 ? '#1b1d16' : (seed > 3 ? '#191b15' : '#161713');
          }
          ctx.fill();

          ctx.strokeStyle = '#23201b';
          ctx.lineWidth = 0.6;
          ctx.stroke();

          if (seed === 7) {
            ctx.fillStyle = '#2b2a22';
            ctx.fillRect(scr.x - 4, scr.y - 2, 3, 2);
          } else if (seed === 2) {
            ctx.fillStyle = '#28241d';
            ctx.fillRect(scr.x + 3, scr.y + 1, 4, 3);
          }
        }
      }
    }
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

    const scale = ent.isBoss ? 1.7 : (ent.isElite ? 1.25 : 1.0);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

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
      this.drawPlayerWarrior(ctx, ent, world);
    } else {
      this.drawMonster(ctx, ent, scale);
    }

    const barW = Math.floor(34 * scale);
    const barH = 4;
    const barY = -42 * scale;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, barY, barW, barH);

    const hpRatio = Math.max(0, ent.stats.hp / ent.stats.maxHp);
    ctx.fillStyle = ent.isPlayer ? '#22c55e' : (ent.isBoss ? '#dc2626' : '#ea580c');
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

    ctx.font = ent.isBoss ? 'bold 12px "SimSun", "Songti SC", serif' : '11px "SimSun", "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = ent.isPlayer ? '#fef08a' : (ent.isBoss ? '#f87171' : (ent.isElite ? '#fde047' : '#e2e8f0'));
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(ent.name, 0, barY - 4);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawPlayerWarrior(ctx: CanvasRenderingContext2D, p: Entity, world: GameWorld): void {
    const isAttacking = p.state === 'attacking';
    const hasDragonBlade = (p.stats.maxDC >= 35);

    // 狂暴模式下：全身烈焰光环
    if (world.isBerserk) {
      ctx.save();
      ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.beginPath();
      ctx.arc(0, -20, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 披风
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(-10, -28);
    ctx.lineTo(10, -28);
    ctx.lineTo(12 + (p.direction > 3 ? 3 : -3), -4);
    ctx.lineTo(-12 + (p.direction > 3 ? 3 : -3), -4);
    ctx.closePath();
    ctx.fill();

    // 战神重铠
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-8, -26, 16, 18);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-6, -24, 12, 14);

    // 腿部
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-7, -8, 5, 8);
    ctx.fillRect(2, -8, 5, 8);

    // 战盔
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -32, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-2, -41, 4, 6);

    // 佩戴神兵
    ctx.save();
    ctx.translate(6, -20);
    if (isAttacking) {
      ctx.rotate(Math.PI / 3);
    }

    if (hasDragonBlade) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, 0, 4, 12);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(8, -2);
      ctx.lineTo(6, -28);
      ctx.lineTo(-4, -24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-2, 0, 4, 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-3, -22, 6, 22);
    }
    ctx.restore();
  }

  private drawMonster(ctx: CanvasRenderingContext2D, m: Entity, scale: number): void {
    if (m.name.includes('稻草人')) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-3, -28, 6, 28);
      ctx.fillRect(-14, -20, 28, 4);

      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.moveTo(-10, -22);
      ctx.lineTo(10, -22);
      ctx.lineTo(14, -6);
      ctx.lineTo(-14, -6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(-14, -28);
      ctx.lineTo(14, -28);
      ctx.lineTo(0, -38);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, -26, 2, 2);
      ctx.fillRect(2, -26, 2, 2);
    } else if (m.name.includes('猫')) {
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -14, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -24, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-7, -27); ctx.lineTo(-3, -34); ctx.lineTo(-1, -27);
      ctx.moveTo(1, -27); ctx.lineTo(3, -34); ctx.lineTo(7, -27);
      ctx.fill();

      ctx.fillStyle = '#71717a';
      ctx.fillRect(8, -30, 2, 28);
      ctx.fillRect(4, -30, 10, 3);
      ctx.fillRect(4, -34, 2, 4);
      ctx.fillRect(8, -34, 2, 4);
      ctx.fillRect(12, -34, 2, 4);
    } else if (m.name.includes('骷髅')) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-4, -22, 8, 14);
      ctx.fillRect(-5, -8, 3, 8);
      ctx.fillRect(2, -8, 3, 8);

      ctx.beginPath();
      ctx.arc(0, -28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(-3, -29, 2, 2);
      ctx.fillRect(1, -29, 2, 2);

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(-8, -16, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(7, -26, 3, 16);
    } else if (m.name.includes('野猪')) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(0, -18 * scale, 14 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -28 * scale, 9 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-3 * scale, -27 * scale, 6 * scale, 4 * scale);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-7 * scale, -28 * scale, 2 * scale, 5 * scale);
      ctx.fillRect(5 * scale, -28 * scale, 2 * scale, 5 * scale);

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(14 * scale, -20 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(0, -20 * scale, 15 * scale, 16 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, -32 * scale, 9 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.moveTo(-8 * scale, -36 * scale);
      ctx.lineTo(-18 * scale, -46 * scale);
      ctx.lineTo(-4 * scale, -38 * scale);
      ctx.moveTo(8 * scale, -36 * scale);
      ctx.lineTo(18 * scale, -46 * scale);
      ctx.lineTo(4 * scale, -38 * scale);
      ctx.fill();

      ctx.fillStyle = 'rgba(153, 27, 27, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-12 * scale, -28 * scale);
      ctx.lineTo(-28 * scale, -45 * scale);
      ctx.lineTo(-14 * scale, -12 * scale);
      ctx.moveTo(12 * scale, -28 * scale);
      ctx.lineTo(28 * scale, -45 * scale);
      ctx.lineTo(14 * scale, -12 * scale);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4 * scale, -34 * scale, 3 * scale, 2 * scale);
      ctx.fillRect(1 * scale, -34 * scale, 3 * scale, 2 * scale);
    }
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
