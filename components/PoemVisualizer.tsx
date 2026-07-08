'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ParsedPoem, ParsedVerse, ParsedSyntagma, SemanticField, FieldColor } from '@/lib/poemParser';

export type VisMode = 'blocks' | 'pergamino' | 'serigrafia';

interface Props {
  poem: ParsedPoem;
  mode: VisMode;
  width?: number;
  height?: number;
}

// ─── ASCII character sets per emotion field ────────────────────────────────────────────────────────────

const ASCII_CHARS: Record<SemanticField, string[]> = {
  nostalgia:     ['◌', '·', '○', '∙', '∘', '◦', '⌒', '~', '≈', '…', '‥', '⋯'],
  inseguridad:   ['?', '¿', '/', '\\', '~', '≈', '∽', '⟋', '⟌', '⋱', '⋰', '⋮'],
  miedo:         ['█', '▓', '▒', '░', '■', '▪', '●', '◆', '◉', '◈', '▐', '▌'],
  deber:         ['|', '║', '─', '═', '+', '╬', '┼', '▪', '╋', '┃', '━', '▬'],
  amor:          ['♡', '♥', '❀', '❀', '✾', '♦', '◈', '⊛', '❋', '✦', '❤', '❥'],
  honor:         ['★', '☆', '✦', '✧', '✶', '✷', '✸', '✹', '✺', '✻', '✼', '✽'],
  duelo:         ['·', '.', '…', '‥', '⋯', '○', '◌', '∅', '⊘', '⊗', '×', '✗'],
  tristeza:      ['∿', '≋', '〰', '⌇', '~', '≈', '⋯', '…', '‥', '·', '∽', '〜'],
  'resignación': ['─', '—', '═', '≡', '‒', '−', '∥', '∦', '⊖', '⊟', '□', '▭'],
  furia:         ['▶', '►', '⇒', '→', '⟹', '⟶', '▸', '▷', '⬆', '⬇', '↗', '↘'],
  'frustración': ['✗', '✘', '×', '✕', '⊗', '⊘', '⊙', '⊚', '⊛', '◎', '●', '◉'],
  optimismo:     ['↑', '⬆', '↗', '⤴', '⇑', '▲', '△', '▵', '◯', '☉', '○', '⊙'],
  'alegría':     ['❀', '❀', '✾', '⁕', '✦', '✧', '⊛', '❋', '❊', '❉', '❈', '❇'],
  neutral:       ['·', '|', '─', '+', '·', ':', '·', '-', '·', '|', '·', '+'],
};

const SERI_CHARS: Record<SemanticField, string[]> = {
  nostalgia:     ['◌', '○', '◦', '∘', '⊙', '◎', '○', '◯'],
  inseguridad:   ['?', '≈', '∿', '〰', '⋰', '⋱', '⁇', '⁈'],
  miedo:         ['■', '▪', '▬', '▮', '█', '▉', '▊', '▌'],
  deber:         ['║', '│', '┃', '━', '═', '╬', '╋', '┼'],
  amor:          ['♥', '❤', '♡', '❥', '❀', '❀', '♦', '◈'],
  honor:         ['★', '✦', '✧', '✶', '✷', '✸', '✹', '☆'],
  duelo:         ['·', '○', '∅', '⊘', '×', '✗', '□', '▭'],
  tristeza:      ['∿', '〰', '≋', '⌇', '~', '≈', '∽', '〜'],
  'resignación': ['─', '═', '≡', '∥', '⊖', '□', '▭', '―'],
  furia:         ['►', '⇒', '⟹', '▸', '▶', '→', '⬆', '↗'],
  'frustración': ['✗', '×', '⊗', '⊘', '✘', '✕', '⊙', '◎'],
  optimismo:     ['↑', '▲', '△', '⬆', '↗', '⤴', '⇑', '○'],
  'alegría':     ['❀', '❀', '✦', '⊛', '❋', '✧', '❊', '❉'],
  neutral:       ['│', '─', '┼', '╋', '╪', '╫', '+', '×'],
};

// ─── Color helpers ────────────────────────────────────────────────────────────

