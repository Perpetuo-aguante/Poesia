'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { INK, mix, rng } from '@/lib/fingerprint';
import { ArtProps } from './types';

// Particles define a vessel by turning around its emptiness. The poem is
// wound along the spiral from base to rim: each particle belongs to a verse
// and a syllable, so the whole poem is literally inside the vessel.

export default function Vasija({ fingerprint: fp, width, height }: ArtProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const count = Math.min(45000, 18000 + fp.verseCount * 1500);
    const random = rng(fp.seed);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#faf8f4');
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.45 },
        pixelRatio: { value: pixelRatio },
        spin: { value: 0.04 + fp.turbulence * 0.16 },
        breathRate: { value: 0.12 + (fp.dominantMeter / 14) * 0.35 },
        breathAmp: { value: 0.06 + fp.enjambment * 0.1 },
        fray: { value: (1 - fp.meterRegularity) * 0.18 },
        scale: { value: Math.min(2.75, 2.75 * (width / height) * 0.75) },
      },
      vertexShader: `
        uniform float time;
        uniform float pixelRatio;
        uniform float spin;
        uniform float breathRate;
        uniform float breathAmp;
        uniform float fray;
        uniform float scale;
        attribute float size;
        attribute float jitter;
        attribute vec3 customColor;
        varying vec3 vColor;

        void main() {
          vColor = customColor;
          vec3 pos = position;
          float radius = length(pos.xz);
          float angle = atan(pos.z, pos.x);
          float vessel = smoothstep(0.3, 0.7, radius) * smoothstep(1.0, 0.7, radius);

          angle += time * spin;
          float space = sin(time * breathRate + radius * 3.0) * breathAmp;
          float wall = jitter * fray * (0.6 + 0.4 * sin(time * 0.7 + jitter * 12.0));
          float newRadius = (radius + space + wall) * vessel;

          vec3 newPos = vec3(cos(angle) * newRadius, pos.y * vessel - 1.2, sin(angle) * newRadius);
          newPos *= scale;

          vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
          gl_PointSize = size * pixelRatio * (64.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = dot(c, c);
          if (d > 0.25) discard;
          gl_FragColor = vec4(vColor, (1.0 - smoothstep(0.2025, 0.25, d)) * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    // Stanza boundaries along the spiral, weighted by how sharply the stanza turns.
    const boundaries: { t: number; contrast: number }[] = [];
    let acc = 0;
    fp.stanzaSizes.forEach((size, i) => {
      if (i > 0) boundaries.push({ t: acc / fp.verseCount, contrast: fp.stanzaContrast[i] ?? 0 });
      acc += size;
    });

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const jitters = new Float32Array(count);
    const turns = 40 + fp.verseCount * 2;

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const vi = Math.min(fp.verseCount - 1, Math.floor(t * fp.verseCount));
      const verse = fp.verses[vi];
      const local = t * fp.verseCount - vi;
      const syl = verse.stress.length ? Math.min(verse.stress.length - 1, Math.floor(local * verse.stress.length)) : 0;
      const stressed = verse.stress[syl] ?? false;

      let pinch = 1;
      for (const b of boundaries) pinch -= 0.12 * b.contrast * Math.exp(-((t - b.t) ** 2) / 0.002);

      const radius = Math.sqrt(t) * pinch + (random() - 0.5) * 0.05;
      const angle = t * Math.PI * turns + (random() - 0.5) * 0.1;
      const h = Math.sin(t * Math.PI) * 1.8;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const tint = mix(INK, verse.color, (stressed ? 0.75 : 0.35) + fp.warmth * 0.15);
      const shade = 0.85 + random() * 0.15;
      colors[i * 3] = (tint.r / 255) * shade;
      colors[i * 3 + 1] = (tint.g / 255) * shade;
      colors[i * 3 + 2] = (tint.b / 255) * shade;

      sizes[i] = ((1 - Math.abs(h * 0.5)) * 0.2 + 0.1) * (stressed ? 1.7 : 1);
      jitters[i] = random() * 2 - 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('jitter', new THREE.BufferAttribute(jitters, 1));
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      material.uniforms.time.value = reduced ? 8 : clock.getElapsedTime();
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [fp, width, height]);

  return <div ref={mountRef} style={{ width, height }} />;
}
