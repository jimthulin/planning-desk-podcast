import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme.js';
import {useEnter} from '../components/Scene.jsx';

// A small animated supply network, echoing the cover art.
const Network = ({frame}) => {
  const tiers = [
    [[1080, 230], [1260, 210], [1440, 240], [1620, 220], [1780, 250]],
    [[1180, 470], [1450, 450], [1700, 480]],
    [[1060, 700], [1210, 720], [1360, 690], [1510, 710], [1660, 700], [1800, 720]],
  ];
  const edges = [];
  tiers[0].forEach((a) => tiers[1].forEach((b) => Math.abs(a[0] - b[0]) < 300 && edges.push([a, b])));
  tiers[1].forEach((b) => tiers[2].forEach((c) => Math.abs(b[0] - c[0]) < 260 && edges.push([b, c])));
  const hot = [tiers[0][2], tiers[1][1], tiers[2][3]];
  const grow = interpolate(frame, [0, 60], [0, 1], {extrapolateRight: 'clamp'});
  const flow = interpolate(frame, [40, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hotLen = Math.hypot(hot[1][0] - hot[0][0], hot[1][1] - hot[0][1]) + Math.hypot(hot[2][0] - hot[1][0], hot[2][1] - hot[1][1]);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={a[0] + (b[0] - a[0]) * grow} y2={a[1] + (b[1] - a[1]) * grow} stroke={C.muted} strokeOpacity={0.4} strokeWidth={3} />
      ))}
      <path d={`M${hot[0].join(',')} L${hot[1].join(',')} L${hot[2].join(',')}`} fill="none" stroke={C.amber} strokeWidth={8}
        strokeDasharray={`${hotLen} ${hotLen}`} strokeDashoffset={hotLen * (1 - flow)} strokeLinecap="round" />
      {tiers[0].map((p, i) => <circle key={`a${i}`} cx={p[0]} cy={p[1]} r={12 * grow} fill={C.teal} />)}
      {tiers[1].map((p, i) => <rect key={`b${i}`} x={p[0] - 26} y={p[1] - 26} width={52} height={52} rx={10} fill={C.white} opacity={grow} />)}
      {tiers[2].map((p, i) => <circle key={`c${i}`} cx={p[0]} cy={p[1]} r={10 * grow} fill="none" stroke={C.white} strokeWidth={4} />)}
      {hot.map((p, i) => <circle key={`h${i}`} cx={p[0]} cy={p[1]} r={18 * flow} fill={C.amber} />)}
    </svg>
  );
};

export const TitleCard = ({show, week, episodeTitle}) => {
  const frame = useCurrentFrame();
  const a = useEnter(6, 20);
  const b = useEnter(16, 20);
  const c = useEnter(34, 20);
  const words = (show || '').toUpperCase().replace(/^THE /, '');
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <Network frame={frame} />
      <div style={{position: 'absolute', left: 140, top: 300}}>
        <div style={{color: C.amber, fontSize: 64, fontWeight: 800, opacity: a, transform: `translateY(${(1 - a) * 20}px)`}}>THE</div>
        <div style={{color: C.white, fontSize: 170, fontWeight: 900, lineHeight: 0.95, opacity: b, transform: `translateY(${(1 - b) * 30}px)`, maxWidth: 900}}>
          {words}
        </div>
        <div style={{width: 160 * c, height: 10, background: C.amber, borderRadius: 5, marginTop: 40}} />
        <div style={{color: C.muted, fontSize: 36, fontWeight: 600, marginTop: 30, opacity: c}}>{week}</div>
        <div style={{color: C.white, fontSize: 52, fontWeight: 800, marginTop: 8, opacity: c, maxWidth: 900}}>{episodeTitle}</div>
      </div>
    </AbsoluteFill>
  );
};

export const OutroCard = ({show, credit, disclosure, site}) => {
  const frame = useCurrentFrame();
  const a = useEnter(4, 20);
  const b = useEnter(18, 20);
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <Network frame={frame + 60} />
      <div style={{position: 'absolute', left: 140, top: 260, maxWidth: 900}}>
        <div style={{color: C.amber, fontSize: 40, fontWeight: 800, letterSpacing: 3, opacity: a}}>NEW EPISODES EVERY SUNDAY</div>
        <div style={{color: C.white, fontSize: 130, fontWeight: 900, lineHeight: 0.98, marginTop: 20, opacity: a}}>{show}</div>
        <div style={{opacity: b, marginTop: 44}}>
          {credit && <div style={{color: C.white, fontSize: 38, fontWeight: 700}}>{credit}</div>}
          {disclosure && <div style={{color: C.muted, fontSize: 28, fontWeight: 500, lineHeight: 1.35, marginTop: 18}}>{disclosure}</div>}
          {site && <div style={{color: C.teal, fontSize: 30, fontWeight: 700, marginTop: 26}}>{site}</div>}
        </div>
      </div>
    </AbsoluteFill>
  );
};
