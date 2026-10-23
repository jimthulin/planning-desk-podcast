import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme.js';
import {Kicker} from './Cards.jsx';

export const ListCard = ({title, items = [], footer}) => {
  const frame = useCurrentFrame();
  const big = items.length <= 4;
  return (
    <AbsoluteFill style={{padding: '170px 160px 190px 160px', justifyContent: 'center', fontFamily: FONT}}>
      <Kicker>{title}</Kicker>
      <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: big ? 30 : 20}}>
        {items.map((it, i) => {
          const start = 8 + i * 7;
          const x = interpolate(frame, [start, start + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const e = 1 - Math.pow(1 - x, 3);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 40, opacity: e, transform: `translateX(${(1 - e) * 50}px)`}}>
              <div style={{minWidth: big ? 300 : 260, color: C.amber, fontSize: big ? 44 : 34, fontWeight: 800}}>{it.label}</div>
              <div style={{color: C.white, fontSize: big ? 48 : 38, fontWeight: 600, lineHeight: 1.2}}>{it.detail}</div>
            </div>
          );
        })}
      </div>
      {footer && <div style={{color: C.muted, fontSize: 26, marginTop: 40}}>{footer}</div>}
    </AbsoluteFill>
  );
};
