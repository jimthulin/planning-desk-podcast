import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, H, W} from '../theme.js';

// Quiet moving backdrop: a soft gradient, a dot grid and a slowly drifting network.
export const Background = () => {
  const frame = useCurrentFrame();
  const nodes = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({length: 26}, () => ({x: rnd() * W, y: rnd() * H, vx: (rnd() - 0.5) * 0.25, vy: (rnd() - 0.5) * 0.2}));
  }, []);
  const pos = nodes.map((n) => ({
    x: ((n.x + n.vx * frame) % W + W) % W,
    y: ((n.y + n.vy * frame) % H + H) % H,
  }));
  const links = [];
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      if (d < 330) links.push({a: pos[i], b: pos[j], o: (1 - d / 330) * 0.16});
    }
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(1200px 800px at 75% 20%, ${C.ink3} 0%, ${C.ink2} 35%, ${C.ink} 75%)`}} />
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="rgba(138,152,170,0.10)" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#dots)" />
        {links.map((l, i) => (
          <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke={C.muted} strokeOpacity={l.o} strokeWidth={1.5} />
        ))}
        {pos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={i % 5 === 0 ? C.teal : C.muted} fillOpacity={0.35} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
