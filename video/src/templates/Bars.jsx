import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT, fmt} from '../theme.js';
import {Kicker, Source} from './Cards.jsx';
import {useLayout} from '../layout.js';

export const Bars = ({kicker, title, items = [], decimals = 0, baseline, source}) => {
  const frame = useCurrentFrame();
  const {v} = useLayout();
  const max = Math.max(...items.map((i) => i.value)) * 1.08;
  const min = baseline !== undefined ? Math.min(baseline - (max - baseline) * 0.25, ...items.map((i) => i.value)) : 0;
  const trackW = v ? 690 : 900;
  const scale = (v) => ((v - min) / (max - min)) * trackW;
  return (
    <AbsoluteFill style={{padding: v ? '20px 90px 20px 70px' : '170px 160px 190px 160px', justifyContent: 'center', fontFamily: FONT}}>
      {kicker && <Kicker>{kicker}</Kicker>}
      {title && <div style={{color: C.white, fontSize: v ? 52 : 56, fontWeight: 800, marginTop: 20, lineHeight: 1.1}}>{title}</div>}
      <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: v ? 30 : 34, position: 'relative'}}>
        {items.map((it, i) => {
          const start = 10 + i * 8;
          const x = interpolate(frame, [start, start + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const e = 1 - Math.pow(1 - x, 3);
          const w = Math.max(8, scale(it.value) * e);
          return (
            <div key={i} style={{display: 'flex', flexWrap: v ? 'wrap' : 'nowrap', alignItems: 'center', columnGap: v ? 24 : 36, rowGap: 10, opacity: Math.min(1, x * 3)}}>
              <div style={{width: v ? '100%' : 400, flexShrink: 0, textAlign: v ? 'left' : 'right', color: it.highlight ? C.white : C.muted, fontSize: 32, fontWeight: it.highlight ? 700 : 500}}>{it.label}</div>
              <div style={{position: 'relative', width: trackW, flexShrink: 0, height: 64}}>
                <div style={{position: 'absolute', inset: 0, background: 'rgba(138,152,170,0.10)', borderRadius: 12}} />
                <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: w, borderRadius: 12, overflow: 'hidden', background: it.highlight ? C.amber : C.teal}}>
                  {x >= 1 && (
                    <div style={{position: 'absolute', top: 0, bottom: 0, width: 160,
                      left: `${((((frame - start) % 75) / 75) * 140) - 20}%`,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))'}} />
                  )}
                </div>
                {baseline !== undefined && (
                  <div style={{position: 'absolute', left: scale(baseline), top: -10, bottom: -10, width: 3, background: C.white, opacity: 0.6}} />
                )}
              </div>
              <div style={{width: v ? 180 : 200, flexShrink: 0, color: C.white, fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums'}}>{fmt(it.value * e, decimals)}</div>
            </div>
          );
        })}
      </div>
      <Source delay={40}>{source}</Source>
    </AbsoluteFill>
  );
};
