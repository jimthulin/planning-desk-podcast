import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {C, FONT, FPS, segmentLabel} from './theme.js';
import {Background} from './components/Background.jsx';
import {Header} from './components/Chrome.jsx';
import {Captions} from './components/Captions.jsx';
import {mentionTimes} from './timing.js';
import {Scene} from './components/Scene.jsx';
import {TitleCard, OutroCard} from './templates/Bookends.jsx';
import {Headline, Takeaway, QuickHit} from './templates/Cards.jsx';
import {Stat} from './templates/Stat.jsx';
import {Bars} from './templates/Bars.jsx';
import {ListCard} from './templates/ListCard.jsx';
import {RouteMap} from './templates/RouteMap.jsx';
import {Timeline} from './templates/Timeline.jsx';
import {Flow} from './templates/Flow.jsx';

const TEMPLATES = {
  headline: Headline,
  takeaway: Takeaway,
  quickhit: QuickHit,
  stat: Stat,
  bars: Bars,
  list: ListCard,
  route: RouteMap,
  timeline: Timeline,
  flow: Flow,
};

const ITEM_TEMPLATES = new Set(['list', 'timeline', 'flow']);

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const weights = [400, 500, 600, 700, 800, 900];
    Promise.all(weights.map((w) => document.fonts.load(`${w} 40px Inter`)))
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};

// Build the list of scenes: title card over the intro music, one scene per cue,
// a fallback card for stretches without a cue, and the outro card.
const buildScenes = (props) => {
  const {lines, cues, outroStartSec, totalSec} = props;
  const scenes = [];
  const firstStart = lines.length ? lines[0].start_sec : outroStartSec;
  scenes.push({kind: 'title', from: 0, to: firstStart});
  const sorted = [...cues].filter((c) => lines[c.line]).sort((a, b) => a.line - b.line);
  if (!sorted.length || sorted[0].line > 0) {
    sorted.unshift({line: 0, template: 'segment'});
  }
  sorted.forEach((cue, i) => {
    const from = lines[cue.line].start_sec;
    const next = sorted[i + 1];
    const to = next ? lines[next.line].start_sec : outroStartSec;
    if (to > from) scenes.push({kind: 'cue', cue, from, to});
  });
  scenes.push({kind: 'outro', from: outroStartSec, to: totalSec});
  return scenes;
};

const SegmentCard = ({segment}) => (
  <AbsoluteFill style={{justifyContent: 'center', paddingLeft: 160}}>
    <div style={{fontFamily: FONT, color: C.amber, fontSize: 34, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase'}}>
      Now
    </div>
    <div style={{fontFamily: FONT, color: C.white, fontSize: 120, fontWeight: 900, lineHeight: 1.05, marginTop: 12}}>
      {segmentLabel(segment)}
    </div>
  </AbsoluteFill>
);

export const Episode = (props) => {
  useFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const scenes = useMemo(() => buildScenes(props), [props]);

  const lineIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < props.lines.length; i++) {
      if (props.lines[i].start_sec <= t) idx = i;
      else break;
    }
    return idx;
  }, [t, props.lines]);
  const line = lineIdx >= 0 ? props.lines[lineIdx] : null;
  const speaking = line && t <= line.start_sec + line.duration_sec ? line.speaker : null;
  const inShow = lineIdx >= 0 && t < props.outroStartSec;

  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <Background />
      {scenes.map((s, i) => {
        const from = Math.round(s.from * FPS);
        const dur = Math.max(1, Math.round(s.to * FPS) - from);
        let content;
        if (s.kind === 'title') content = <TitleCard {...props} dur={dur} />;
        else if (s.kind === 'outro') content = <OutroCard {...props} dur={dur} />;
        else if (s.cue.template === 'segment' || !TEMPLATES[s.cue.template]) {
          content = <SegmentCard segment={props.lines[s.cue.line].segment} />;
        } else {
          const T = TEMPLATES[s.cue.template];
          const cueProps = s.cue.props || {};
          let itemFrames;
          if (ITEM_TEMPLATES.has(s.cue.template)) {
            const items = cueProps.items || cueProps.steps || [];
            const sceneLines = props.lines.filter((l) => l.start_sec >= s.from - 0.01 && l.start_sec < s.to);
            itemFrames = mentionTimes(items, sceneLines, s.from, s.to).map((sec) => Math.round((sec - s.from) * FPS));
          }
          content = <T {...cueProps} dur={dur} itemFrames={itemFrames} />;
        }
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Scene dur={dur} bare={s.kind !== 'cue'}>{content}</Scene>
          </Sequence>
        );
      })}
      {inShow && <Header show={props.show} week={props.week} segment={line ? line.segment : ''} />}
      {inShow && <Captions line={line} t={t} />}
      {props.audioFile && <Audio src={staticFile(props.audioFile)} />}
    </AbsoluteFill>
  );
};
