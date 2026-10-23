import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme.js';
import {Kicker} from './Cards.jsx';

// Dated events on a line. The line fills up to each event as the hosts reach it.
// props: kicker, title, items [{label (date), detail, alert, say}]
export const Timeline = ({kicker, title, items = [], itemFrames = []}) => {
  const frame = useCurrentFrame();
  const n = items.length;
  const x0 = 220, x1 = 1700, y = 610;
  const xs = items.map((_, i) => (n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1)));
  let active = -1;
  itemFrames.forEach((f, i) => { if (frame >= f) active = i; });
  const draw = interpolate(frame, [4, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fillTo = active < 0 ? x0 : interpolate(frame, [itemFrames[active], itemFrames[active] + 14], [active > 0 ? xs[active - 1] : x0, xs[active]], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 160, top: 190, maxWidth: 1500}}>
        {kicker && <Kicker>{kicker}</Kicker>}
        {title && <div style={{color: C.white, fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 18}}>{title}</div>}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * draw} y2={y} stroke="rgba(138,152,170,0.35)" strokeWidth={8} strokeLinecap="round" />
        <line x1={x0} y1={y} x2={fillTo} y2={y} stroke={C.amber} strokeWidth={8} strokeLinecap="round" />
        {items.map((it, i) => {
          const appear = interpolate(frame, [10 + i * 6, 22 + i * 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const reached = i <= active;
          const isOn = i === active;
          const pulse = isOn ? (frame % 40) / 40 : 0;
          const color = it.alert ? C.red : reached ? C.amber : C.muted;
          return (
            <g key={i} opacity={appear}>
              {isOn && <circle cx={xs[i]} cy={y} r={20 + pulse * 30} fill="none" stroke={color} strokeWidth={4} strokeOpacity={1 - pulse} />}
              <circle cx={xs[i]} cy={y} r={isOn ? 20 : 14} fill={reached ? color : C.ink} stroke={color} strokeWidth={5} />
            </g>
          );
        })}
      </svg>
      {items.map((it, i) => {
        const appear = interpolate(frame, [12 + i * 6, 26 + i * 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const isOn = i === active;
        const above = i % 2 === 0;
        return (
          <div key={i} style={{
            position: 'absolute', left: xs[i] - 170, width: 340, textAlign: 'center',
            top: above ? y - 190 : y + 44, opacity: appear * (active >= 0 && !isOn ? 0.55 : 1),
            transform: `translateY(${(1 - appear) * (above ? -16 : 16)}px) scale(${isOn ? 1.06 : 1})`,
          }}>
            <div style={{color: it.alert ? C.red : C.amber, fontSize: 32, fontWeight: 800}}>{it.label}</div>
            <div style={{color: C.white, fontSize: 30, fontWeight: 600, lineHeight: 1.25, marginTop: 8}}>{it.detail}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
