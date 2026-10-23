import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT, fmt} from '../theme.js';
import {useEnter} from '../components/Scene.jsx';
import {Kicker, Source} from './Cards.jsx';

export const Stat = ({kicker, value, decimals = 0, prefix = '', suffix = '', label, note, source}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [6, 46], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const eased = 1 - Math.pow(1 - x, 4);
  const shown = fmt(value * eased, decimals);
  const p = useEnter(8, 20);
  const q = useEnter(30, 20);
  return (
    <AbsoluteFill style={{padding: '180px 160px 190px 160px', justifyContent: 'center', fontFamily: FONT}}>
      {kicker && <Kicker>{kicker}</Kicker>}
      <div style={{display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10, color: C.white}}>
        {prefix && <span style={{fontSize: 90, fontWeight: 700, color: C.muted}}>{prefix}</span>}
        <span style={{fontSize: 260, fontWeight: 900, letterSpacing: -6, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>{shown}</span>
        {suffix && <span style={{fontSize: 120, fontWeight: 900, color: C.amber}}>{suffix}</span>}
      </div>
      <div style={{color: C.white, fontSize: 52, fontWeight: 700, marginTop: 18, opacity: p, transform: `translateY(${(1 - p) * 20}px)`}}>{label}</div>
      {note && <div style={{color: C.white, opacity: 0.7 * q, fontSize: 34, fontWeight: 500, marginTop: 20, maxWidth: 1400}}>{note}</div>}
      <Source delay={36}>{source}</Source>
    </AbsoluteFill>
  );
};
