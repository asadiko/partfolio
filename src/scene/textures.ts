import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function canvas(width: number, height: number) {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { el, ctx };
}

function toTexture(el: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Procedural wood grain: layered sine stripes with noise, tiled along the desk. */
export function woodTexture(base = '#9a7250', dark = '#7a5a3d'): CanvasTexture {
  const { el, ctx } = canvas(1024, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, el.width, el.height);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let y = 0; y < el.height; y += 3) {
    ctx.globalAlpha = 0.08 + Math.abs(Math.sin(y * 0.11) * Math.sin(y * 0.031)) * 0.35;
    ctx.beginPath();
    for (let x = 0; x <= el.width; x += 16) {
      const wobble = Math.sin(x * 0.02 + y * 0.05) * 2.5 + Math.sin(x * 0.005) * 4;
      ctx.lineTo(x, y + wobble);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const texture = toTexture(el);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

interface NoteOptions {
  text: string;
  paper: string;
  ink?: string;
  font?: string;
}

/** A square sticky note with handwritten-looking text. */
export function noteTexture({
  text,
  paper,
  ink = '#2a2622',
  font = 'italic 44px ui-sans-serif, system-ui',
}: NoteOptions): CanvasTexture {
  const { el, ctx } = canvas(256, 256);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, 256, 34);
  ctx.fillStyle = ink;
  ctx.font = font;
  ctx.textAlign = 'center';
  text.split('\n').forEach((line, i, all) => {
    ctx.fillText(line, 128, 150 + (i - (all.length - 1) / 2) * 50 - 8);
  });
  return toTexture(el);
}

/** A framed print: big glyph, small caption. */
export function posterTexture(theme: 'light' | 'dark'): CanvasTexture {
  const { el, ctx } = canvas(512, 640);
  ctx.fillStyle = theme === 'dark' ? '#1f2226' : '#f2efe8';
  ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = '#0f6e63';
  ctx.beginPath();
  ctx.moveTo(256, 120);
  ctx.lineTo(376, 240);
  ctx.lineTo(256, 360);
  ctx.lineTo(136, 240);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = theme === 'dark' ? '#e8e6df' : '#1b1a17';
  ctx.font = '600 44px ui-sans-serif, system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('deterministic first,', 256, 460);
  ctx.fillText('model last', 256, 515);
  ctx.font = '26px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#8f8c84';
  ctx.fillText('asadiko · 2026', 256, 590);
  return toTexture(el);
}

/** Wall clock face showing the current local time. */
export function clockTexture(date = new Date()): CanvasTexture {
  const { el, ctx } = canvas(256, 256);
  ctx.fillStyle = '#f6f4ee';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
    ctx.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112);
    ctx.stroke();
  }
  const hand = (angle: number, length: number, width: number) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(angle) * length, 128 + Math.sin(angle) * length);
    ctx.stroke();
  };
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  hand(((h + m / 60) / 12) * Math.PI * 2 - Math.PI / 2, 60, 7);
  hand((m / 60) * Math.PI * 2 - Math.PI / 2, 92, 4);
  return toTexture(el);
}
