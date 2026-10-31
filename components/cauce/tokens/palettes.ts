// The fixed option lists the 8-digit seed chooses from. Each list is indexed
// by one digit group (see deriveTokens.ts).

export interface Palette {
  name: string;
  dark: boolean;
  ground: string;
  ink: string;
  accent: string;
  accent2: string;
}

export const PALETTES: Palette[] = [
  { name: 'Lecho', dark: true, ground: '#0a1b22', ink: '#e7efe9', accent: '#ff6b4a', accent2: '#7fd6c2' },
  { name: 'Hollín', dark: true, ground: '#17110f', ink: '#efe6dc', accent: '#e0a526', accent2: '#c4553a' },
  { name: 'Cibernoche', dark: true, ground: '#0d0b26', ink: '#e9e6ff', accent: '#ff4fa3', accent2: '#6a8cff' },
  { name: 'Musgo', dark: true, ground: '#0e1a12', ink: '#e6eedc', accent: '#c6f04a', accent2: '#f08a4b' },
  { name: 'Vino', dark: true, ground: '#240c16', ink: '#f3e3dc', accent: '#ff9f6e', accent2: '#b88cff' },
  { name: 'Pizarra', dark: true, ground: '#12161c', ink: '#dfe6ee', accent: '#4fc3ff', accent2: '#ffd166' },
  { name: 'Berenjena', dark: true, ground: '#1b0f22', ink: '#f1e7f0', accent: '#ffb547', accent2: '#5fd3b0' },
  { name: 'Papel hueso', dark: false, ground: '#e9e3d6', ink: '#17140f', accent: '#c0391b', accent2: '#1d4e5f' },
  { name: 'Celadón', dark: false, ground: '#dce7df', ink: '#10201a', accent: '#0c7a5a', accent2: '#d14a2a' },
  { name: 'Azulejo', dark: false, ground: '#e6ecef', ink: '#0d1b2a', accent: '#1b4fd6', accent2: '#f2a516' },
];

export interface TypePairing {
  name: string;
  display: string;
  text: string;
  mono: string;
  weight: number;
  style: 'normal' | 'italic';
  track: string;
  leading: number;
}

const SERIF_FALLBACK = "Georgia, 'Times New Roman', Times, serif";
const SANS_FALLBACK = "'Helvetica Neue', Arial, sans-serif";
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const TYPE_PAIRINGS: TypePairing[] = [
  { name: 'Fraunces / Newsreader / DM Mono', display: `'Fraunces', ${SERIF_FALLBACK}`, text: `'Newsreader', ${SERIF_FALLBACK}`, mono: `'DM Mono', ${MONO_FALLBACK}`, weight: 900, style: 'normal', track: '-0.045em', leading: 0.86 },
  { name: 'Playfair Display / Source Serif 4 / IBM Plex Mono', display: `'Playfair Display', ${SERIF_FALLBACK}`, text: `'Source Serif 4', ${SERIF_FALLBACK}`, mono: `'IBM Plex Mono', ${MONO_FALLBACK}`, weight: 900, style: 'italic', track: '-0.03em', leading: 0.9 },
  { name: 'Bodoni Moda / EB Garamond / Space Mono', display: `'Bodoni Moda', ${SERIF_FALLBACK}`, text: `'EB Garamond', ${SERIF_FALLBACK}`, mono: `'Space Mono', ${MONO_FALLBACK}`, weight: 900, style: 'normal', track: '-0.035em', leading: 0.88 },
  { name: 'DM Serif Display / Literata / JetBrains Mono', display: `'DM Serif Display', ${SERIF_FALLBACK}`, text: `'Literata', ${SERIF_FALLBACK}`, mono: `'JetBrains Mono', ${MONO_FALLBACK}`, weight: 400, style: 'normal', track: '-0.025em', leading: 0.92 },
  { name: 'Instrument Serif / Newsreader / DM Mono', display: `'Instrument Serif', ${SERIF_FALLBACK}`, text: `'Newsreader', ${SERIF_FALLBACK}`, mono: `'DM Mono', ${MONO_FALLBACK}`, weight: 400, style: 'normal', track: '-0.02em', leading: 0.9 },
  { name: 'Syne / Newsreader / Space Mono', display: `'Syne', ${SANS_FALLBACK}`, text: `'Newsreader', ${SERIF_FALLBACK}`, mono: `'Space Mono', ${MONO_FALLBACK}`, weight: 800, style: 'normal', track: '-0.055em', leading: 0.88 },
];

export const ARCHETYPES = ['broadsheet', 'monolith', 'marginalia', 'cascade', 'spine', 'frame', 'overprint', 'index'] as const;
export type Archetype = (typeof ARCHETYPES)[number];
export const ARCHETYPE_NAMES: Record<Archetype, string> = {
  broadsheet: 'Sábana (dos columnas)',
  monolith: 'Monolito (columna central)',
  marginalia: 'Marginalia (columna al margen)',
  cascade: 'Cascada (sangría diagonal)',
  spine: 'Espina (zigzag a dos columnas)',
  frame: 'Marco (versos en el perímetro)',
  overprint: 'Sobreimpresión (tipo gigante)',
  index: 'Índice (tabla de versos)',
};

export const MOTIONS = ['drift', 'pulse', 'scrub', 'still'] as const;
export type Motion = (typeof MOTIONS)[number];
export const MOTION_NAMES: Record<Motion, string> = {
  drift: 'Deriva (tiempo continuo)',
  pulse: 'Pulso (amplitud que respira)',
  scrub: 'Arrastre (el scroll mueve el tiempo)',
  still: 'Quietud (solo cambios de foco)',
};
export const MOTION_TOKENS: Record<Motion, { speed: string; ease: string }> = {
  drift: { speed: '700ms', ease: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  pulse: { speed: '900ms', ease: 'cubic-bezier(0.45, 0, 0.55, 1)' },
  scrub: { speed: '420ms', ease: 'cubic-bezier(0.7, 0, 0.3, 1)' },
  still: { speed: '240ms', ease: 'linear' },
};

export const DENSITIES = [
  { name: 'Aireada', margin: 'clamp(24px, 8vw, 140px)', gutter: 'clamp(20px, 6vw, 110px)' },
  { name: 'Media', margin: 'clamp(20px, 5vw, 96px)', gutter: 'clamp(16px, 4vw, 72px)' },
  { name: 'Densa', margin: 'clamp(16px, 3vw, 56px)', gutter: 'clamp(12px, 2.4vw, 44px)' },
];

export const GRAINS = [
  { name: 'Liso', opacity: 0.035, contrast: 1 },
  { name: 'Grano', opacity: 0.08, contrast: 1.05 },
  { name: 'Tinta cargada', opacity: 0.13, contrast: 1.12 },
];

export const DOCKS = ['pill', 'left', 'right', 'compact'] as const;
export type DockForm = (typeof DOCKS)[number];
export const DOCK_NAMES: Record<DockForm, string> = {
  pill: 'Píldora abajo al centro',
  left: 'Riel vertical a la izquierda',
  right: 'Riel vertical a la derecha',
  compact: 'Compacto abajo a la izquierda',
};
