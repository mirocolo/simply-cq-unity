import { Entity } from "../../types/game";
import { roundRect } from "./renderUtils";

export class MonsterRenderer {
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

  drawMonster(ctx: CanvasRenderingContext2D, m: Entity, scale: number, animFrame: number = 0): void {
    this.animFrame = animFrame;
    ctx.save();
    // 朝向：5,6,7朝左，做水平镜像翻转
    const facingLeft = m.direction >= 5 && m.direction <= 7;
    if (facingLeft) {
      ctx.scale(-1, 1);
    }
    ctx.scale(scale, scale);

    const name = m.name;
    const tId = m.templateId || '';

    if (m.isGoblin || name.includes('地精') || tId.includes('goblin')) {
      this.drawTreasureGoblin(ctx, m);
    } else if (name.includes('稻草人') || tId.includes('scarecrow')) {
      this.drawScarecrow(ctx, m);
    } else if (name.includes('猫') || tId.includes('cat')) {
      this.drawCat(ctx, m);
    } else if (name.includes('蜘蛛') || tId.includes('spider')) {
      this.drawSpider(ctx, m);
    } else if (name.includes('骷髅') || name.includes('骨魔') || tId.includes('skeleton')) {
      this.drawSkeleton(ctx, m);
    } else if (name.includes('尸') || name.includes('僵尸') || name.includes('黄泉') || tId.includes('zombie') || tId.includes('huangquan')) {
      this.drawZombie(ctx, m);
    } else if (name.includes('野猪') || name.includes('猪') || tId.includes('white_pig')) {
      this.drawWhitePig(ctx, m);
    } else if (name.includes('沃玛') || tId.includes('wooma')) {
      this.drawWoomaLord(ctx, m);
    } else if (name.includes('祖玛') || tId.includes('zuma')) {
      this.drawZumaLord(ctx, m);
    } else if (name.includes('赤月') || name.includes('金刚') || name.includes('血魔') || tId.includes('red_moon')) {
      this.drawRedMoon(ctx, m);
    } else if (name.includes('牛魔') || tId.includes('niumo')) {
      this.drawOxDemonKing(ctx, m);
    } else if (name.includes('魔龙') || name.includes('火龙') || tId.includes('molong') || tId.includes('huolong')) {
      this.drawDragonLord(ctx, m);
    } else {
      this.drawDemonWarlord(ctx, m);
    }

    ctx.restore();
  }

