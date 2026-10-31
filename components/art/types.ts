import { PoemFingerprint } from '@/lib/fingerprint';
import { FieldColor } from '@/lib/poemParser';

// Presentation context supplied when a piece is drawn full-bleed on the Cauce
// stage. Without it, pieces draw exactly as before on their own paper ground.
export interface ArtTheme {
  ink: FieldColor;
  ground: FieldColor;
  tone: (c: FieldColor) => FieldColor; // keeps analysis colours legible on the ground
  mono: string;                        // CSS font-family for canvas text
  key: string;                         // changes when the theme changes
}

export interface ArtStage {
  theme: ArtTheme;
  lit: Float32Array;                   // per verse (fingerprint.verses order), 0–1
  time: () => number;                  // motion-adjusted seconds
  rate: () => number;                  // per-frame step multiplier (0 = still)
  subscribe: (fps: number, cb: () => void) => () => void;
  visible: () => boolean;
}

export interface ArtProps {
  fingerprint: PoemFingerprint;
  width: number;
  height: number;
  stage?: ArtStage;
}

// Each piece declares which traits of the poem drive which visual parameters,
// so the gallery can explain what the viewer is looking at.
export interface ArtMeta {
  id: string;
  label: string;
  sub: string;
  themes: string;
  mappings: string[];
}
