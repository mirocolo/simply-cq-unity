import { Entity } from "../../types/game";
import type { GameWorld } from "../../domain/GameWorld";
import { getActiveResonance } from "../../domain/definitions/enhancement";
import { roundRect } from "./renderUtils";

export class PlayerRenderer {
  animFrame: number = 0;

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | number[] = 2
  ): void {
    roundRect(ctx, x, y, w, h, radius);
  }

  drawPlayerWarrior(ctx: CanvasRenderingContext2D, p: Entity, world: GameWorld, scale: number = 1.85, animFrame: number = 0): void {
    this.animFrame = animFrame;
    ctx.save();
    ctx.scale(scale, scale);

    const isAttacking = p.state === 'attacking';
    const isWalking = p.state === 'walking';
    const hasDragonBlade = p.stats.maxDC >= 35;
    const hasJudgement = p.stats.maxDC >= 30 && !hasDragonBlade;

    // 呼吸律动与步态动画 (60 FPS 柔和波动)
    const bobY = Math.sin(this.animFrame * 0.1) * 1.5;
    const walkSwing = isWalking ? Math.sin(this.animFrame * 0.3) * 3 : 0;

    // 无敌金身庇护光罩 (Invincibility Shield)
    if (p.invincibleTicks && p.invincibleTicks > 0) {
      ctx.save();
      const pulse = Math.sin(this.animFrame * 0.12) * 3;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -20 + bobY, 30 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 内层旋转护体符文环
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, -20 + bobY, 25 + pulse, (this.animFrame * 0.05) % (Math.PI * 2), (this.animFrame * 0.05) % (Math.PI * 2) + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 护体神盾光罩
    if (p.shieldAegisTicks && p.shieldAegisTicks > 0) {
      ctx.save();
      const pulse = Math.sin(this.animFrame * 0.15) * 2;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -20 + bobY, 28 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 狂暴模式下：全身烈焰光环
    if (world.isBerserk) {
      ctx.save();
      const firePulse = Math.sin(this.animFrame * 0.2) * 4;
      const fireGrad = ctx.createRadialGradient(0, -20 + bobY, 6, 0, -20 + bobY, 32 + firePulse);
      fireGrad.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
      fireGrad.addColorStop(0.7, 'rgba(234, 88, 12, 0.2)');
      fireGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(0, -20 + bobY, 32 + firePulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 全身强化共鸣神威光环 (+7/+10/+13/+15)
    const resonance = getActiveResonance(world.slotEnhancements);
    if (resonance) {
      ctx.save();
      const pulse = Math.sin(this.animFrame * 0.08) * 3;
      const resGrad = ctx.createRadialGradient(0, -20 + bobY, 4, 0, -20 + bobY, 34 + pulse);
      resGrad.addColorStop(0, resonance.glowColor);
      resGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = resGrad;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(0, -20 + bobY, 34 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = resonance.glowColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = resonance.glowColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // 朝向判定：5,6,7(西南/西/西北) 朝左翻转；0,1(北/东北) 朝上背面
    const facingLeft = p.direction >= 5 && p.direction <= 7;
    const facingAway = p.direction === 0 || p.direction === 1 || p.direction === 7;

    ctx.save();
    if (facingLeft) {
      ctx.scale(-1, 1);
    }

    // 1. 战神披风 (Flowing Cloak)
    const capeWave = Math.sin(this.animFrame * 0.15 + (isWalking ? this.animFrame * 0.2 : 0)) * 4;
    const capeGrad = ctx.createLinearGradient(-10, -26 + bobY, 14 + capeWave, 0);
    capeGrad.addColorStop(0, '#7f1d1d');
    capeGrad.addColorStop(0.5, '#dc2626');
    capeGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(-7, -26 + bobY);
    ctx.lineTo(7, -26 + bobY);
    ctx.bezierCurveTo(11, -14 + bobY, 13 + capeWave, -5, 10 + capeWave, 0);
    ctx.lineTo(-8 + capeWave * 0.6, 0);
    ctx.bezierCurveTo(-11 + capeWave * 0.5, -6, -9, -15 + bobY, -7, -26 + bobY);
    ctx.closePath();
    ctx.fill();
    // 披风金丝滚边
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8 + capeWave * 0.6, 0);
    ctx.lineTo(10 + capeWave, 0);
    ctx.stroke();

    // 2. 战靴与腿部 (Armored Sabatons & Greaves)
    const lLegY = bobY + (isWalking ? walkSwing : 0);
    const rLegY = bobY - (isWalking ? walkSwing : 0);
    const legGrad = ctx.createLinearGradient(-6, -12, -2, 0);
    legGrad.addColorStop(0, '#1e293b');
    legGrad.addColorStop(0.6, '#334155');
    legGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    this.roundRect(ctx, -6, -11 + lLegY, 4.5, 11, 2);
    ctx.fill();
    // 左膝黄金护膝
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-6, -8 + lLegY, 4.5, 2.5);

    // 右腿
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    this.roundRect(ctx, 1.5, -11 + rLegY, 4.5, 11, 2);
    ctx.fill();
    // 右膝黄金护膝
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(1.5, -8 + rLegY, 4.5, 2.5);

    // 3. 重装金鳞胸甲 (Heavy Gold/Bronze Breastplate)
    const armorGrad = ctx.createLinearGradient(-8, -26 + bobY, 8, -10 + bobY);
    armorGrad.addColorStop(0, '#92400e');
    armorGrad.addColorStop(0.3, '#d97706');
    armorGrad.addColorStop(0.7, '#fbbf24');
    armorGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    this.roundRect(ctx, -8, -26 + bobY, 16, 17, 3);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 胸前龙鳞纹与核心赤血魔晶 (Heart Ruby Gem)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-5, -23 + bobY); ctx.lineTo(0, -18 + bobY); ctx.lineTo(5, -23 + bobY);
    ctx.lineTo(0, -26 + bobY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, -21 + bobY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef2f2';
    ctx.beginPath();
    ctx.arc(-0.8, -21.8 + bobY, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // 黄金兽面腰带扣 (Lion Buckle Belt)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-8, -12 + bobY, 16, 3.5);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -10.5 + bobY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 4. 战神龙首护肩 (Spiked Pauldrons)
    const pauldronGrad = ctx.createLinearGradient(-12, -28 + bobY, 12, -20 + bobY);
    pauldronGrad.addColorStop(0, '#d97706');
    pauldronGrad.addColorStop(0.5, '#fde047');
    pauldronGrad.addColorStop(1, '#92400e');
    // 左肩甲
    ctx.fillStyle = pauldronGrad;
    ctx.beginPath();
    ctx.moveTo(-7, -27 + bobY);
    ctx.lineTo(-12, -29 + bobY);
    ctx.lineTo(-13, -22 + bobY);
    ctx.lineTo(-7, -21 + bobY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 右肩甲
    ctx.fillStyle = pauldronGrad;
    ctx.beginPath();
    ctx.moveTo(7, -27 + bobY);
    ctx.lineTo(12, -29 + bobY);
    ctx.lineTo(13, -22 + bobY);
    ctx.lineTo(7, -21 + bobY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 5. 战神翼盔与面甲 (Winged Knight Helmet & Crest)
    const helmGrad = ctx.createLinearGradient(-7, -37 + bobY, 7, -25 + bobY);
    helmGrad.addColorStop(0, '#f59e0b');
    helmGrad.addColorStop(0.5, '#fef08a');
    helmGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.arc(0, -31 + bobY, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 面部面甲与凝视视线 (Visor Slit & Eyes)
    if (!facingAway) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      this.roundRect(ctx, -4, -32 + bobY, 8, 3, 1);
      ctx.fill();
      // 锐利青蓝/黄金神目
      ctx.fillStyle = world.isBerserk ? '#f97316' : '#38bdf8';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 4;
      ctx.fillRect(-2.5, -31.5 + bobY, 2, 1.5);
      ctx.fillRect(0.8, -31.5 + bobY, 2, 1.5);
      ctx.shadowBlur = 0;
    }

    // 头盔烈焰红羽红缨 (Crimson Plume Crest)
    const plumeWave = Math.sin(this.animFrame * 0.12) * 2;
    const plumeGrad = ctx.createLinearGradient(0, -43 + bobY, -8, -35 + bobY);
    plumeGrad.addColorStop(0, '#ef4444');
    plumeGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.moveTo(0, -37 + bobY);
    ctx.bezierCurveTo(-2, -43 + bobY, -7 + plumeWave, -42 + bobY, -9 + plumeWave, -35 + bobY);
    ctx.bezierCurveTo(-6, -35 + bobY, -2, -36 + bobY, 0, -37 + bobY);
    ctx.closePath();
    ctx.fill();

    // 6. 左手玄武重盾 (Offhand Shield)
    ctx.save();
    ctx.translate(-8, -17 + bobY);
    const shieldGrad = ctx.createLinearGradient(-5, -7, 5, 7);
    shieldGrad.addColorStop(0, '#1e293b');
    shieldGrad.addColorStop(0.5, '#475569');
    shieldGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 9);
    ctx.lineTo(-4, 5);
    ctx.lineTo(-5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 盾心金十字
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -0.8, 6, 1.6);
    ctx.fillRect(-0.8, -4, 1.6, 8);
    ctx.restore();

    // 7. 右手佩戴神兵利器 (Mainhand Weapon - 昂扬外指持刃，彻底消除对胸甲与面甲遮挡)
    ctx.save();
    ctx.translate(9, -15 + bobY);

    if (isAttacking) {
      ctx.rotate(Math.PI / 2.6);
    } else {
      ctx.rotate(Math.PI * 0.22 + Math.sin(this.animFrame * 0.08) * 0.04);
    }

    const weaponLvl = world.slotEnhancements['weapon'] || 0;
    if (weaponLvl >= 7) {
      const glowCol = weaponLvl >= 13 ? '#ef4444' : (weaponLvl >= 10 ? '#f59e0b' : '#38bdf8');
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 10 + weaponLvl;
    }

    if (hasDragonBlade) {
      // 屠龙宝刀 (The Dragon Slayer - 巨型玄铁重刃，背生龙脊，炽热血槽)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, 2, 4, 11);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 13, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // 金龙吞口
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-4, 0, 8, 3.5);
      // 宽刃玄铁刀身
      const bladeGrad = ctx.createLinearGradient(-5, 0, 7, -30);
      bladeGrad.addColorStop(0, '#1c1917');
      bladeGrad.addColorStop(0.5, '#44403c');
      bladeGrad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(8, -1);
      ctx.lineTo(6, -32);
      ctx.lineTo(-4, -28);
      ctx.closePath();
      ctx.fill();
      // 龙脊背刺
      ctx.fillStyle = '#78716c';
      for (let s = 0; s < 4; s++) {
        const sy = -6 - s * 6;
        ctx.beginPath();
        ctx.moveTo(-4, sy); ctx.lineTo(-8, sy - 2); ctx.lineTo(-4, sy - 4);
        ctx.closePath();
        ctx.fill();
      }
      // 刀身炽烈熔岩符文血槽
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(1, -2); ctx.lineTo(1, -26);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // 刃口金芒
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, -1); ctx.lineTo(6, -32);
      ctx.stroke();
    } else if (hasJudgement) {
      // 裁决之杖 (Judgement Staff - 沉重玄铁六棱重棒，精钢符文箍)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-2, 3, 4, 10);
      const maceGrad = ctx.createLinearGradient(-5, 0, 5, -28);
      maceGrad.addColorStop(0, '#1e293b');
      maceGrad.addColorStop(0.5, '#64748b');
      maceGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = maceGrad;
      ctx.beginPath();
      this.roundRect(ctx, -4.5, -28, 9, 29, 2);
      ctx.fill();
      // 金箍强化环
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-5, -26, 10, 3);
      ctx.fillRect(-5, -15, 10, 2.5);
      ctx.fillRect(-5, -4, 10, 3);
    } else {
      // 精炼钢剑 / 井中月 (Steel Broadsword)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1.5, 2, 3, 7);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-4, 0, 8, 2); // 护手
      const swordGrad = ctx.createLinearGradient(-3, 0, 3, -24);
      swordGrad.addColorStop(0, '#94a3b8');
      swordGrad.addColorStop(0.5, '#f8fafc');
      swordGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = swordGrad;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(3, 0);
      ctx.lineTo(2.5, -22);
      ctx.lineTo(0, -26);
      ctx.lineTo(-2.5, -22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -23);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // 恢复镜像与朝向
    ctx.restore(); // 恢复人物全身缩放
  }

}
