import { Direction8, Entity, GroundItem } from '../types/game';
import { GameWorld } from '../domain/GameWorld';

interface SlashAnimation {
  gridX: number;
  gridY: number;
  dir: Direction8;
  isFire: boolean;
  progress: number;
  maxTicks: number;
}

export class IsometricRenderer {
  readonly TILE_WIDTH = 72;
  readonly TILE_HEIGHT = 36;

  private slashes: SlashAnimation[] = [];
  private animFrame = 0;

  /**
   * 网格坐标转换到世界像素坐标
   */
  gridToScreen(gx: number, gy: number): { x: number; y: number } {
    return {
      x: (gx - gy) * (this.TILE_WIDTH / 2),
      y: (gx + gy) * (this.TILE_HEIGHT / 2)
    };
  }

  /**
   * 屏幕点击坐标换算到网格坐标
   */
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

  /**
   * 触发刀光动画
   */
  addSlashVFX(gridPos: { x: number; y: number }, dir: Direction8, isFire: boolean, haste: number): void {
    // 攻速越快，刀光生命期越短 (基准 6 帧，最快 2 帧)
    const maxTicks = Math.max(2, Math.floor(6 * 100 / (100 + haste)));
    this.slashes.push({
      gridX: gridPos.x,
      gridY: gridPos.y,
      dir,
      isFire,
      progress: 0,
      maxTicks
    });
  }

