// Mutable, per-frame state shared by the stage and the poem layer: the motion
// clock, the per-verse "lit" values and the scroll playhead. Lives outside
// React so scrolling and hovering never re-render the tree.

import type { Motion } from '../tokens';
import { subscribe } from './ticker';

const LERP = 0.12;
const DIM = 0.3;
const OPENING = 0.8;

export class StageRuntime {
  lit: Float32Array;
  private target: Float32Array;
  private verseStanza: number[];
  motion: Motion = 'drift';
  time = 12;
  rate = 1;
  pulse = 1;
  hovered = -1;
  activeStanza = -1;
  opening = true;
  scrollSteps = 0; // scroll position in quarter-viewports, for Scrub-snap
  private last = 0;
  private stop: (() => void) | null = null;
  private listeners = new Set<() => void>();

  constructor(verseStanza: number[]) {
    this.verseStanza = verseStanza;
    this.lit = new Float32Array(Math.max(1, verseStanza.length)).fill(OPENING);
    this.target = new Float32Array(this.lit.length).fill(OPENING);
  }

  start() {
    if (this.stop) return;
    this.last = performance.now();
    this.stop = subscribe(60, now => this.tick(now), 0);
  }

  dispose() {
    this.stop?.();
    this.stop = null;
  }

  // Called once per frame after the clock advances (used for the pulse var).
  onFrame(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private tick(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const sec = now / 1000;

    switch (this.motion) {
      case 'drift':
        this.time += dt;
        this.rate = 1;
        this.pulse = 1;
        break;
      case 'pulse': {
        const breath = 0.5 + 0.5 * Math.sin(sec * 1.1);
        this.time += dt * (0.35 + 0.9 * breath);
        this.rate = 0.35 + 0.9 * breath;
        this.pulse = 0.78 + 0.22 * breath;
        break;
      }
      case 'scrub': {
        // Time follows the scroll in discrete, eased steps.
        const target = 12 + this.scrollSteps * 1.5;
        const prev = this.time;
        this.time += (target - this.time) * 0.08;
        this.rate = Math.min(3, Math.abs(this.time - prev) * 40);
        this.pulse = 1;
        break;
      }
      case 'still':
        this.rate = 0;
        this.pulse = 1;
        break;
    }

    // Lit targets: hover beats the playhead; the opening shows everything.
    const n = this.target.length;
    for (let i = 0; i < n; i++) {
      let v: number;
      if (this.hovered >= 0) v = i === this.hovered ? 1 : DIM;
      else if (this.opening || this.activeStanza < 0) v = OPENING;
      else v = this.verseStanza[i] === this.activeStanza ? 1 : DIM;
      this.target[i] = v;
      this.lit[i] += (v - this.lit[i]) * LERP;
    }
    this.listeners.forEach(cb => cb());
  }
}
