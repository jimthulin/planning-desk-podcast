import React from 'react';
import {C, FONT, segmentLabel} from '../theme.js';

export const Header = ({show, week, segment}) => (
  <div style={{position: 'absolute', top: 48, left: 72, right: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FONT}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div style={{width: 14, height: 44, background: C.amber, borderRadius: 3}} />
      <div>
        <div style={{color: C.white, fontSize: 30, fontWeight: 900, letterSpacing: 1.5}}>{(show || '').toUpperCase()}</div>
        <div style={{color: C.muted, fontSize: 20, fontWeight: 500, marginTop: 2}}>{week}</div>
      </div>
    </div>
    <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
      <div style={{color: C.ink, background: C.amber, fontSize: 22, fontWeight: 800, padding: '10px 22px', borderRadius: 999, letterSpacing: 1, textTransform: 'uppercase'}}>
        {segmentLabel(segment)}
      </div>
      <div style={{color: C.muted, border: `2px solid ${C.line}`, fontSize: 18, fontWeight: 600, padding: '8px 16px', borderRadius: 999}}>
        AI-generated · synthetic voices
      </div>
    </div>
  </div>
);

const Meter = ({active, envelope, frame, color}) => {
  const bars = 7;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 5, height: 40}}>
      {Array.from({length: bars}, (_, i) => {
        const e = envelope[Math.max(0, frame - i * 2)] || 0;
        const wobble = 0.55 + 0.45 * Math.abs(Math.sin((frame + i * 7) * 0.35));
        const h = active ? 6 + 34 * Math.min(1, e * 1.6) * wobble : 6;
        return <div key={i} style={{width: 6, height: h, borderRadius: 3, background: active ? color : 'rgba(138,152,170,0.4)'}} />;
      })}
    </div>
  );
};

const HostTag = ({name, role, active, envelope, frame}) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 18, padding: '14px 26px 14px 22px', borderRadius: 18,
    background: active ? 'rgba(242,163,58,0.12)' : 'rgba(20,34,54,0.75)',
    border: `2px solid ${active ? C.amber : C.line}`, transition: 'none',
  }}>
    <Meter active={active} envelope={envelope} frame={frame} color={C.amber} />
    <div style={{fontFamily: FONT}}>
      <div style={{color: active ? C.white : C.muted, fontSize: 28, fontWeight: 800, letterSpacing: 1}}>{name.toUpperCase()}</div>
      <div style={{color: C.muted, fontSize: 17, fontWeight: 500}}>{role}</div>
    </div>
  </div>
);

export const HostBar = ({speaking, envelope, frame}) => (
  <div style={{position: 'absolute', left: 72, bottom: 52, display: 'flex', gap: 18}}>
    <HostTag name="Anna" role="Host" active={speaking === 'Anna'} envelope={envelope} frame={frame} />
    <HostTag name="Erik" role="Host" active={speaking === 'Erik'} envelope={envelope} frame={frame} />
  </div>
);