  /**
   * 主渲染帧
   */
  render(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    width: number,
    height: number,
    selectedTargetId: string | null
  ): void {
    this.animFrame++;

    // 1. 清屏
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // 2. 相机平滑锁定玩家当前插值坐标
    const p = world.player;
    let pInterpX = p.gridPos.x;
    let pInterpY = p.gridPos.y;
    if (p.targetGridPos) {
      pInterpX += (p.targetGridPos.x - p.gridPos.x) * p.moveProgress;
      pInterpY += (p.targetGridPos.y - p.gridPos.y) * p.moveProgress;
    }
    const playerScreen = this.gridToScreen(pInterpX, pInterpY);
    const camX = playerScreen.x - width / 2;
    const camY = playerScreen.y - height / 2;

    ctx.save();
    ctx.translate(-camX, -camY);

    // 3. 绘制 2.5D 等轴测瓦片地图
    this.renderTiles(ctx, world, camX, camY, width, height);

    // 4. 准备深度排序对象池 (按深度 y 排序，实现遮挡关系)
    const renderList: Array<{
      type: 'ground_item' | 'entity' | 'obstacle' | 'slash';
      depthY: number;
      data: any;
    }> = [];

    // 地面掉落物
    for (const item of world.groundItems) {
      const pos = this.gridToScreen(item.gridPos.x, item.gridPos.y);
      renderList.push({
        type: 'ground_item',
        depthY: pos.y,
        data: item
      });
    }

    // 怪物与玩家实体
    const allEntities = [...world.monsters, world.player];
    for (const ent of allEntities) {
      if (ent.state === 'dead' && !ent.isPlayer) continue; // 死亡怪不渲染深度
      let gx = ent.gridPos.x;
      let gy = ent.gridPos.y;
      if (ent.targetGridPos) {
        gx += (ent.targetGridPos.x - ent.gridPos.x) * ent.moveProgress;
        gy += (ent.targetGridPos.y - ent.gridPos.y) * ent.moveProgress;
      }
      const pos = this.gridToScreen(gx, gy);
      renderList.push({
        type: 'entity',
        depthY: pos.y,
        data: { entity: ent, screenX: pos.x, screenY: pos.y }
      });
    }

    // 刀光动画
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i];
      slash.progress++;
      const pos = this.gridToScreen(slash.gridX, slash.gridY);
      renderList.push({
        type: 'slash',
        depthY: pos.y + 5,
        data: slash
      });
      if (slash.progress >= slash.maxTicks) {
        this.slashes.splice(i, 1);
      }
    }

    // 按深度升序绘制
    renderList.sort((a, b) => a.depthY - b.depthY);

    for (const item of renderList) {
      if (item.type === 'ground_item') {
        this.renderGroundItem(ctx, item.data);
      } else if (item.type === 'entity') {
        this.renderEntity(ctx, item.data.entity, item.data.screenX, item.data.screenY, selectedTargetId === item.data.entity.id);
      } else if (item.type === 'slash') {
        this.renderSlash(ctx, item.data);
      }
    }

    // 5. 绘制飘字 (最上层)
    this.renderDamagePopups(ctx, world.damagePopups);

    ctx.restore();
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

        // 简易视锥剔除
        if (scr.x + hw < camX - 50 || scr.x - hw > camX + w + 50 ||
            scr.y + hh < camY - 50 || scr.y - hh > camY + h + 50) {
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
          ctx.fillStyle = '#221d26';
          ctx.fill();
          ctx.strokeStyle = '#3d3444';
          ctx.lineWidth = 1;
          ctx.stroke();

          // 画石柱立体阴影
          ctx.fillStyle = '#17131b';
          ctx.fillRect(scr.x - 10, scr.y - 20, 20, 22);
          ctx.fillStyle = '#4c3f56';
          ctx.font = '12px serif';
          ctx.fillText('🪨', scr.x - 8, scr.y - 2);
        } else {
          // 交替暗色地砖纹理
          const alt = (x + y) % 2 === 0;
          ctx.fillStyle = alt ? '#141217' : '#18151c';
          ctx.fill();
          ctx.strokeStyle = '#28222e';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  private renderGroundItem(ctx: CanvasRenderingContext2D, drop: GroundItem): void {
    const pos = this.gridToScreen(drop.gridPos.x, drop.gridPos.y);

    // 1. 如果是极品装备 (品质 >= 1)，绘制冲天彩色光柱！
    if (drop.beamColor) {
      ctx.save();

      // 光柱底部扩散光晕
      const haloGrad = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 24);
      haloGrad.addColorStop(0, drop.beamColor);
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 冲天光柱柱身 (高达 180px)
      const beamGrad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y - 180);
      beamGrad.addColorStop(0, drop.beamColor);
      beamGrad.addColorStop(0.3, drop.beamColor);
      beamGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = beamGrad;
      ctx.globalAlpha = 0.65 + Math.sin(this.animFrame * 0.1) * 0.15;
      ctx.fillRect(pos.x - 6, pos.y - 180, 12, 180);

      // 光柱中芯高亮细线
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(pos.x - 1.5, pos.y - 180, 3, 180);

      ctx.restore();
    }

    // 2. 地面战利品图标与名称
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText(drop.item.icon || '📦', pos.x, pos.y + 4);

    // 悬浮名称
    ctx.font = '10px sans-serif';
    ctx.fillStyle = drop.beamColor || '#cbd5e1';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(drop.item.name, pos.x, pos.y + 16);
    ctx.shadowBlur = 0;
  }

  private renderEntity(
    ctx: CanvasRenderingContext2D, 
    ent: Entity, 
    sx: number, 
    sy: number, 
    isSelected: boolean
  ): void {
    const isPlayer = ent.isPlayer;
    const isBoss = ent.isBoss;
    const scale = isBoss ? 1.6 : 1.0;

    ctx.save();
    ctx.translate(sx, sy);

    // 1. 脚底影子
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 选中脚底光圈
    if (isSelected) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. 实体身体绘制
    const bodyY = -18 * scale;

    if (isPlayer) {
      // 玩家角色光环 (高战力金辉)
      if (ent.stats.combatPower > 300) {
        ctx.fillStyle = 'rgba(243, 194, 88, 0.15)';
        ctx.beginPath();
        ctx.arc(0, bodyY, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      // 玩家披风与武者身躯
      ctx.fillStyle = '#dc2626'; // 赤红披风
      ctx.fillRect(-10, bodyY - 14, 20, 26);

      ctx.fillStyle = '#eab308'; // 黄金盔甲
      ctx.fillRect(-8, bodyY - 12, 16, 22);

      // 头盔与朝向眼眸
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, bodyY - 18, 7, 0, Math.PI * 2);
      ctx.fill();

      // 神兵屠龙刀 (持在身侧)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, bodyY - 16, 4, 28);
    } else {
      // 怪物身体
      ctx.fillStyle = ent.color || '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, bodyY, 14 * scale, 0, Math.PI * 2);
      ctx.fill();

      // 怪物图标
      ctx.font = `${Math.floor(20 * scale)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ent.icon || '👾', 0, bodyY + 7 * scale);
    }

    // 4. 头顶血条与名字
    const barW = 36 * scale;
    const barH = 4;
    const barY = bodyY - (isPlayer ? 30 : 22 * scale);

    // 血条底色
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-barW / 2, barY, barW, barH);

    // 当前生命
    const hpRatio = Math.max(0, ent.stats.hp / ent.stats.maxHp);
    ctx.fillStyle = isPlayer ? '#22c55e' : (isBoss ? '#dc2626' : '#f59e0b');
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

    // 头顶名字
    ctx.font = isBoss ? 'bold 12px sans-serif' : '11px sans-serif';
    ctx.fillStyle = isPlayer ? '#fde047' : (isBoss ? '#ef4444' : '#f1f5f9');
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(ent.name, 0, barY - 4);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private renderSlash(ctx: CanvasRenderingContext2D, slash: SlashAnimation): void {
    const pos = this.gridToScreen(slash.gridX, slash.gridY);
    ctx.save();
    ctx.translate(pos.x, pos.y - 15);

    // 8 方向旋转弧度 (0:北, 2:东, 4:南, 6:西)
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

    const baseAngle = angleMap[slash.dir];
    ctx.rotate(baseAngle);

    // 弧度随进度扫过
    const sweepProgress = slash.progress / slash.maxTicks;
    const sweepAngle = (sweepProgress - 0.5) * (Math.PI / 2);

    ctx.beginPath();
    ctx.arc(15, 0, 32, sweepAngle - 0.6, sweepAngle + 0.6);
    ctx.strokeStyle = slash.isFire ? '#f97316' : '#38bdf8';
    ctx.lineWidth = slash.isFire ? 6 : 4;
    ctx.shadowColor = slash.isFire ? '#ea580c' : '#0284c7';
    ctx.shadowBlur = 12;
    ctx.stroke();

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
        // 暴击大字：加粗、带红芒外发光与缩放感
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#b91c1c';
        ctx.shadowBlur = 12;
        ctx.fillText(p.text, pos.x, pos.y - 45);
      } else if (p.isHeal) {
        // 治疗绿字
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.fillText(p.text, pos.x, pos.y - 35);
      } else {
        // 普通伤害
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(p.text, pos.x, pos.y - 35);
      }

      ctx.restore();
    }
  }
}
