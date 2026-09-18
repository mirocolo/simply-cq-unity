export class SoundEffects {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.5;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  toggleSound(enable?: boolean): boolean {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    return this.enabled;
  }

  isSoundEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 极速挥刀破空声 (清脆迅疾)
   */
  playSwing(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.09);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    gain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  /**
   * 烈火剑法大招 (烈焰爆轰 + 沉闷重低音)
   */
  playFire(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // 低频巨响
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(this.volume * 0.95, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  }

  /**
   * 刀刀入肉重击声
   */
  playHit(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  /**
   * 暴击破甲裂骨轰鸣 (高低双频震荡)
   */
  playCrit(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(260, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.22);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(960, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(this.volume * 1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.23);
    osc2.stop(ctx.currentTime + 0.23);
  }

  /**
   * 风雷残影连击 (极速电光剑鸣与重影破空)
   */
  playPhantom(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    [880, 1320].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + idx * 0.04 + 0.1);

      gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.04);
      osc.stop(ctx.currentTime + idx * 0.04 + 0.11);
    });
  }

  /**
   * 金币大爆叮当清脆响
   */
  playCoin(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    [1960, 2793].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.03);

      gain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.03 + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.03);
      osc.stop(ctx.currentTime + idx * 0.03 + 0.18);
    });
  }

  playPotion(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(340, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  }

  playLevelUp(): void {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(this.volume * 0.55, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.42);
    });
  }
}
