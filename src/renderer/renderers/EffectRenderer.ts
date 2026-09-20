import { Direction8, GroundItem } from '../../types/game';

export interface SlashAnimation {
  gridX: number;
  gridY: number;
  dir: Direction8;
  isFire: boolean;
  isPhantom?: boolean;
  progress: number;
  maxTicks: number;
}

export interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class EffectRenderer {
  renderGroundItem(
    ctx: CanvasRenderingContext2D,
    drop: GroundItem,
    pos: { x: number; y: number },
    animFrame: number
  ): void {
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
      ctx.globalAlpha = 0.7 + Math.sin(animFrame * 0.12) * 0.2;
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

  renderSlash(ctx: CanvasRenderingContext2D, slash: SlashAnimation, pos: { x: number; y: number }): void {
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

  renderDamagePopups(
    ctx: CanvasRenderingContext2D,
    popups: any[],
    gridToScreen: (gx: number, gy: number) => { x: number; y: number }
  ): void {
    for (const p of popups) {
      const pos = gridToScreen(p.worldX, p.worldY);
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
