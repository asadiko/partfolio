import { CanvasTexture, SRGBColorSpace } from 'three';

export type ScreenMode = 'off' | 'saver' | 'boot';

const W = 512;
const H = 384;
const BOOT_SECONDS = 2.6;

/** Draws the CRT content onto a canvas that the screen mesh samples as a texture. */
export class Screen {
  readonly texture: CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private mode: ScreenMode = 'saver';
  private clock = 0;
  private bootStart = 0;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.draw();
  }

  setMode(mode: ScreenMode) {
    this.mode = mode;
    if (mode === 'boot') this.bootStart = this.clock;
    this.draw();
  }

  get bootDuration() {
    return BOOT_SECONDS;
  }

  tick(dt: number) {
    this.clock += dt;
    if (this.mode !== 'off') this.draw();
  }

  private draw() {
    const { ctx } = this;
    switch (this.mode) {
      case 'off':
        ctx.fillStyle = '#0b0d10';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'saver':
        this.drawSaver();
        break;
      case 'boot':
        this.drawBoot();
        break;
    }
    this.scanlines();
    this.texture.needsUpdate = true;
  }

  private drawSaver() {
    const { ctx, clock } = this;
    ctx.fillStyle = '#101418';
    ctx.fillRect(0, 0, W, H);
    // Sparse starfield: deterministic positions, phase drifts with time.
    for (let i = 0; i < 70; i++) {
      const seed = i * 97.31;
      const speed = 12 + (i % 5) * 6;
      const x = (seed * 7 + clock * speed) % W;
      const y = (seed * 13) % H;
      const size = 1 + (i % 3);
      ctx.fillStyle = i % 4 === 0 ? '#7fd7cb' : '#cfd6dc';
      ctx.fillRect(x, y, size, size);
    }
    const bounceX = W / 2 + Math.sin(clock * 0.7) * 120;
    const bounceY = H / 2 + Math.cos(clock * 0.9) * 60;
    ctx.font = 'bold 34px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef2f4';
    ctx.fillText('AsadOS', bounceX, bounceY);
    ctx.font = '16px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#8fa1ab';
    const blink = Math.floor(clock * 1.5) % 2 === 0;
    if (blink) ctx.fillText('click the screen to start', W / 2, H - 40);
  }

  private drawBoot() {
    const { ctx } = this;
    const t = Math.min(1, (this.clock - this.bootStart) / BOOT_SECONDS);
    ctx.fillStyle = '#c9ccd1';
    ctx.fillRect(0, 0, W, H);

    // Smiling-computer glyph: an original pixel drawing, not the Apple icon.
    const cx = W / 2;
    const cy = H / 2 - 40;
    ctx.fillStyle = '#1b1a17';
    ctx.fillRect(cx - 40, cy - 46, 80, 70);
    ctx.fillStyle = '#c9ccd1';
    ctx.fillRect(cx - 32, cy - 38, 64, 48);
    ctx.fillStyle = '#1b1a17';
    ctx.fillRect(cx - 18, cy - 22, 8, 8);
    ctx.fillRect(cx + 10, cy - 22, 8, 8);
    ctx.fillRect(cx - 16, cy - 2, 6, 4);
    ctx.fillRect(cx - 10, cy + 2, 20, 4);
    ctx.fillRect(cx + 10, cy - 2, 6, 4);
    ctx.fillRect(cx - 22, cy + 24, 44, 8);
    ctx.fillRect(cx - 30, cy + 32, 60, 6);

    ctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1b1a17';
    ctx.fillText('Welcome to AsadOS', cx, cy + 80);

    const barW = 260;
    const barX = cx - barW / 2;
    const barY = cy + 104;
    ctx.strokeStyle = '#1b1a17';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, 14);
    ctx.fillStyle = '#4a6b8a';
    ctx.fillRect(barX + 2, barY + 2, (barW - 4) * t, 10);

    ctx.font = '13px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#3a3a3a';
    const stage =
      t < 0.3
        ? 'Loading fixtures…'
        : t < 0.6
          ? 'Checking citations…'
          : t < 0.9
            ? 'Warming the gateway…'
            : 'Ready.';
    ctx.fillText(stage, cx, barY + 36);
  }

  private scanlines() {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }
}
