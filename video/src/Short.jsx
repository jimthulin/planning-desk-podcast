import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, FPS} from './theme.js';
import {LayoutCtx} from './layout.js';
import {Background} from './components/Background.jsx';
import {Scene, useEnter} from './components/Scene.jsx';
import {charTime, mentionTimes} from './timing.js';
import {Headline, Takeaway, QuickHit} from './templates/Cards.jsx';
import {Stat} from './templates/Stat.jsx';
import {Bars} from './templates/Bars.jsx';
import {ListCard} from './templates/ListCard.jsx';
import {RouteMap} from './templates/RouteMap.jsx';
import {Voice} from './templates/Voice.jsx';

// 9:16 Short for YouTube Shorts and Instagram Reels.
// Layout keeps clear of the platforms' own buttons: nothing important in the top 140 px,
// the bottom 360 px or the right-hand 130 px of the lower half.
const SW = 1080, STAGE = {top: 330, h: 940};
const AsList = (p) => <ListCard title={p.title || p.kicker} items={(p.items || p.steps || []).map((s) => ({label: s.label, detail: s.detail, say: s.say}))} itemFrames={p.itemFrames} />;
const TEMPLATES = {
  headline: Headline, takeaway: Takeaway, quickhit: QuickHit, stat: Stat, bars: Bars,
  list: ListCard, route: RouteMap, voice: Voice, timeline: AsList, flow: AsList,
};
const ITEM_TEMPLATES = new Set(['list', 'timeline', 'flow']);

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 40px Inter`)))
      .then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

// A cue starts at its line, or at the moment a phrase (`at`) inside that line is spoken.
const cueStart = (cue, lines) => {
  const l = lines[cue.line];
  if (!l) return null;
  if (!cue.at) return l.start_sec;
  const idx = l.text.toLowerCase().indexOf(String(cue.at).toLowerCase());
  return idx >= 0 ? charTime(l, idx) : l.start_sec;
};

const Header = ({show, dateLabel}) => (
  <div style={{position: 'absolute', top: 160, left: 70, right: 70, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div style={{width: 14, height: 56, background: C.amber, borderRadius: 3}} />
      <div>
        <div style={{color: C.white, fontSize: 36, fontWeight: 900, letterSpacing: 1.5}}>{(show || '').toUpperCase()}</div>
        <div style={{color: C.muted, fontSize: 26, fontWeight: 600, marginTop: 2}}>{dateLabel}</div>
      </div>
    </div>
    <div style={{color: C.muted, border: `2px solid ${C.line}`, fontSize: 20, fontWeight: 600, padding: '8px 16px', borderRadius: 999}}>AI-generated</div>
  </div>
);

// Big phone captions: a few words at a time, the current word in amber.
const Captions = ({lines, t}) => {
  const line = [...lines].reverse().find((l) => l.start_sec <= t);
  const chunks = useMemo(() => {
    if (!line) return [];
    const words = line.text.split(/\s+/).filter(Boolean);
    const out = [];
    let cur = [], ci = 0;
    words.forEach((w, i) => {
      cur.push({w, t: charTime(line, ci)});
      ci += w.length + 1;
      if (cur.length >= 5 || (/[.,;:?!]$/.test(w) && cur.length >= 3) || i === words.length - 1) { out.push(cur); cur = []; }
    });
    return out;
  }, [line]);
  if (!line || t > line.start_sec + line.duration_sec + 0.2) return null;
  const chunk = [...chunks].reverse().find((c) => c[0].t <= t) || chunks[0];
  if (!chunk) return null;
  const pop = interpolate(t - chunk[0].t, [0, 0.12], [0.92, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: STAGE.top + STAGE.h + 20, left: 60, right: 150, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, fontSize: 60, fontWeight: 900, lineHeight: 1.18, textAlign: 'center', transform: `scale(${pop})`,
        textShadow: '0 4px 18px rgba(0,0,0,0.6)'}}>
        {chunk.map((w, i) => {
          const next = chunk[i + 1];
          const on = t >= w.t && (!next || t < next.t);
          return <span key={i} style={{color: on ? C.amber : t >= w.t ? C.white : 'rgba(244,241,234,0.45)'}}>{w.w}{i < chunk.length - 1 ? ' ' : ''}</span>;
        })}
      </div>
    </div>
  );
};

const EndCard = ({show, cta}) => {
  const p = useEnter(0, 14);
  const q = useEnter(8, 16);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT, padding: '0 90px', textAlign: 'center'}}>
      <div style={{color: C.amber, fontSize: 34, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', opacity: p}}>Full episode</div>
      <div style={{color: C.white, fontSize: 88, fontWeight: 900, lineHeight: 1.05, marginTop: 20, opacity: p, transform: `scale(${0.9 + 0.1 * p})`}}>{show}</div>
      <div style={{color: C.white, opacity: 0.8 * q, fontSize: 40, fontWeight: 600, marginTop: 30, lineHeight: 1.3}}>{cta}</div>
    </AbsoluteFill>
  );
};

export const Short = (props) => {
  useFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const {lines, cues, totalSec, endCardSec} = props;
  const scenes = useMemo(() => {
    const timed = cues.map((c) => ({cue: c, from: cueStart(c, lines)})).filter((c) => c.from !== null).sort((a, b) => a.from - b.from);
    if (timed.length) timed[0].from = 0;
    return timed.map((c, i) => ({...c, to: i + 1 < timed.length ? timed[i + 1].from : endCardSec})).filter((s) => s.to > s.from);
  }, [cues, lines, endCardSec]);
  const progress = Math.min(1, t / Math.max(1, totalSec));

  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <Background />
      <div style={{position: 'absolute', top: STAGE.top, left: 0, width: SW, height: STAGE.h}}>
        <LayoutCtx.Provider value={{v: true, w: SW, h: STAGE.h}}>
          {scenes.map((s, i) => {
            const from = Math.round(s.from * FPS);
            const dur = Math.max(1, Math.round(s.to * FPS) - from);
            const T = TEMPLATES[s.cue.template] || Headline;
            const cp = s.cue.props || {};
            let itemFrames;
            if (ITEM_TEMPLATES.has(s.cue.template)) {
              const items = cp.items || cp.steps || [];
              const sceneLines = lines.filter((l) => l.start_sec + l.duration_sec > s.from && l.start_sec < s.to);
              itemFrames = mentionTimes(items, sceneLines, s.from, s.to).map((sec) => Math.round((sec - s.from) * FPS));
            }
            return (
              <Sequence key={i} from={from} durationInFrames={dur} layout="none">
                <Scene dur={dur}><T {...cp} dur={dur} itemFrames={itemFrames} /></Scene>
              </Sequence>
            );
          })}
        </LayoutCtx.Provider>
      </div>
      <Sequence from={Math.round(endCardSec * FPS)} layout="none">
        <Scene dur={Math.max(1, Math.round((totalSec - endCardSec) * FPS))} bare><EndCard show={props.show} cta={props.cta} /></Scene>
      </Sequence>
      {t < endCardSec && <Header show={props.show} dateLabel={props.dateLabel} />}
      {t < endCardSec && <Captions lines={lines} t={t} />}
      <div style={{position: 'absolute', top: 0, left: 0, height: 8, width: SW * progress, background: C.amber}} />
      {props.audioFile && <Audio src={staticFile(props.audioFile)} />}
    </AbsoluteFill>
  );
};
