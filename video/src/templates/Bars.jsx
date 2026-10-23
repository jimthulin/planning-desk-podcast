import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT, fmt} from '../theme.js';
import {Kicker, Source} from './Cards.jsx';

export const Bars = ({kicker, title, items = [], decimals = 0, baseline, source}) => {
  const frame = useCurrentFrame();
  const max = Math.max(...items.map((i) => i.value)) * 1.08;
  const min = baseline !== undefined ? Math.min(baseline - (max - baseline) * 0.25, ...items.map((i) => i.value)) : 0;
  const trackW = 900;
  const scale = (v) => ((v - min) / (max - min)) * trackW;
  return (
    <AbsoluteFill style={{padding: '170px 160px 190px 160px', justifyContent: 'center', fontFamily: FONT}}>
      {kicker && <Kicker>{kicker}</Kicker>}
      {title && <div style={{color: C.white, fontSize: 56, fontWeight: 800, marginTop: 20}}>{title}</div>}
      <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 34, position: 'relative'}}>
        {items.map((it, i) => {
          const start = 10 + i * 8;
          const x = interpolate(frame, [start, start + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const e = 1 - Math.pow(1 - x, 3);
          const w = Math.max(8, scale(it.value) * e);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 36, opacity: Math.min(1, x * 3)}}>
              <div style={{width: 400, flexShrink: 0, color: it.highlight ? C.white : C.muted, fontSize: 32, fontWeight: it.highlight ? 700 : 500, textAlign: 'right'}}>{it.label}</div>
              <div style={{position: 'relative', width: trackW, flexShrink: 0, height: 64}}>
                <div style={{position: 'absolute', inset: 0, background: 'rgba(138,152,170,0.10)', borderRadius: 12}} />
                <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: w, borderRadius: 12, background: it.highlight ? C.amber : C.teal}} />
                {baseline !== undefined && (
                  <div style={{position: 'absolute', left: scale(baseline), top: -10, bottom: -10, width: 3, background: C.white, opacity: 0.6}} />
                )}
              </div>
              <div style={{width: 200, flexShrink: 0, color: C.white, fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums'}}>{fmt(it.value * e, decimals)}</div>
            </div>
          );
        })}
      </div>
      <Source delay={40}>{source}</Source>
    </AbsoluteFill>
  );
};
