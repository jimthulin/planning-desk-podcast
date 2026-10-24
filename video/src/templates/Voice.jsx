import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme.js';
import {useEnter} from '../components/Scene.jsx';
import {Words} from './Cards.jsx';

// An expert's view: their point (paraphrase, or a short verbatim quote), then who said it and where.
// Text only, never a photo or logo.
export const Voice = ({name, role, text, verbatim = false, where, dur = 300}) => {
  const frame = useCurrentFrame();
  const words = (text || '').split(' ');
  const perWord = Math.max(3, Math.min(8, Math.floor((dur * 0.45) / Math.max(1, words.length))));
  const after = 10 + words.length * perWord;
  const mark = useEnter(0, 16);
  const who = useEnter(Math.min(after, dur * 0.5), 18);
  const rule = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
  const shown = verbatim ? `“${text}”` : text;
  return (
    <AbsoluteFill style={{padding: '170px 160px 190px 160px', justifyContent: 'center', fontFamily: FONT}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, opacity: mark}}>
        <div style={{width: 48 * rule, height: 6, background: C.teal, borderRadius: 3}} />
        <div style={{color: C.teal, fontSize: 30, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase'}}>
          {verbatim ? 'In their words' : 'The expert view'}
        </div>
      </div>
      <div style={{position: 'relative', marginTop: 34}}>
        <div style={{position: 'absolute', left: -150, top: -40, fontSize: 300, fontWeight: 900, lineHeight: 1,
          color: C.amber, opacity: 0.18 * mark, transform: `translateY(${(1 - mark) * 30}px)`}}>{'“'}</div>
        <Words text={shown} delay={8} perWord={perWord}
          style={{position: 'relative', color: C.white, fontSize: words.length > 18 ? 60 : 70, fontWeight: 800, lineHeight: 1.18, maxWidth: 1500}} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 56, opacity: who, transform: `translateX(${(1 - who) * -24}px)`}}>
        <div style={{width: 8, height: 92, borderRadius: 4, background: C.amber}} />
        <div>
          <div style={{color: C.white, fontSize: 44, fontWeight: 800}}>{name}</div>
          <div style={{color: C.muted, fontSize: 30, fontWeight: 500, marginTop: 6}}>
            {[role, where].filter(Boolean).join('  ·  ')}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
