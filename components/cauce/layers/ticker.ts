// One requestAnimationFrame loop for the whole stage. Subscribers declare the
// frame rate they need; lower-priority numbers run first in each frame.

type Sub = { interval: number; last: number; priority: number; cb: (now: number) => void };

const subs: Sub[] = [];
let raf = 0;

function loop(now: number) {
  for (const s of subs) {
    if (now - s.last >= s.interval - 2) {
      s.last = now;
      s.cb(now);
    }
  }
  raf = subs.length ? requestAnimationFrame(loop) : 0;
}

export function subscribe(fps: number, cb: (now: number) => void, priority = 10): () => void {
  const sub: Sub = { interval: 1000 / Math.max(1, fps), last: -Infinity, priority, cb };
  subs.push(sub);
  subs.sort((a, b) => a.priority - b.priority);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    const i = subs.indexOf(sub);
    if (i >= 0) subs.splice(i, 1);
    if (!subs.length && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
