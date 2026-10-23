import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme.js';
import {Kicker} from './Cards.jsx';

// A process chain: boxes linked by arrows, with units flowing between them.
// Each step lights up as the hosts mention it. props: kicker, title, steps [{label, detail, say}]
export const Flow = ({kicker, title, steps = [], itemFrames = []}) => {
  const frame = useCurrentFrame();
  const n = Math.max(1, steps.length);
  const gap = 70;
  const boxW = Math.min(330, (1600 - gap * (n - 1)) / n);
  const total = boxW * n + gap * (n - 1);
  const left = (1920 - total) / 2;
  const top = 470, boxH = 220;
  let active = -1;
  itemFrames.forEach((f, i) => { if (frame >= f) active = i; });
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 160, top: 190, maxWidth: 1500}}>
        {kicker && <Kicker>{kicker}</Kicker>}
        {title && <div style={{color: C.white, fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 18}}>{title}</div>}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {steps.slice(0, -1).map((_, i) => {
          const xA = left + boxW * (i + 1) + gap * i + 8, xB = xA + gap - 16, y = top + boxH / 2;
          const appear = interpolate(frame, [14 + i * 6, 26 + i * 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const lit = i < active;
          return (
            <g key={i} opacity={appear}>
              <line x1={xA} y1={y} x2={xB - 8} y2={y} stroke={lit ? C.amber : C.muted} strokeWidth={6} strokeLinecap="round" />
              <path d={`M${xB - 14},${y - 12} L${xB},${y} L${xB - 14},${y + 12}`} fill="none" stroke={lit ? C.amber : C.muted} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              {[0, 1].map((k) => {
                const f = ((frame / 26 + k / 2 + i * 0.3) % 1);
                return <circle key={k} cx={xA + (xB - xA) * f} cy={y} r={6} fill={lit ? C.white : C.teal} opacity={0.9} />;
              })}
            </g>
          );
        })}
      </svg>
      {steps.map((st, i) => {
        const appear = interpolate(frame, [8 + i * 6, 22 + i * 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const isOn = i === active;
        const done = i < active;
        return (
          <div key={i} style={{
            position: 'absolute', left: left + i * (boxW + gap), top, width: boxW, height: boxH, borderRadius: 22,
            background: isOn ? 'rgba(242,163,58,0.16)' : 'rgba(20,34,54,0.85)', border: `3px solid ${isOn ? C.amber : done ? 'rgba(242,163,58,0.5)' : C.line}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 26px', boxSizing: 'border-box',
            opacity: appear, transform: `translateY(${(1 - appear) * 30}px) scale(${isOn ? 1.05 : 1})`,
          }}>
            <div style={{color: C.amber, fontSize: 24, fontWeight: 800, letterSpacing: 2}}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{color: C.white, fontSize: boxW < 280 ? 30 : 36, fontWeight: 800, lineHeight: 1.15, marginTop: 8}}>{st.label}</div>
            {st.detail && <div style={{color: C.muted, fontSize: 24, fontWeight: 500, marginTop: 8, lineHeight: 1.25}}>{st.detail}</div>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
