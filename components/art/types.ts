import { PoemFingerprint } from '@/lib/fingerprint';

export interface ArtProps {
  fingerprint: PoemFingerprint;
  width: number;
  height: number;
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
