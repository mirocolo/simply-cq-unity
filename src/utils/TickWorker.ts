/**
 * Web Worker 独立时钟源
 * 彻底解决浏览器在切换标签页或最小化时将 setInterval 降频至 1000ms（或冻结）导致挂机停滞的问题
 */
export class TickWorker {
  private worker: Worker | null = null;
  private onTickCallback: (() => void) | null = null;
  private fallbackTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        const workerScript = `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data.action === 'start') {
              if (timer) clearInterval(timer);
              timer = setInterval(function() {
                self.postMessage('tick');
              }, e.data.interval || 100);
            } else if (e.data.action === 'stop') {
              if (timer) clearInterval(timer);
              timer = null;
            }
          };
        `;
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        this.worker = new Worker(url);
        this.worker.onmessage = (e) => {
          if (e.data === 'tick' && this.onTickCallback) {
            this.onTickCallback();
          }
        };
      } catch (err) {
        console.warn('Web Worker 初始化失败，回退至原生定时器', err);
        this.worker = null;
      }
    }
  }

  start(intervalMs: number, onTick: () => void): void {
    this.onTickCallback = onTick;
    if (this.worker) {
      this.worker.postMessage({ action: 'start', interval: intervalMs });
    } else if (typeof window !== 'undefined') {
      if (this.fallbackTimer) clearInterval(this.fallbackTimer);
      this.fallbackTimer = window.setInterval(onTick, intervalMs);
    }
  }

  stop(): void {
    if (this.worker) {
      this.worker.postMessage({ action: 'stop' });
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  terminate(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.onTickCallback = null;
  }
}
