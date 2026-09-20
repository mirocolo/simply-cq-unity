export class SoundEffects {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private enabled = true;
  private volume = 0.55;
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlayTime: Record<string, number> = {};

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // 建立主输出动态压限器链路：节点 -> masterGain -> compressor -> destination
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMasterOutput(ctx: AudioContext): AudioNode {
    return this.masterGain || ctx.destination;
  }

  private shouldThrottle(soundKey: string, intervalMs = 40): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = this.lastPlayTime[soundKey] || 0;
    if (now - last < intervalMs) return true;
    this.lastPlayTime[soundKey] = now;
    return false;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ctx.sampleRate) {
      const bufferSize = ctx.sampleRate * 1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  toggleSound(enable?: boolean): boolean {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    return this.enabled;
  }

  isSoundEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    if (this.ctx) {
      if (this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
      }
      this.ctx = null;
    }
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.lastPlayTime = {};
  }

  /**
   * 极速挥刀破空声 (清脆金属刀刃划破空气的呼啸感)
   */
  playSwing(): void {
    if (!this.enabled || this.shouldThrottle('swing', 35)) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. 白噪声切风层 (带通滤波扫频)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(700, t + 0.08);
    filter.Q.setValueAtTime(3.5, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getMasterOutput(ctx));

    // 2. 气流微鸣滑音
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    oscGain.gain.setValueAtTime(this.volume * 0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.getMasterOutput(ctx));

    noise.start(t);
    noise.stop(t + 0.085);
    osc.start(t);
    osc.stop(t + 0.085);
  }

  /**
   * 刀刀入肉重击声 (金属劈砍 + 肉体受击 + 刀鸣余音)
   */
  playHit(): void {
    if (!this.enabled || this.shouldThrottle('hit', 35)) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. 瞬态金属切刃声 (高锐度带通白噪声)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
    noiseFilter.Q.setValueAtTime(4.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.75, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.getMasterOutput(ctx));

    // 2. 肉身沉闷重击 (190Hz -> 45Hz 强力低频冲击)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(190, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    bodyGain.gain.setValueAtTime(this.volume * 0.85, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.getMasterOutput(ctx));

    // 3. 刀身钢鸣微谐波 (清脆金属刀鸣)
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(1420, t);
    ringOsc.frequency.exponentialRampToValueAtTime(800, t + 0.06);

    ringGain.gain.setValueAtTime(this.volume * 0.25, t);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    ringOsc.connect(ringGain);
      ringGain.connect(this.getMasterOutput(ctx));

    noise.start(t);
    noise.stop(t + 0.045);
    bodyOsc.start(t);
    bodyOsc.stop(t + 0.095);
    ringOsc.start(t);
    ringOsc.stop(t + 0.065);
  }

  /**
   * 暴击破甲裂骨轰鸣 (爆裂撕裂 + 沉重超低频 + 金属破甲尖鸣)
   */
  playCrit(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. 金属碎甲爆裂层 (高增益噪声切除)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(600, t + 0.16);
    noiseFilter.Q.setValueAtTime(3.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.95, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.getMasterOutput(ctx));

    // 2. 超低频震波 (80Hz -> 28Hz 战神斩轰击)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.22);

    subGain.gain.setValueAtTime(this.volume * 1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    subOsc.connect(subGain);
    subGain.connect(this.getMasterOutput(ctx));

    // 3. 破甲双刀鸣谐波
    [1650, 2480].forEach(freq => {
      const ring = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ring.type = 'triangle';
      ring.frequency.setValueAtTime(freq, t);
      ring.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.12);

      ringGain.gain.setValueAtTime(this.volume * 0.35, t);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      ring.connect(ringGain);
        ringGain.connect(this.getMasterOutput(ctx));

      ring.start(t);
      ring.stop(t + 0.13);
    });

    noise.start(t);
    noise.stop(t + 0.17);
    subOsc.start(t);
    subOsc.stop(t + 0.23);
  }

  /**
   * 烈火剑法大招 (烈焰爆轰 + 沉闷烈火重低音)
   */
  playFire(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 烈焰火焰爆破声 (低通噪声轰鸣)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, t + 0.35);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.85, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.getMasterOutput(ctx));

    // 烈火重斩低频
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.35);

    oscGain.gain.setValueAtTime(this.volume * 0.95, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.getMasterOutput(ctx));

    noise.start(t);
    noise.stop(t + 0.36);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  /**
   * 风雷残影连击 (极速电光剑鸣与重影破空)
   */
  playPhantom(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [0, 0.045].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, t + delay);
      osc.frequency.exponentialRampToValueAtTime(260, t + delay + 0.07);

      gain.gain.setValueAtTime(this.volume * 0.55, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.07);

      osc.connect(gain);
      gain.connect(this.getMasterOutput(ctx));

      osc.start(t + delay);
      osc.stop(t + delay + 0.075);
    });
  }

  /**
   * 麻痹特戒石化雷击 (电光噼啪与锁链震颤)
   */
  playParalyze(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(980, t);
    osc.frequency.linearRampToValueAtTime(1800, t + 0.05);
    osc.frequency.linearRampToValueAtTime(350, t + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.getMasterOutput(ctx));

    osc.start(t);
    osc.stop(t + 0.17);
  }

  /**
   * 特戒涅槃复活 (神圣圣光钟鸣)
   */
  playRevive(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      gain.gain.setValueAtTime(this.volume * 0.45, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.getMasterOutput(ctx));

      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.42);
    });
  }

  /**
   * 金币大爆叮当清脆响
   */
  playCoin(): void {
    if (!this.enabled || this.shouldThrottle('coin', 45)) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [1960, 2793].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);

      gain.gain.setValueAtTime(this.volume * 0.45, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.16);

      osc.connect(gain);
      gain.connect(this.getMasterOutput(ctx));

      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.18);
    });
  }

  playPotion(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.linearRampToValueAtTime(520, t + 0.1);
    osc.frequency.linearRampToValueAtTime(340, t + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.getMasterOutput(ctx));

    osc.start(t);
    osc.stop(t + 0.23);
  }

  playLevelUp(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(this.volume * 0.55, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.38);

      osc.connect(gain);
      gain.connect(this.getMasterOutput(ctx));

      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.42);
    });
  }
}
