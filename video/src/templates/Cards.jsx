import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../theme.js';
import {useEnter} from '../components/Scene.jsx';

const Stage = ({children}) => (
  <AbsoluteFill style={{padding: '180px 160px 190px 160px', justifyContent: 'center', fontFamily: FONT}}>{children}</AbsoluteFill>
);

export const Kicker = ({children, delay = 0}) => {
  const p = useEnter(delay, 14);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 16, opacity: p, transform: `translateX(${(1 - p) * -30}px)`}}>
      <div style={{width: 48 * p, height: 6, background: C.amber, borderRadius: 3}} />
      <div style={{color: C.amber, fontSize: 30, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase'}}>{children}</div>
    </div>
  );
};

export const Source = ({children, delay = 20}) => {
  const p = useEnter(delay, 14);
  if (!children) return null;
  return <div style={{color: C.muted, fontSize: 24, fontWeight: 500, marginTop: 36, opacity: p}}>Source: {children}</div>;
};

export const Headline = ({kicker, title, detail, source}) => {
  const p = useEnter(4, 22);
  const q = useEnter(14, 20);
  return (
    <Stage>
      {kicker && <Kicker>{kicker}</Kicker>}
      <div style={{color: C.white, fontSize: 84, fontWeight: 900, lineHeight: 1.08, marginTop: 28, maxWidth: 1500, opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
        {title}
      </div>
      {detail && (
        <div style={{color: C.white, opacity: 0.75 * q, fontSize: 38, fontWeight: 500, lineHeight: 1.3, marginTop: 30, maxWidth: 1400}}>{detail}</div>
      )}
      <Source>{source}</Source>
    </Stage>
  );
};

export const Takeaway = ({kicker, text}) => {
  const p = useEnter(4, 24);
  return (
    <Stage>
      <div style={{borderLeft: `10px solid ${C.amber}`, paddingLeft: 56, opacity: p, transform: `translateX(${(1 - p) * 40}px)`}}>
        {kicker && <div style={{color: C.amber, fontSize: 30, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase'}}>{kicker}</div>}
        <div style={{color: C.white, fontSize: 76, fontWeight: 800, lineHeight: 1.15, marginTop: 22, maxWidth: 1450}}>{text}</div>
      </div>
    </Stage>
  );
};

export const QuickHit = ({n, text}) => {
  const p = useEnter(0, 16);
  const q = useEnter(6, 20);
  return (
    <Stage>
      <Kicker>Quick hits</Kicker>
      <div style={{display: 'flex', alignItems: 'center', gap: 48, marginTop: 40}}>
        <div style={{
          width: 170, height: 170, flex: '0 0 170px', borderRadius: 32, background: C.amber, color: C.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 104, fontWeight: 900,
          transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -12}deg)`, opacity: p,
        }}>{n}</div>
        <div style={{color: C.white, fontSize: 60, fontWeight: 700, lineHeight: 1.18, maxWidth: 1300, opacity: q, transform: `translateX(${(1 - q) * 40}px)`}}>
          {text}
        </div>
      </div>
    </Stage>
  );
};
