import { Direction8, Entity, GroundItem } from '../types/game';
import { GameWorld } from '../domain/GameWorld';
import { PlayerRenderer } from './renderers/PlayerRenderer';
import { MonsterRenderer } from './renderers/MonsterRenderer';
import { EnvironmentRenderer } from './renderers/EnvironmentRenderer';
import { EffectRenderer, SlashAnimation, BloodParticle } from './renderers/EffectRenderer';

type RenderItem = 
  | { type: 'ground_item'; depthY: number; item: GroundItem; renderPos: { x: number; y: number } }
  | { type: 'entity'; depthY: number; entity: Entity; posX: number; posY: number; isSelected: boolean }
  | { type: 'slash'; depthY: number; slash: SlashAnimation; pos: { x: number; y: number } };

export class IsometricRenderer {
  readonly TILE_WIDTH = 72;
  readonly TILE_HEIGHT = 36;

  private playerRenderer = new PlayerRenderer();
  private monsterRenderer = new MonsterRenderer();
  private environmentRenderer = new EnvironmentRenderer();
  private effectRenderer = new EffectRenderer();

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

  gridToScreen = (gx: number, gy: number): { x: number; y: number } => {
    return {
      x: (gx - gy) * (this.TILE_WIDTH / 2),
      y: (gx + gy) * (this.TILE_HEIGHT / 2)
    };
  };

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

    this.environmentRenderer.renderTiles(
      ctx,
      world,
      camX,
      camY,
      width,
      height,
      this.animFrame,
      this.TILE_WIDTH,
      this.TILE_HEIGHT,
      this.gridToScreen
    );

    this.environmentRenderer.renderAOEWarnings(
      ctx,
      world.aoeWarnings,
      this.animFrame,
      this.TILE_WIDTH,
      this.TILE_HEIGHT,
      this.gridToScreen
    );

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
        this.effectRenderer.renderGroundItem(ctx, obj.item, obj.renderPos, this.animFrame);
      } else if (obj.type === 'entity') {
        this.renderEntity(ctx, obj.entity, obj.posX, obj.posY, obj.isSelected, world);
      } else if (obj.type === 'slash') {
        this.effectRenderer.renderSlash(ctx, obj.slash, obj.pos);
      }
    }

    this.effectRenderer.renderDamagePopups(ctx, world.damagePopups, this.gridToScreen);

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
}