function rgba(c: FieldColor, alpha: number): string {
  return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, alpha))})`;
}

function pergaminoColor(field: SemanticField, alpha: number): string {
  const colors: Record<SemanticField, FieldColor> = {
    nostalgia:     { r: 155, g:  95, b:  35 },
    inseguridad:   { r:  80, g: 100, b:  75 },
    miedo:         { r:  65, g:  10, b:  90 },
    deber:         { r:  30, g:  60, b: 125 },
    amor:          { r: 185, g:  40, b:  75 },
    honor:         { r: 170, g: 130, b:   5 },
    duelo:         { r:  40, g:  35, b:  50 },
    tristeza:      { r:  40, g:  70, b: 155 },
    'resignación': { r: 110, g:  85, b: 140 },
    furia:         { r: 195, g:  15, b:   5 },
    'frustración': { r: 160, g:  60, b:   5 },
    optimismo:     { r:  70, g: 155, b:  25 },
    'alegría':     { r: 215, g: 165, b:   0 },
    neutral:       { r: 100, g:  80, b:  60 },
  };
  return rgba(colors[field], alpha);
}

function pergaminoColorRaw(field: SemanticField): FieldColor {
  const colors: Record<SemanticField, FieldColor> = {
    nostalgia:     { r: 155, g:  95, b:  35 },
    inseguridad:   { r:  80, g: 100, b:  75 },
    miedo:         { r:  65, g:  10, b:  90 },
    deber:         { r:  30, g:  60, b: 125 },
    amor:          { r: 185, g:  40, b:  75 },
    honor:         { r: 170, g: 130, b:   5 },
    duelo:         { r:  40, g:  35, b:  50 },
    tristeza:      { r:  40, g:  70, b: 155 },
    'resignación': { r: 110, g:  85, b: 140 },
    furia:         { r: 195, g:  15, b:   5 },
    'frustración': { r: 160, g:  60, b:   5 },
    optimismo:     { r:  70, g: 155, b:  25 },
    'alegría':     { r: 215, g: 165, b:   0 },
    neutral:       { r: 100, g:  80, b:  60 },
  };
  return colors[field];
}

function serigrafiaColor(field: SemanticField, alpha: number): string {
  const colors: Record<SemanticField, FieldColor> = {
    nostalgia:     { r: 145, g:  85, b:  25 },
    inseguridad:   { r:  60, g:  80, b:  60 },
    miedo:         { r:  70, g:   0, b: 110 },
    deber:         { r:   0, g:  45, b: 140 },
    amor:          { r: 215, g:  15, b:  70 },
    honor:         { r: 185, g: 145, b:   0 },
    duelo:         { r:  25, g:  20, b:  35 },
    tristeza:      { r:  20, g:  55, b: 165 },
    'resignación': { r:  85, g:  60, b: 125 },
    furia:         { r: 220, g:   0, b:   0 },
    'frustración': { r: 175, g:  50, b:   0 },
    optimismo:     { r:  45, g: 175, b:  15 },
    'alegría':     { r: 210, g: 180, b:   0 },
    neutral:       { r:  50, g:  50, b:  50 },
  };
  return rgba(colors[field], alpha);
}

function serigrafiaColorRaw(field: SemanticField): FieldColor {
  const colors: Record<SemanticField, FieldColor> = {
    nostalgia:     { r: 145, g:  85, b:  25 },
    inseguridad:   { r:  60, g:  80, b:  60 },
    miedo:         { r:  70, g:   0, b: 110 },
    deber:         { r:   0, g:  45, b: 140 },
    amor:          { r: 215, g:  15, b:  70 },
    honor:         { r: 185, g: 145, b:   0 },
    duelo:         { r:  25, g:  20, b:  35 },
    tristeza:      { r:  20, g:  55, b: 165 },
    'resignación': { r:  85, g:  60, b: 125 },
    furia:         { r: 220, g:   0, b:   0 },
    'frustración': { r: 175, g:  50, b:   0 },
    optimismo:     { r:  45, g: 175, b:  15 },
    'alegría':     { r: 210, g: 180, b:   0 },
    neutral:       { r:  50, g:  50, b:  50 },
  };
  return colors[field];
}

// ─── Syntagma bar partitioning ────────────────────────────────────────────

// Partitions `totalBars` proportionally across syntagmas by syllable count.
// Returns an array of { color, field } with length == totalBars.
function computeBarInfo(
  syntagmas: ParsedSyntagma[],
  totalBars: number,
): { color: FieldColor; field: SemanticField }[] {
  if (!syntagmas.length) {
    return Array(totalBars).fill({ color: { r: 155, g: 150, b: 140 }, field: 'neutral' as SemanticField });
  }

  const totalSyl = syntagmas.reduce((s, sg) => s + sg.syllables, 0) || 1;
  const result: { color: FieldColor; field: SemanticField }[] = [];
  let allocated = 0;

  for (let i = 0; i < syntagmas.length; i++) {
    const sg = syntagmas[i];
    const effectiveColor = sg.rhymeColor ?? sg.fieldColor;
    let n: number;
    if (i === syntagmas.length - 1) {
      n = totalBars - allocated;
    } else {
      n = Math.max(1, Math.round((sg.syllables / totalSyl) * totalBars));
      // Don't over-allocate
      n = Math.min(n, totalBars - allocated - (syntagmas.length - 1 - i));
    }
    n = Math.max(1, n);
    for (let k = 0; k < n; k++) {
      result.push({ color: effectiveColor, field: sg.field });
    }
    allocated += n;
  }

  // Trim or pad to exact length
  while (result.length < totalBars) result.push(result[result.length - 1] ?? { color: { r: 155, g: 150, b: 140 }, field: 'neutral' as SemanticField });
  return result.slice(0, totalBars);
}

// ─── Layout calculation ────────────────────────────────────────────────────────────────

interface ColumnLayout {
  verse: ParsedVerse;
  x: number;
  slotWidth: number;
  stanzaBreakAfter: boolean;
}

function computeLayout(poem: ParsedPoem, canvasW: number): ColumnLayout[] {
  const totalVerses = poem.allVerses.length;
  if (!totalVerses) return [];

  const stanzaGap = Math.max(10, canvasW * 0.025);
  const numGaps = poem.stanzas.length - 1;
  const usableWidth = canvasW - numGaps * stanzaGap;
  const slotWidth = usableWidth / totalVerses;

  const layout: ColumnLayout[] = [];
  let x = 0;
  let stanzaIdx = 0;

  for (const stanza of poem.stanzas) {
    for (let vi = 0; vi < stanza.verses.length; vi++) {
      const verse = stanza.verses[vi];
      const isLastInStanza = vi === stanza.verses.length - 1;
      const isLastStanza = stanzaIdx === poem.stanzas.length - 1;
      layout.push({
        verse,
        x,
        slotWidth,
        stanzaBreakAfter: isLastInStanza && !isLastStanza,
      });
      x += slotWidth;
    }
    if (stanzaIdx < poem.stanzas.length - 1) x += stanzaGap;
    stanzaIdx++;
  }

  return layout;
}

// ─── Drawers ────────────────────────────────────────────────────────────────────────────────

function drawBlocks(
  ctx: CanvasRenderingContext2D,
  layout: ColumnLayout[],
  poem: ParsedPoem,
  t: number,
  W: number,
  H: number,
) {
  ctx.fillStyle = '#faf8f4';
  ctx.fillRect(0, 0, W, H);

  const PADDING_TOP = H * 0.06;
  const PADDING_BOT = H * 0.08;
  const availH = H - PADDING_TOP - PADDING_BOT;

  // Stanza breath glow
  const stanzaGap = W * 0.025;
  for (let si = 0; si < poem.stanzas.length - 1; si++) {
    const stanzaVerses = poem.stanzas.slice(0, si + 1).flatMap(s => s.verses);
    const gapX = stanzaVerses.length * (layout[0]?.slotWidth || 20) + si * stanzaGap;
    const contrast = poem.stanzas[si + 1]?.contrastWithPrev ?? 0.3;
    const pulse = (Math.sin(t * (0.4 + contrast * 0.6) + si) + 1) / 2;
    const glowAlpha = 0.03 + pulse * 0.05;
    const grad = ctx.createLinearGradient(gapX - stanzaGap * 0.5, 0, gapX + stanzaGap * 1.5, 0);
    grad.addColorStop(0, `rgba(13,82,161,0)`);
    grad.addColorStop(0.5, `rgba(13,82,161,${glowAlpha})`);
    grad.addColorStop(1, `rgba(13,82,161,0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(gapX - stanzaGap, 0, stanzaGap * 3, H);
  }

  // Meter baseline
  {
    const domNorm = poem.form.dominantMeter / poem.maxSyllables;
    const baselineY = PADDING_TOP + availH * (0.15 + domNorm * 0.85);
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(13,82,161,0.15)';
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, baselineY);
    ctx.lineTo(W, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  for (const col of layout) {
    const v = col.verse;
    const { x, slotWidth } = col;

    if (v.isMetricalAnomaly) {
      const glowGrad = ctx.createLinearGradient(x, 0, x + slotWidth, 0);
      glowGrad.addColorStop(0, 'rgba(13,82,161,0)');
      glowGrad.addColorStop(0.5, rgba(v.fieldColor, 0.06));
      glowGrad.addColorStop(1, 'rgba(13,82,161,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x, PADDING_TOP, slotWidth, availH * 0.9);
    }

    const colHeight = PADDING_TOP + availH * (0.15 + v.normalizedSyllables * 0.85);
    const baseWidth = slotWidth * 0.72;
    const numRects = v.syllables;
    if (numRects === 0) continue;

    const rectH = (colHeight - PADDING_TOP) / numRects * 0.76;
    const rectGap = (colHeight - PADDING_TOP) / numRects * 0.24;

    const baseOpacity = v.isEnjambment ? 0.50 : v.isExclamatory ? 0.95 : 0.80;
    const amplitudeMult = v.isExclamatory ? 1.2 : v.isEnjambment ? 0.65 : 1.0;

    // Compute per-bar syntagma colors
    const barInfo = computeBarInfo(v.syntagmas, numRects);

    for (let ri = 0; ri < numRects; ri++) {
      const phase = t * v.speed + v.phase + ri * 0.42;
      const wave = (Math.sin(phase) + 1) / 2;

      const rw = baseWidth * amplitudeMult;
      const maxDrift = Math.max(0, (slotWidth - rw) / 2 * 0.85);
      const drift = (wave * 2 - 1) * maxDrift;

      const alpha = baseOpacity * (0.65 + 0.35 * Math.sin(phase + Math.PI * 0.35));

      const rx = x + (slotWidth - rw) / 2 + drift;
      const ry = PADDING_TOP + ri * (rectH + rectGap);

      // Use syntagma color for this block
      const barColor = barInfo[ri]?.color ?? v.fieldColor;
      ctx.fillStyle = rgba(barColor, alpha);
      ctx.fillRect(rx, ry, rw, rectH);
    }

    // Ghost mark for short verses
    const avgSyl = poem.avgSyllables;
    if (v.syllables < avgSyl * 0.65 && !v.isEnjambment) {
      const ghostY = PADDING_TOP + availH * 0.92;
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = rgba(v.fieldColor, 0.18);
      ctx.lineWidth = 0.5;
      ctx.moveTo(x + slotWidth * 0.2, ghostY);
      ctx.lineTo(x + slotWidth * 0.8, ghostY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawPergamino(
  ctx: CanvasRenderingContext2D,
  layout: ColumnLayout[],
  poem: ParsedPoem,
  t: number,
  W: number,
  H: number,
) {
  ctx.fillStyle = '#F2EDE3';
  ctx.fillRect(0, 0, W, H);

  const PADDING_TOP = H * 0.06;
  const PADDING_BOT = H * 0.08;
  const availH = H - PADDING_TOP - PADDING_BOT;

  const fontSize = Math.max(9, Math.min(15, W / (layout.length * 1.4)));
  ctx.font = `${fontSize}px 'Courier New', monospace`;

  // Grain texture
  for (const col of layout) {
    const v = col.verse;
    const numGrains = Math.floor(v.density * 40);
    for (let g = 0; g < numGrains; g++) {
      const gx = col.x + Math.random() * col.slotWidth;
      const gy = PADDING_TOP + Math.random() * availH * v.normalizedSyllables;
      ctx.fillStyle = `rgba(90,70,50,${Math.random() * 0.06})`;
      ctx.fillRect(gx, gy, 1, 1);
    }
  }

  // Meter baseline
  {
    const domNorm = poem.form.dominantMeter / poem.maxSyllables;
    const baselineY = PADDING_TOP + availH * (0.15 + domNorm * 0.85);
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = 'rgba(100,80,60,0.20)';
    ctx.lineWidth = 0.6;
    ctx.moveTo(0, baselineY);
    ctx.lineTo(W, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  for (const col of layout) {
    const v = col.verse;
    const { x, slotWidth } = col;

    const colHeight = availH * (0.15 + v.normalizedSyllables * 0.85);
    const numBars = v.syllables;
    if (numBars === 0) continue;

    const barSpacing = colHeight / numBars;
    const drift = slotWidth * 0.12;
    const baseOpacity = v.isEnjambment ? 0.55 : v.isExclamatory ? 1.0 : 0.85;

    // Per-bar syntagma info (color + field for ASCII set)
    const barInfo = computeBarInfo(v.syntagmas, numBars);

    for (let ri = 0; ri < numBars; ri++) {
      const phase = t * v.speed + v.phase + ri * 0.31;
      const wave = (Math.sin(phase) + 1) / 2;
      const alpha = baseOpacity * (0.35 + 0.65 * wave);

      const dx = Math.sin(phase * 0.7 + ri * 0.15) * drift;

      // Use the syntagma's field for its ASCII character set
      const barField = barInfo[ri]?.field ?? v.field;
      const charSet = ASCII_CHARS[barField];
      const charIdx = Math.floor((t * 1.8 + ri * 7 + v.verseIndex * 13) * (1 - v.density * 0.6)) % charSet.length;
      const char = charSet[Math.abs(charIdx)];

      const cx = x + slotWidth / 2 + dx;
      const cy = PADDING_TOP + ri * barSpacing + barSpacing * 0.5;

      // Use syntagma color but in pergamino palette
      const barColor = barInfo[ri]?.color ?? v.fieldColor;
      // If this bar has a rhyme color, use it directly; otherwise use pergamino palette
      const syntagma = v.syntagmas.length > 0 ? getSyntagmaForBar(v.syntagmas, numBars, ri) : null;
      const isRhymeColored = syntagma?.rhymeColor != null;

      if (isRhymeColored && syntagma?.rhymeColor) {
        ctx.fillStyle = rgba(syntagma.rhymeColor, alpha);
      } else {
        ctx.fillStyle = pergaminoColor(barField, alpha);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, cx, cy);
    }

    // Ghost line
    if (v.syllables < poem.avgSyllables * 0.65) {
      const dotY = PADDING_TOP + colHeight + barSpacing;
      ctx.fillStyle = pergaminoColor(v.field, 0.20);
      ctx.textAlign = 'center';
      ctx.fillText('·', x + slotWidth / 2, dotY);
    }
  }

  // Stanza separators
  const stanzaGap = W * 0.025;
  let runningX = 0;
  for (let si = 0; si < poem.stanzas.length - 1; si++) {
    const verses = poem.stanzas.slice(0, si + 1).flatMap(s => s.verses);
    runningX = verses.length * (layout[0]?.slotWidth || 20) + si * stanzaGap;
    const contrast = poem.stanzas[si + 1]?.contrastWithPrev ?? 0.3;
    const pulse = (Math.sin(t * (0.5 + contrast * 0.4)) + 1) / 2;
    ctx.beginPath();
    ctx.setLineDash([3, 8]);
    ctx.strokeStyle = `rgba(100,80,60,${0.12 + pulse * 0.1})`;
    ctx.lineWidth = 0.8;
    ctx.moveTo(runningX + stanzaGap * 0.5, PADDING_TOP * 0.6);
    ctx.lineTo(runningX + stanzaGap * 0.5, H - PADDING_BOT * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawSerigrafia(
  ctx: CanvasRenderingContext2D,
  layout: ColumnLayout[],
  poem: ParsedPoem,
  t: number,
  W: number,
  H: number,
) {
  ctx.fillStyle = '#faf8f4';
  ctx.fillRect(0, 0, W, H);

  const PADDING_TOP = H * 0.06;
  const PADDING_BOT = H * 0.08;
  const availH = H - PADDING_TOP - PADDING_BOT;

  const fontSize = Math.max(7, Math.min(14, W / (layout.length * 1.3)));
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;

  // Meter baseline
  {
    const domNorm = poem.form.dominantMeter / poem.maxSyllables;
    const baselineY = PADDING_TOP + availH * (0.15 + domNorm * 0.85);
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(13,82,161,0.15)';
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, baselineY);
    ctx.lineTo(W, baselineY);
    ctx.stroke();
    ctx.restore();
  }

  const LAYER_COUNT = 3;
  const LAYER_PHASE_OFFSETS = [0, 1.1, 2.2];

  for (const col of layout) {
    const v = col.verse;
    const { x, slotWidth } = col;

    const colHeight = availH * (0.15 + v.normalizedSyllables * 0.85);
    const numBars = v.syllables;
    if (numBars === 0) continue;

    const barSpacing = colHeight / numBars;
    const layerSpread = fontSize * 0.55;

    // Per-bar syntagma info
    const barInfo = computeBarInfo(v.syntagmas, numBars);

    for (let ri = 0; ri < numBars; ri++) {
      const barField = barInfo[ri]?.field ?? v.field;
      const syntagma = v.syntagmas.length > 0 ? getSyntagmaForBar(v.syntagmas, numBars, ri) : null;
      const isRhymeColored = syntagma?.rhymeColor != null;
      const charSet = SERI_CHARS[barField];

      for (let li = 0; li < LAYER_COUNT; li++) {
        const phase = t * v.speed + v.phase + ri * 0.28 + LAYER_PHASE_OFFSETS[li];
        const wave = (Math.sin(phase) + 1) / 2;
        const baseOpacity = v.isEnjambment ? 0.55 : v.isExclamatory ? 1.0 : 0.82;
        const alpha = baseOpacity * (0.55 + 0.45 * wave);

        const charIdx = Math.floor((ri * 3 + v.verseIndex * 7 + li * 5) % charSet.length);
        const char = charSet[charIdx];

        const xOffset = (li - 1) * layerSpread;
        const cx = x + slotWidth / 2 + xOffset;
        const cy = PADDING_TOP + ri * barSpacing + barSpacing * 0.5;

        if (isRhymeColored && syntagma?.rhymeColor) {
          ctx.fillStyle = rgba(syntagma.rhymeColor, alpha);
        } else {
          ctx.fillStyle = serigrafiaColor(barField, alpha);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, cx, cy);
      }
    }
  }

  // Stanza markers
  const stanzaGap = W * 0.025;
  for (let si = 0; si < poem.stanzas.length - 1; si++) {
    const verses = poem.stanzas.slice(0, si + 1).flatMap(s => s.verses);
    const gapX = verses.length * (layout[0]?.slotWidth || 20) + si * stanzaGap + stanzaGap * 0.5;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(13,82,161,0.12)';
    ctx.lineWidth = 0.5;
    ctx.moveTo(gapX, PADDING_TOP * 0.5);
    ctx.lineTo(gapX, H - PADDING_BOT * 0.5);
    ctx.stroke();
  }
}

// Helper: find the syntagma that owns bar `ri` out of `totalBars`
function getSyntagmaForBar(
  syntagmas: ParsedSyntagma[],
  totalBars: number,
  ri: number,
): ParsedSyntagma | null {
  if (!syntagmas.length) return null;
  const totalSyl = syntagmas.reduce((s, sg) => s + sg.syllables, 0) || 1;
  let allocated = 0;
  for (let i = 0; i < syntagmas.length; i++) {
    const sg = syntagmas[i];
    let n: number;
    if (i === syntagmas.length - 1) {
      n = totalBars - allocated;
    } else {
      n = Math.max(1, Math.round((sg.syllables / totalSyl) * totalBars));
      n = Math.min(n, totalBars - allocated - (syntagmas.length - 1 - i));
    }
    n = Math.max(1, n);
    if (ri < allocated + n) return sg;
    allocated += n;
  }
  return syntagmas[syntagmas.length - 1] ?? null;
}

// ─── Component ─────────────────────────────────────────────────────────────────────────────────

export default function PoemVisualizer({ poem, mode, width = 900, height = 520 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const layoutRef = useRef<ColumnLayout[]>([]);

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!startRef.current) startRef.current = timestamp;
      const t = (timestamp - startRef.current) * 0.001;

      const W = canvas.width;
      const H = canvas.height;
      const layout = layoutRef.current;

      if (mode === 'blocks') drawBlocks(ctx, layout, poem, t, W, H);
      else if (mode === 'pergamino') drawPergamino(ctx, layout, poem, t, W, H);
      else drawSerigrafia(ctx, layout, poem, t, W, H);

      rafRef.current = requestAnimationFrame(draw);
    },
    [poem, mode],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    layoutRef.current = computeLayout(poem, canvas.width);
    startRef.current = 0;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [poem, mode, draw, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
}