  private drawScarecrow(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const sway = Math.sin(this.animFrame * 0.08) * 0.04;
    ctx.rotate(sway);

    // 竖直与横向十字枯木架
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2.5, -28, 5, 28);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-15, -20, 30, 4);

    // 麻绳捆扎圈
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-3, -21, 6, 2);
    ctx.fillRect(-14, -21, 2, 6);
    ctx.fillRect(12, -21, 2, 6);

    // 破烂粗麻布衣服 (Patchwork Tunic)
    const tunicGrad = ctx.createLinearGradient(-10, -22, 10, -6);
    tunicGrad.addColorStop(0, '#a16207');
    tunicGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = tunicGrad;
    ctx.beginPath();
    ctx.moveTo(-11, -22);
    ctx.lineTo(11, -22);
    ctx.lineTo(13, -7);
    ctx.lineTo(8, -5);
    ctx.lineTo(3, -7);
    ctx.lineTo(-2, -5);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-13, -6);
    ctx.closePath();
    ctx.fill();

    // 补丁与十字缝线
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(-7, -16, 5, 5);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4.5, -16); ctx.lineTo(-4.5, -11);
    ctx.moveTo(-7, -13.5); ctx.lineTo(-2, -13.5);
    ctx.stroke();

    // 炸出的凌乱金黄稻草 (Straw Tufts)
    ctx.fillStyle = '#eab308';
    // 袖口炸草
    ctx.beginPath();
    ctx.moveTo(-14, -20); ctx.lineTo(-19, -23); ctx.lineTo(-15, -17); ctx.lineTo(-20, -18); ctx.lineTo(-14, -16);
    ctx.moveTo(14, -20); ctx.lineTo(19, -23); ctx.lineTo(15, -17); ctx.lineTo(20, -18); ctx.lineTo(14, -16);
    // 裙摆炸草
    ctx.moveTo(-10, -6); ctx.lineTo(-12, 0); ctx.lineTo(-6, -6);
    ctx.moveTo(-2, -5); ctx.lineTo(0, 1); ctx.lineTo(4, -6);
    ctx.moveTo(8, -5); ctx.lineTo(11, 0); ctx.lineTo(12, -6);
    ctx.fill();

    // 破斗笠帽子 (Conical Straw Hat)
    const hatGrad = ctx.createLinearGradient(-16, -26, 16, -37);
    hatGrad.addColorStop(0, '#a16207');
    hatGrad.addColorStop(0.5, '#eab308');
    hatGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(-16, -26);
    ctx.lineTo(16, -26);
    ctx.lineTo(0, -38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 帽檐深黑阴影与猩红纽扣魔眼 (Ember Red Eyes)
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(0, -25, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-3.5, -25, 1.8, 0, Math.PI * 2);
    ctx.arc(3.5, -25, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 手中残破农用铁叉 (Rusty Pitchfork)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(11, -30, 2.5, 26);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, -32, 9, 2.5);
    ctx.fillRect(8, -37, 2, 5);
    ctx.fillRect(11.5, -38, 2, 6);
    ctx.fillRect(15, -37, 2, 5);
  }

  private drawCat(ctx: CanvasRenderingContext2D, m: Entity): void {
    const isHook = m.name.includes('多钩') || (m.templateId && m.templateId.includes('hook'));
    const bob = Math.sin(this.animFrame * 0.12) * 1.2;
    const tailWave = Math.sin(this.animFrame * 0.15) * 3;

    // 细长猫尾 (Curling Striped Tail)
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -10 + bob);
    ctx.bezierCurveTo(-14, -12 + bob, -18 + tailWave, -4, -14 + tailWave, 2);
    ctx.stroke();

    // 矫健猫躯 (Lean Feline Body)
    const bodyGrad = ctx.createLinearGradient(-7, -22 + bob, 7, -6 + bob);
    bodyGrad.addColorStop(0, '#f59e0b');
    bodyGrad.addColorStop(0.5, '#d97706');
    bodyGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -14 + bob, 7.5, 11, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 虎斑纹理 (Tiger Stripes)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, -18 + bob, 4, 1.5);
    ctx.fillRect(2, -16 + bob, 4, 1.5);
    ctx.fillRect(-5, -12 + bob, 4, 1.5);

    // 爪子与脚 (Paws)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-5, -4 + bob, 3.5, 4);
    ctx.fillRect(1.5, -4 + bob, 3.5, 4);

    // 凶残猫头与尖耳 (Fierce Cat Head & Ears)
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(0, -25 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    // 尖尖猫耳与粉色耳廓
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-6, -28 + bob); ctx.lineTo(-4, -36 + bob); ctx.lineTo(-1, -29 + bob);
    ctx.moveTo(1, -29 + bob); ctx.lineTo(4, -36 + bob); ctx.lineTo(6, -28 + bob);
    ctx.fill();
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-5, -29 + bob); ctx.lineTo(-4, -34 + bob); ctx.lineTo(-2, -30 + bob);
    ctx.moveTo(2, -30 + bob); ctx.lineTo(4, -34 + bob); ctx.lineTo(5, -29 + bob);
    ctx.fill();

    // 白色吻部与猫鼻
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(0, -23 + bob, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-1, -24.5 + bob, 2, 1.5);

    // 凶狠琥珀猫眼与竖瞳
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-2.8, -26 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(2.8, -26 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillRect(-3, -27 + bob, 0.8, 2);
    ctx.fillRect(2.6, -27 + bob, 0.8, 2);

    // 獠牙
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-2, -22 + bob); ctx.lineTo(-1.5, -20 + bob); ctx.lineTo(-1, -22 + bob);
    ctx.moveTo(1, -22 + bob); ctx.lineTo(1.5, -20 + bob); ctx.lineTo(2, -22 + bob);
    ctx.fill();

    // 武器：钉耙或血腥双钩 (Weapon: Rake or Twin Hooks)
    if (isHook) {
      // 多钩猫：双曲屠夫铁钩
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(7, -15 + bob); ctx.lineTo(11, -12 + bob); ctx.bezierCurveTo(14, -8 + bob, 9, -5 + bob, 7, -8 + bob);
      ctx.moveTo(-7, -15 + bob); ctx.lineTo(-11, -12 + bob); ctx.bezierCurveTo(-14, -8 + bob, -9, -5 + bob, -7, -8 + bob);
      ctx.stroke();
    } else {
      // 钉耙猫：粗长巨型铁钉耙
      ctx.fillStyle = '#78350f';
      ctx.fillRect(7, -33 + bob, 3, 31);
      ctx.fillStyle = '#475569';
      ctx.fillRect(3, -34 + bob, 12, 3.5);
      // 4根弯曲铁齿
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(3, -39 + bob, 2, 5);
      ctx.fillRect(6.5, -39 + bob, 2, 5);
      ctx.fillRect(10, -39 + bob, 2, 5);
      ctx.fillRect(13.5, -39 + bob, 2, 5);
      // 齿尖血迹
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(3, -39 + bob, 2, 2);
      ctx.fillRect(13.5, -39 + bob, 2, 2);
    }
  }

  private drawSpider(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const pulse = Math.sin(this.animFrame * 0.12) * 1;

    // 8条多关节步足 (8 Articulated Spider Legs)
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const legAngle = (i * 0.3 - 0.45) * side;
        const ly = -12 + i * 3.5;
        const kx = Math.cos(legAngle) * 20 * side;
        const ky = -20 + i * 3;
        const tx = Math.cos(legAngle) * 22 * side;
        const ty = 2 + i * 2;
        ctx.beginPath();
        ctx.moveTo(side * 5, ly);
        ctx.lineTo(kx, ky);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }

    // 肥硕膨胀后腹部 (Bulbous Venom Abdomen)
    const abdGrad = ctx.createRadialGradient(0, -18, 3, 0, -18, 12 + pulse);
    abdGrad.addColorStop(0, '#16a34a');
    abdGrad.addColorStop(0.6, '#14532d');
    abdGrad.addColorStop(1, '#052e16');
    ctx.fillStyle = abdGrad;
    ctx.beginPath();
    ctx.ellipse(0, -18, 11 + pulse, 9 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 毒性黄色骷髅警示花纹 (Yellow Skull Warning Pattern)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -19, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-1.5, -16, 3, 2);
    ctx.fillStyle = '#052e16';
    ctx.fillRect(-1.2, -19.5, 1, 1);
    ctx.fillRect(0.2, -19.5, 1, 1);

    // 头胸部与多对复眼 (Cephalothorax & Ruby Eyes)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    // 6只晶亮猩红复眼
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(-2.5, -9, 1.2, 0, Math.PI * 2);
    ctx.arc(2.5, -9, 1.2, 0, Math.PI * 2);
    ctx.arc(-1, -7.5, 1, 0, Math.PI * 2);
    ctx.arc(1, -7.5, 1, 0, Math.PI * 2);
    ctx.arc(-4, -8, 0.8, 0, Math.PI * 2);
    ctx.arc(4, -8, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 滴落毒液的双螯肢 (Dripping Poison Fangs)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(-3, -6); ctx.lineTo(-4, -1); ctx.lineTo(-1.5, -4);
    ctx.moveTo(3, -6); ctx.lineTo(4, -1); ctx.lineTo(1.5, -4);
    ctx.fill();
  }

  private drawSkeleton(ctx: CanvasRenderingContext2D, m: Entity): void {
    const isElf = m.name.includes('精灵') || m.name.includes('统领');
    const bob = Math.sin(this.animFrame * 0.1) * 1.2;

    const boneColor = isElf ? '#dc2626' : '#e2e8f0';
    const boneDark = isElf ? '#991b1b' : '#94a3b8';
    const soulEyeColor = isElf ? '#f87171' : '#38bdf8';

    // 骨骼双腿 (Leg Bones)
    ctx.fillStyle = boneDark;
    ctx.fillRect(-5, -11 + bob, 2.5, 11);
    ctx.fillRect(2.5, -11 + bob, 2.5, 11);
    ctx.fillStyle = boneColor;
    ctx.fillRect(-5.5, -6 + bob, 3.5, 2);
    ctx.fillRect(2, -6 + bob, 3.5, 2);

    // 脊柱与骨盆 (Spine & Pelvis)
    ctx.fillStyle = boneDark;
    ctx.fillRect(-4, -13 + bob, 8, 3);
    ctx.fillRect(-1.5, -23 + bob, 3, 11);

    // 根根分明的肋骨胸廓 (Ribcage)
    ctx.fillStyle = boneColor;
    ctx.fillRect(-6, -21 + bob, 12, 2);
    ctx.fillRect(-7, -18 + bob, 14, 2);
    ctx.fillRect(-6, -15 + bob, 12, 2);

    // 骷髅头颅 (Skull)
    ctx.fillStyle = boneColor;
    ctx.beginPath();
    ctx.arc(0, -28 + bob, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // 下颌骨与牙齿
    ctx.fillStyle = boneDark;
    ctx.fillRect(-3.5, -23 + bob, 7, 3);
    ctx.fillStyle = boneColor;
    for (let t = -3; t <= 2; t += 1.5) {
      ctx.fillRect(t, -23 + bob, 1, 2.5);
    }

    // 深邃眼眶与幽蓝魂火 (Cyan Soul Fire)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-2.5, -28 + bob, 2, 0, Math.PI * 2);
    ctx.arc(2.5, -28 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = soulEyeColor;
    ctx.shadowColor = soulEyeColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-2.5, -28 + bob, 1.2, 0, Math.PI * 2);
    ctx.arc(2.5, -28 + bob, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 生锈破铁盔 (Rusty Horned Cap)
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, -31 + bob, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-5, -31 + bob); ctx.lineTo(-9, -35 + bob); ctx.lineTo(-4, -33 + bob);
    ctx.moveTo(5, -31 + bob); ctx.lineTo(9, -35 + bob); ctx.lineTo(4, -33 + bob);
    ctx.fill();

    // 武器：左手生锈圆盾，右手残破战刃 (Shield & Blade)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(-8, -17 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#eab308';
    ctx.beginPath(); ctx.arc(-8, -17 + bob, 2, 0, Math.PI * 2); ctx.fill();

    // 右手白骨/古铁阔刀
    ctx.fillStyle = isElf ? '#ef4444' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(6, -15 + bob);
    ctx.lineTo(9, -15 + bob);
    ctx.lineTo(8, -32 + bob);
    ctx.lineTo(5, -30 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  private drawZombie(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.08) * 1.5;

    // 升腾的尸毒瘴气 (Purple Poison Miasma)
    ctx.save();
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, -5 + bob, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 僵直双腿 (Decaying Legs)
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -12 + bob, 4.5, 12);
    ctx.fillRect(1.5, -12 + bob, 4.5, 12);

    // 破烂下摆 (Tattered Shroud)
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(-8, -16 + bob); ctx.lineTo(8, -16 + bob);
    ctx.lineTo(9, -8 + bob); ctx.lineTo(4, -11 + bob); ctx.lineTo(-1, -7 + bob); ctx.lineTo(-8, -10 + bob);
    ctx.closePath();
    ctx.fill();

    // 腐烂青灰躯干与剧毒紫脉 (Necrotic Torso with Glowing Purple Veins)
    const torsoGrad = ctx.createLinearGradient(-9, -30 + bob, 9, -14 + bob);
    torsoGrad.addColorStop(0, '#475569');
    torsoGrad.addColorStop(0.5, '#3f6212');
    torsoGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    this.roundRect(ctx, -9, -29 + bob, 18, 17, 3);
    ctx.fill();

    // 剧毒紫脉
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(-5, -25 + bob); ctx.lineTo(-1, -21 + bob); ctx.lineTo(3, -24 + bob); ctx.lineTo(5, -18 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 粗重锈铁枷锁与断链 (Heavy Iron Collar & Broken Chains)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -29 + bob, 20, 4);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -27 + bob); ctx.lineTo(-11, -18 + bob); ctx.lineTo(-8, -10 + bob);
    ctx.moveTo(8, -27 + bob); ctx.lineTo(11, -18 + bob); ctx.lineTo(9, -9 + bob);
    ctx.stroke();

    // 狰狞青灰尸头 (Ghastly Zombie Head)
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.arc(0, -35 + bob, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // 枯槁长发
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(-7, -37 + bob); ctx.lineTo(-9, -25 + bob); ctx.lineTo(-4, -30 + bob);
    ctx.moveTo(7, -37 + bob); ctx.lineTo(9, -25 + bob); ctx.lineTo(4, -30 + bob);
    ctx.fill();

    // 恶毒黄绿凶目与血盆大口
    ctx.fillStyle = '#bef264';
    ctx.shadowColor = '#84cc16';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-2.8, -35 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(2.8, -35 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -30 + bob, 3, 0, Math.PI);
    ctx.fill();
  }

  private drawWhitePig(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.1) * 1.5;

    // 粗壮猪蹄 (Chunky Hooves)
    ctx.fillStyle = '#334155';
    ctx.fillRect(-10, -10 + bob, 6, 10);
    ctx.fillRect(4, -10 + bob, 6, 10);

    // 肥硕庞大的白猪白肉肚腩 (Massive Corpulent Body)
    const bodyGrad = ctx.createRadialGradient(0, -18 + bob, 4, 0, -18 + bob, 18);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.6, '#fce7f3');
    bodyGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -18 + bob, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 交叉铆钉重装皮甲 (Studded Leather Harness)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-12, -26 + bob); ctx.lineTo(12, -10 + bob); ctx.lineTo(10, -8 + bob); ctx.lineTo(-14, -24 + bob);
    ctx.moveTo(12, -26 + bob); ctx.lineTo(-12, -10 + bob); ctx.lineTo(-10, -8 + bob); ctx.lineTo(14, -24 + bob);
    ctx.fill();
    // 护心银骷髅徽章
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -17 + bob, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 巨大凶悍猪头 (Porcine Head)
    ctx.fillStyle = '#fce7f3';
    ctx.beginPath();
    ctx.arc(0, -28 + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 煽动的大猪耳朵 (Floppy Ears)
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-8, -32 + bob); ctx.lineTo(-14, -36 + bob); ctx.lineTo(-9, -26 + bob);
    ctx.moveTo(8, -32 + bob); ctx.lineTo(14, -36 + bob); ctx.lineTo(9, -26 + bob);
    ctx.fill();

    // 肥厚猪鼻与鼻孔 (Snout & Nostrils)
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.ellipse(0, -27 + bob, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#881337';
    ctx.fillRect(-2.5, -27.5 + bob, 1.8, 1.8);
    ctx.fillRect(0.8, -27.5 + bob, 1.8, 1.8);

    // 弯曲森然的巨大黄象牙獠牙 (Giant Curved Ivory Tusks)
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(-6, -26 + bob); ctx.bezierCurveTo(-11, -26 + bob, -11, -33 + bob, -8, -35 + bob);
    ctx.lineTo(-5, -28 + bob);
    ctx.moveTo(6, -26 + bob); ctx.bezierCurveTo(11, -26 + bob, 11, -33 + bob, 8, -35 + bob);
    ctx.lineTo(5, -28 + bob);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 充血血丝赤目 (Bloodshot Eyes)
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(-3.5, -31 + bob, 1.5, 0, Math.PI * 2);
    ctx.arc(3.5, -31 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 武器：右手巨型带刺铁流星锤 (Spiked Iron Morningstar Flail)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(12, -18 + bob); ctx.lineTo(16, -14 + bob); ctx.lineTo(18, -22 + bob);
    ctx.stroke();
    // 巨型带刺黑铁流星锤球
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(18, -24 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    // 尖锐铁刺
    ctx.fillStyle = '#cbd5e1';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const spx = 18 + Math.cos(a) * 9;
      const spy = -24 + bob + Math.sin(a) * 9;
      ctx.beginPath();
      ctx.arc(spx, spy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWoomaLord(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.1) * 1.5;
    const wingFlap = Math.sin(this.animFrame * 0.15) * 3;

    // 漆黑巨蝠双翼 (Massive Spreading Bat Wings)
    const wingGrad = ctx.createLinearGradient(-32, -45 + bob, 32, -10 + bob);
    wingGrad.addColorStop(0, '#450a0a');
    wingGrad.addColorStop(0.5, '#7f1d1d');
    wingGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = wingGrad;
    // 左翼
    ctx.beginPath();
    ctx.moveTo(-10, -25 + bob);
    ctx.lineTo(-30 + wingFlap, -45 + bob);
    ctx.bezierCurveTo(-26 + wingFlap, -30 + bob, -20, -18 + bob, -12, -12 + bob);
    ctx.closePath();
    ctx.fill();
    // 右翼
    ctx.beginPath();
    ctx.moveTo(10, -25 + bob);
    ctx.lineTo(30 - wingFlap, -45 + bob);
    ctx.bezierCurveTo(26 - wingFlap, -30 + bob, 20, -18 + bob, 12, -12 + bob);
    ctx.closePath();
    ctx.fill();

    // 强壮恶魔躯干 (Muscular Demon Torso)
    const torsoGrad = ctx.createLinearGradient(-10, -32 + bob, 10, -12 + bob);
    torsoGrad.addColorStop(0, '#991b1b');
    torsoGrad.addColorStop(0.5, '#b91c1c');
    torsoGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    this.roundRect(ctx, -9, -29 + bob, 18, 18, 3);
    ctx.fill();
    // 腹肌线条与熔岩纹
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -26 + bob); ctx.lineTo(0, -14 + bob);
    ctx.moveTo(-5, -22 + bob); ctx.lineTo(5, -22 + bob);
    ctx.moveTo(-4, -18 + bob); ctx.lineTo(4, -18 + bob);
    ctx.stroke();

    // 粗壮恶魔蹄足
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-7, -11 + bob, 5, 11);
    ctx.fillRect(2, -11 + bob, 5, 11);

    // 羊头恶魔面庞 (Demonic Goat Head)
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(0, -34 + bob, 8, 0, Math.PI * 2);
    ctx.fill();

    // 盘旋向下的巨型黄金盘羊角 (Majestic Curved Ram Horns)
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-5, -36 + bob);
    ctx.bezierCurveTo(-14, -46 + bob, -20, -38 + bob, -16, -28 + bob);
    ctx.moveTo(5, -36 + bob);
    ctx.bezierCurveTo(14, -46 + bob, 20, -38 + bob, 16, -28 + bob);
    ctx.stroke();
    // 羊角金箍饰环
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-14, -42 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(14, -42 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 炽热凶残金睛 (Blazing Yellow Eyes)
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-3, -34 + bob, 2, 0, Math.PI * 2);
    ctx.arc(3, -34 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 左手：狂暴雷电等离子球 (Lightning Plasma Orb)
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-15, -18 + bob, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-15, -18 + bob, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 右手：烈焰黑曜石斩魔剑 (Flaming Obsidian Blade)
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(12, -15 + bob, 3, 8);
    ctx.fillStyle = '#ea580c';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(11, -15 + bob); ctx.lineTo(16, -15 + bob); ctx.lineTo(15, -38 + bob); ctx.lineTo(9, -35 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawZumaLord(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.08) * 1.2;

    // 粗重青石方足 (Stone Pillar Legs)
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-7, -11 + bob, 5, 11);
    ctx.fillRect(2, -11 + bob, 5, 11);

    // 雕凿图腾石身 (Carved Totemic Stone Torso)
    const stoneGrad = ctx.createLinearGradient(-10, -30 + bob, 10, -11 + bob);
    stoneGrad.addColorStop(0, '#78716c');
    stoneGrad.addColorStop(0.5, '#57534e');
    stoneGrad.addColorStop(1, '#292524');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    this.roundRect(ctx, -10, -29 + bob, 20, 18, 2);
    ctx.fill();
    ctx.strokeStyle = '#a8a29e';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 胸前熔岩符文回路 (Molten Magma Runes)
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-6, -26 + bob); ctx.lineTo(0, -20 + bob); ctx.lineTo(6, -26 + bob);
    ctx.moveTo(0, -20 + bob); ctx.lineTo(0, -13 + bob);
    ctx.moveTo(-4, -16 + bob); ctx.lineTo(4, -16 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 翡翠灵石镶嵌 (Jade Inlays)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(-8, -25 + bob, 2, 0, Math.PI * 2);
    ctx.arc(8, -25 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    // 祖玛黄金太阳冠冕面具 (Golden Solar Headdress Mask)
    const goldGrad = ctx.createLinearGradient(-12, -45 + bob, 12, -28 + bob);
    goldGrad.addColorStop(0, '#fde047');
    goldGrad.addColorStop(0.5, '#ca8a04');
    goldGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = goldGrad;
    // 太阳神轮光芒芒刺 (Radiating Sun Spikes)
    ctx.beginPath();
    for (let a = 0; a < Math.PI; a += Math.PI / 6) {
      const sx = Math.cos(a + Math.PI) * 13;
      const sy = -33 + bob + Math.sin(a + Math.PI) * 13;
      ctx.moveTo(0, -33 + bob);
      ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 面部黄金图腾巨面
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    this.roundRect(ctx, -8, -38 + bob, 16, 12, 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 怒目圆睁的红宝石神目 (Ruby Eyes)
    ctx.fillStyle = '#dc2626';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-3.5, -33 + bob, 2.2, 0, Math.PI * 2);
    ctx.arc(3.5, -33 + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 祖玛巨型四棱崩山石锤 (Seismic Stone Hammer)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(11, -22 + bob, 3.5, 22);
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    this.roundRect(ctx, 8, -36 + bob, 9.5, 15, 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawRedMoon(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const pulse = Math.sin(this.animFrame * 0.12) * 2;

    // 血池深潭阴影 (Deep Blood Cavern Pool)
    ctx.fillStyle = 'rgba(136, 19, 55, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 26 + pulse, 12 + pulse * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 蠕动的血肉魔山肉丘 (Pulsing Flesh Biomass Mound)
    const fleshGrad = ctx.createRadialGradient(0, -18, 4, 0, -18, 22 + pulse);
    fleshGrad.addColorStop(0, '#e11d48');
    fleshGrad.addColorStop(0.5, '#9f1239');
    fleshGrad.addColorStop(0.8, '#4c0519');
    fleshGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = fleshGrad;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.bezierCurveTo(-26, -14, -18, -32, 0, -32 - pulse);
    ctx.bezierCurveTo(18, -32, 26, -14, 22, 0);
    ctx.closePath();
    ctx.fill();

    // 周围刺出的赤血骨刺与触须 (Barbed Bone Thorns & Tentacles)
    ctx.fillStyle = '#fda4af';
    for (let i = 0; i < 5; i++) {
      const tx = -20 + i * 10;
      const tw = Math.sin(this.animFrame * 0.2 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(tx - 2, 0);
      ctx.lineTo(tx + tw, -18 - (i % 2) * 8);
      ctx.lineTo(tx + 2, 0);
      ctx.fill();
    }

    // 遍布周身的猩红邪眼 (Multiple Demonic Eyes)
    const eyePositions = [
      { x: 0, y: -26, r: 3.5 },
      { x: -9, y: -18, r: 2.5 },
      { x: 9, y: -18, r: 2.5 },
      { x: -14, y: -8, r: 2 },
      { x: 13, y: -8, r: 2 },
      { x: 0, y: -12, r: 2.8 }
    ];

    for (const ep of eyePositions) {
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y - pulse * 0.5, ep.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ep.x, ep.y - pulse * 0.5, ep.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private drawOxDemonKing(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.1) * 1.5;

    // 沉重战靴与黑铁甲腿 (Iron Greaves)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-8, -12 + bob, 6, 12);
    ctx.fillRect(2, -12 + bob, 6, 12);

    // 伟岸黑铁魔甲胸躯 (Colossal Minotaur Torso)
    const armorGrad = ctx.createLinearGradient(-12, -32 + bob, 12, -12 + bob);
    armorGrad.addColorStop(0, '#334155');
    armorGrad.addColorStop(0.5, '#475569');
    armorGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    this.roundRect(ctx, -11, -30 + bob, 22, 19, 3);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 兽首重装肩铠 (Spiked Beast Pauldrons)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-11, -32 + bob); ctx.lineTo(-18, -36 + bob); ctx.lineTo(-13, -24 + bob);
    ctx.moveTo(11, -32 + bob); ctx.lineTo(18, -36 + bob); ctx.lineTo(13, -24 + bob);
    ctx.fill();

    // 牛魔魔首与鼻环 (Bovine Demon Head & Brass Ring)
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, -35 + bob, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // 巨大弯月冲天牛角 (Massive Sweeping Crescent Horns)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, -37 + bob);
    ctx.bezierCurveTo(-16, -42 + bob, -24, -54 + bob, -18, -60 + bob);
    ctx.moveTo(6, -37 + bob);
    ctx.bezierCurveTo(16, -42 + bob, 24, -54 + bob, 18, -60 + bob);
    ctx.stroke();
    // 铁角套
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(-18, -59 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(18, -59 + bob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 粗大黄铜鼻环
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -29 + bob, 3, 0, Math.PI);
    ctx.stroke();

    // 狂怒火眼 (Incandescent Fire Eyes)
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-3.5, -36 + bob, 2, 0, Math.PI * 2);
    ctx.arc(3.5, -36 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 武器：灭世斩马巨斧 (Colossal Executioner Axe)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(12, -28 + bob, 4, 30);
    const axeGrad = ctx.createLinearGradient(12, -48 + bob, 26, -26 + bob);
    axeGrad.addColorStop(0, '#e2e8f0');
    axeGrad.addColorStop(0.5, '#64748b');
    axeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = axeGrad;
    ctx.beginPath();
    ctx.moveTo(14, -48 + bob);
    ctx.bezierCurveTo(28, -45 + bob, 28, -26 + bob, 14, -24 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawDragonLord(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.1) * 1.5;
    const wingFlap = Math.sin(this.animFrame * 0.14) * 3;

    // 遮天黑曜石龙翼 (Giant Dragon Wings)
    const wingGrad = ctx.createLinearGradient(-36, -46 + bob, 36, -8 + bob);
    wingGrad.addColorStop(0, '#0f172a');
    wingGrad.addColorStop(0.5, '#450a0a');
    wingGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = wingGrad;
    // 左龙翼
    ctx.beginPath();
    ctx.moveTo(-8, -25 + bob);
    ctx.lineTo(-34 + wingFlap, -48 + bob);
    ctx.lineTo(-24 + wingFlap, -32 + bob);
    ctx.lineTo(-32 + wingFlap, -22 + bob);
    ctx.lineTo(-12, -12 + bob);
    ctx.closePath();
    ctx.fill();
    // 右龙翼
    ctx.beginPath();
    ctx.moveTo(8, -25 + bob);
    ctx.lineTo(34 - wingFlap, -48 + bob);
    ctx.lineTo(24 - wingFlap, -32 + bob);
    ctx.lineTo(32 - wingFlap, -22 + bob);
    ctx.lineTo(12, -12 + bob);
    ctx.closePath();
    ctx.fill();

    // 漆黑龙鳞躯干与熔岩龙脉 (Dragon Scale Torso & Magma Veins)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    this.roundRect(ctx, -10, -29 + bob, 20, 18, 3);
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -28 + bob); ctx.lineTo(0, -12 + bob);
    ctx.moveTo(-6, -22 + bob); ctx.lineTo(6, -22 + bob);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 强壮黑曜石龙爪足
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-7, -11 + bob, 5, 11);
    ctx.fillRect(2, -11 + bob, 5, 11);

    // 峥嵘魔龙战盔与龙角 (Draconic Horned Crest)
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, -35 + bob, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // 倒生倒刺黑龙龙角
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-5, -38 + bob); ctx.lineTo(-16, -52 + bob); ctx.lineTo(-8, -42 + bob);
    ctx.moveTo(5, -38 + bob); ctx.lineTo(16, -52 + bob); ctx.lineTo(8, -42 + bob);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 喷吐烈焰的熔岩龙吻与金色神目
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-3, -35 + bob, 2, 0, Math.PI * 2);
    ctx.arc(3, -35 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 武器：炽炎魔龙宝刃 (Blazing Flame Greatsword)
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(12, -16 + bob); ctx.lineTo(16, -16 + bob); ctx.lineTo(14, -42 + bob); ctx.lineTo(9, -38 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawTreasureGoblin(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.2) * 2;
    const runTilt = Math.sin(this.animFrame * 0.3) * 0.15;
    ctx.rotate(runTilt);

    // 背上鼓鼓囊囊的大宝藏麻袋 (Giant Bulging Treasure Sack)
    const sackGrad = ctx.createRadialGradient(-8, -20 + bob, 4, -8, -20 + bob, 15);
    sackGrad.addColorStop(0, '#fef08a');
    sackGrad.addColorStop(0.3, '#ca8a04');
    sackGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = sackGrad;
    ctx.beginPath();
    ctx.arc(-8, -20 + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 麻袋口溢出的璀璨金币与五彩宝石 (Spilling Gold & Gems)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-11, -30 + bob, 2.5, 0, Math.PI * 2);
    ctx.arc(-6, -32 + bob, 2.8, 0, Math.PI * 2);
    ctx.arc(-3, -29 + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // 红色和蓝色稀有宝石
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(-14, -26 + bob, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(-8, -34 + bob, 2, 0, Math.PI * 2); ctx.fill();

    // 掉落的小金星粒子闪烁
    const sparkX = -12 + Math.sin(this.animFrame * 0.4) * 4;
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(sparkX, -8 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 地精双腿与尖头鞋
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-3, -9 + bob, 3, 9);
    ctx.fillRect(3, -9 + bob, 3, 9);
    ctx.fillStyle = '#166534';
    ctx.fillRect(-5, -2 + bob, 4, 2.5);
    ctx.fillRect(4, -2 + bob, 4, 2.5);

    // 翠绿地精身躯 (Nimble Green Goblin Body)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    this.roundRect(ctx, -4, -22 + bob, 10, 14, 2);
    ctx.fill();

    // 狡黠地精大头 (Goblin Head)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(4, -27 + bob, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // 长长大尖耳朵 (Long Pointed Goblin Ears)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(2, -28 + bob); ctx.lineTo(-6, -33 + bob); ctx.lineTo(0, -25 + bob);
    ctx.moveTo(8, -28 + bob); ctx.lineTo(15, -33 + bob); ctx.lineTo(8, -25 + bob);
    ctx.fill();

    // 鹰钩大鼻子 (Hooked Nose)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(8, -27 + bob); ctx.lineTo(13, -25 + bob); ctx.lineTo(8, -23 + bob);
    ctx.fill();

    // 狡诈贪婪的黑眼睛与咧嘴大笑
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(6, -28 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(6.5, -28 + bob, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // 坏笑嘴角
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(6, -24 + bob, 3, 0.2, Math.PI * 0.8);
    ctx.stroke();
  }

  private drawDemonWarlord(ctx: CanvasRenderingContext2D, _m: Entity): void {
    const bob = Math.sin(this.animFrame * 0.1) * 1.5;
    const wingFlap = Math.sin(this.animFrame * 0.15) * 3;

    // 猩红魔王巨翼
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(-10, -24 + bob);
    ctx.lineTo(-28 + wingFlap, -44 + bob);
    ctx.lineTo(-14, -12 + bob);
    ctx.moveTo(10, -24 + bob);
    ctx.lineTo(28 - wingFlap, -44 + bob);
    ctx.lineTo(14, -12 + bob);
    ctx.fill();

    // 深渊重铠躯干
    const armorGrad = ctx.createLinearGradient(-10, -32 + bob, 10, -12 + bob);
    armorGrad.addColorStop(0, '#581c87');
    armorGrad.addColorStop(0.5, '#7e22ce');
    armorGrad.addColorStop(1, '#3b0764');
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    this.roundRect(ctx, -9, -30 + bob, 18, 19, 3);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 恶魔重铠双足
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(-7, -11 + bob, 5, 11);
    ctx.fillRect(2, -11 + bob, 5, 11);

    // 威严魔盔与紫焰魔角
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.arc(0, -35 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#9333ea';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-5, -38 + bob); ctx.lineTo(-14, -50 + bob); ctx.lineTo(-7, -40 + bob);
    ctx.moveTo(5, -38 + bob); ctx.lineTo(14, -50 + bob); ctx.lineTo(7, -40 + bob);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 金黄魔眼
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(-3, -35 + bob, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -35 + bob, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 右手：深渊灭魂巨剑
    ctx.fillStyle = '#dc2626';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillRect(11, -38 + bob, 4, 25);
    ctx.shadowBlur = 0;
  }
}
