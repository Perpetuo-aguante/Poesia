// Seed → design tokens. Everything visual in Cauce comes from here.
//
//   d1–d2  palette        (d1*10+d2) % 10
//   d3     type pairing   d3 % 6
//   d4     archetype      d4 % 8
//   d5     motion         d5 % 4
//   d6     density        d6 % 3
//   d7     grain          d7 % 3
//   d8     dock form      d8 % 4

import { FIELD_COLORS, FieldColor, SemanticField } from '@/lib/poemParser';
import { contrast, hexToRgb, legibleOn, mixRgb, rgbToHex } from './color';
import {
  ARCHETYPES, ARCHETYPE_NAMES, Archetype, DENSITIES, DOCKS, DOCK_NAMES, DockForm, GRAINS,
  MOTIONS, MOTION_NAMES, MOTION_TOKENS, Motion, PALETTES, Palette, TYPE_PAIRINGS, TypePairing,
} from './palettes';

export interface Tokens {
  seed: string;
  palette: Palette;
  type: TypePairing;
  arch: Archetype;
  motion: Motion;
  density: (typeof DENSITIES)[number];
  grain: (typeof GRAINS)[number];
  dock: DockForm;
  colors: { ground: string; ink: string; ink2: string; accent: string; accent2: string; onAccent: string; onAccent2: string; hair: string; blend: string };
  emo: Record<string, string>; // CSS-safe emotion slug → hex
  rgb: { ground: FieldColor; ink: FieldColor };
  // Re-tones any analysis colour so it stays visible on this ground (used by the art).
  tone: (c: FieldColor) => FieldColor;
  explain: { digits: string; label: string; value: string }[];
}

export function emoSlug(field: SemanticField | string): string {
  return field.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// FNV-1a over the poem text → 8 zero-padded digits.
export function hashSeed(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 1e8).padStart(8, '0');
}

export function randomSeed(): string {
  return String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
}

export function deriveTokens(seed: string): Tokens {
  const d = seed.padStart(8, '0').slice(-8).split('').map(Number);
  const palette = PALETTES[(d[0] * 10 + d[1]) % 10];
  const type = TYPE_PAIRINGS[d[2] % 6];
  const arch = ARCHETYPES[d[3] % 8];
  const motion = MOTIONS[d[4] % 4];
  const density = DENSITIES[d[5] % 3];
  const grain = GRAINS[d[6] % 3];
  const dock = DOCKS[d[7] % 4];

  const ground = hexToRgb(palette.ground);
  const ink = hexToRgb(palette.ink);
  let ink2 = mixRgb(ink, ground, 0.3);
  for (let t = 0.3; t > 0 && contrast(ink2, ground) < 4.5; t -= 0.04) ink2 = mixRgb(ink, ground, t);

  const toneCache = new Map<string, FieldColor>();
  const tone = (c: FieldColor) => {
    const key = `${c.r},${c.g},${c.b}`;
    let out = toneCache.get(key);
    if (!out) {
      out = legibleOn(c, ground, palette.dark, 3);
      toneCache.set(key, out);
    }
    return out;
  };

  const emo: Record<string, string> = {};
  (Object.keys(FIELD_COLORS) as SemanticField[]).forEach(f => {
    emo[emoSlug(f)] = f === 'neutral' ? palette.ink : rgbToHex(legibleOn(FIELD_COLORS[f], ground, palette.dark, palette.dark ? 7 : 6));
  });

  const seg = (a: number, b: number) => seed.slice(a, b);
  return {
    seed,
    palette,
    type,
    arch,
    motion,
    density,
    grain,
    dock,
    colors: {
      ground: palette.ground,
      ink: palette.ink,
      ink2: rgbToHex(ink2),
      accent: palette.accent,
      accent2: palette.accent2,
      onAccent: onColor(palette.accent, ground, ink),
      onAccent2: onColor(palette.accent2, ground, ink),
      hair: rgbToHex(mixRgb(ground, ink, palette.dark ? 0.22 : 0.28)),
      blend: palette.dark ? 'screen' : 'multiply',
    },
    emo,
    rgb: { ground, ink },
    tone,
    explain: [
      { digits: seg(0, 2), label: 'Paleta', value: `${palette.name} · fondo ${palette.dark ? 'oscuro' : 'claro'}` },
      { digits: seg(2, 3), label: 'Tipografía', value: type.name },
      { digits: seg(3, 4), label: 'Composición', value: ARCHETYPE_NAMES[arch] },
      { digits: seg(4, 5), label: 'Movimiento', value: MOTION_NAMES[motion] },
      { digits: seg(5, 6), label: 'Densidad', value: `${density.name} (márgenes y medianiles)` },
      { digits: seg(6, 7), label: 'Grano y contraste', value: grain.name },
      { digits: seg(7, 8), label: 'Dock', value: DOCK_NAMES[dock] },
    ],
  };
}

// Text colour for a filled accent: whichever of ground or ink reads better on it.
function onColor(fill: string, ground: FieldColor, ink: FieldColor): string {
  const f = hexToRgb(fill);
  return rgbToHex(contrast(f, ground) >= contrast(f, ink) ? ground : ink);
}

export function applyTokens(t: Tokens, reducedMotion = false) {
  const root = document.documentElement.style;
  const set = (k: string, v: string | number) => root.setProperty(k, String(v));
  set('--color-ground', t.colors.ground);
  set('--color-ink', t.colors.ink);
  set('--color-ink-2', t.colors.ink2);
  set('--color-accent', t.colors.accent);
  set('--color-accent-2', t.colors.accent2);
  set('--color-on-accent', t.colors.onAccent);
  set('--color-on-accent-2', t.colors.onAccent2);
  set('--blend', t.colors.blend);
  set('--hair', t.colors.hair);
  for (const [k, v] of Object.entries(t.emo)) set(`--emo-${k}`, v);
  set('--font-display', t.type.display);
  set('--font-text', t.type.text);
  set('--font-mono', t.type.mono);
  set('--display-weight', t.type.weight);
  set('--display-style', t.type.style);
  set('--display-track', t.type.track);
  set('--display-leading', t.type.leading);
  set('--space-margin', t.density.margin);
  set('--space-gutter', t.density.gutter);
  const motion = reducedMotion ? 'still' : t.motion;
  set('--motion-speed', MOTION_TOKENS[motion].speed);
  set('--motion-ease', MOTION_TOKENS[motion].ease);
  set('--grain-opacity', t.grain.opacity);
  set('--contrast', t.grain.contrast);
  const body = document.body;
  body.dataset.arch = t.arch;
  body.dataset.dock = t.dock;
  body.dataset.motion = motion;
  body.dataset.ground = t.palette.dark ? 'dark' : 'light';
}
