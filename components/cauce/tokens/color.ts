// Small colour helpers for the token system (hex/rgb/hsl and WCAG contrast).
import type { FieldColor } from '@/lib/poemParser';

export function hexToRgb(hex: string): FieldColor {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: FieldColor): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function mixRgb(a: FieldColor, b: FieldColor, t: number): FieldColor {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function rgbToHsl({ r, g, b }: FieldColor): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): FieldColor {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
}

function luminance({ r, g, b }: FieldColor): number {
  const c = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: FieldColor, b: FieldColor): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Keep the hue (and most of the saturation) of an emotion colour, but move its
// lightness so it reads on the current ground: lighter on dark grounds,
// darker on light ones, until it reaches `min` contrast.
export function legibleOn(color: FieldColor, ground: FieldColor, dark: boolean, min = 4.5): FieldColor {
  const [h, s0, l0] = rgbToHsl(color);
  const s = Math.min(1, Math.max(s0, 0.35));
  let l = dark ? Math.max(l0, 0.62) : Math.min(l0, 0.4);
  let out = hslToRgb(h, s, l);
  for (let i = 0; i < 40 && contrast(out, ground) < min; i++) {
    l = dark ? Math.min(0.97, l + 0.02) : Math.max(0.03, l - 0.02);
    out = hslToRgb(h, s, l);
  }
  return { r: Math.round(out.r), g: Math.round(out.g), b: Math.round(out.b) };
}
