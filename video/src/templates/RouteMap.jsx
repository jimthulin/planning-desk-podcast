import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {geoMercator, geoPath} from 'd3-geo';
import {feature} from 'topojson-client';
import world110 from 'world-atlas/countries-110m.json';
import world50 from 'world-atlas/countries-50m.json';
import {C, FONT} from '../theme.js';
import {Kicker} from './Cards.jsx';

const BOX = {x: 90, y: 300, w: 1740, h: 620};
const countries110 = feature(world110, world110.objects.countries);
const countries50 = feature(world50, world50.objects.countries);

// Map with optional routes (drawn as animated lines through waypoints, [lon, lat])
// and pins ({name, lat, lon, alert, muted}). The view fits everything shown.
export const RouteMap = ({kicker, title, routes = [], points = [], pad = 8}) => {
  const frame = useCurrentFrame();

  const geo = useMemo(() => {
    const coords = [
      ...points.map((p) => [p.lon, p.lat]),
      ...routes.flatMap((r) => r.points),
    ];
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLon = Math.min(...lons) - pad, maxLon = Math.max(...lons) + pad;
    const minLat = Math.max(-70, Math.min(...lats) - pad), maxLat = Math.min(78, Math.max(...lats) + pad);
    const span = Math.max(maxLon - minLon, maxLat - minLat);
    const bboxFeature = {
      type: 'Feature',
      geometry: {type: 'MultiPoint', coordinates: [[minLon, minLat], [maxLon, maxLat], [minLon, maxLat], [maxLon, minLat]]},
    };
    const projection = geoMercator().fitExtent([[BOX.x, BOX.y], [BOX.x + BOX.w, BOX.y + BOX.h]], bboxFeature);
    const path = geoPath(projection);
    const land = span < 45 ? countries50 : countries110;
    const countryPaths = land.features.map((f) => path(f)).filter(Boolean);
    const projRoutes = routes.map((r) => {
      const pts = r.points.map((c) => projection(c));
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return {...r, d: 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L'), len};
    });
    const projPoints = points.map((p) => ({...p, xy: projection([p.lon, p.lat])}));
    return {countryPaths, projRoutes, projPoints};
  }, [routes, points, pad]);

  const mapIn = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <svg width={1920} height={1080} style={{position: 'absolute', opacity: mapIn}}>
        <defs>
          <clipPath id="mapclip"><rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={28} /></clipPath>
        </defs>
        <g clipPath="url(#mapclip)">
          <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill="#08101C" />
          {geo.countryPaths.map((d, i) => (
            <path key={i} d={d} fill="#2B4566" stroke="#41618A" strokeWidth={1.2} />
          ))}
          {geo.projRoutes.map((r, i) => {
            const start = 12 + i * 22;
            const x = interpolate(frame, [start, start + 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const e = 1 - Math.pow(1 - x, 2);
            const faded = r.style === 'faded';
            return (
              <path key={i} d={r.d} fill="none" stroke={faded ? C.muted : C.amber} strokeOpacity={faded ? 0.55 : 1}
                strokeWidth={faded ? 5 : 8} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={faded ? `14 12` : `${r.len} ${r.len}`}
                strokeDashoffset={faded ? 0 : r.len * (1 - e)} opacity={faded ? e : 1} />
            );
          })}
        </g>
        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={28} fill="none" stroke={C.line} strokeWidth={2} />
        {geo.projPoints.map((p, i) => {
          const start = 18 + i * 8;
          const x = interpolate(frame, [start, start + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const color = p.alert ? C.red : p.muted ? C.muted : C.teal;
          const pulse = p.alert ? (frame % 45) / 45 : 0;
          const [cx, cy] = p.xy;
          return (
            <g key={i} opacity={x}>
              {p.alert && <circle cx={cx} cy={cy} r={14 + pulse * 46} fill="none" stroke={C.red} strokeWidth={4} strokeOpacity={1 - pulse} />}
              <circle cx={cx} cy={cy} r={13 * x} fill={color} stroke={C.ink} strokeWidth={4} />
              <text x={cx + 24} y={cy + 10} fill={p.muted ? C.muted : C.white} fontSize={30} fontWeight={700}
                style={{paintOrder: 'stroke', stroke: C.ink, strokeWidth: 8, strokeLinejoin: 'round'}}>{p.name}</text>
            </g>
          );
        })}
      </svg>
      {(kicker || title) && (
        <div style={{position: 'absolute', left: BOX.x + 6, top: 146, right: BOX.x, opacity: mapIn, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40}}>
          <div>
            {kicker && <Kicker>{kicker}</Kicker>}
            {title && <div style={{color: C.white, fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginTop: 14, maxWidth: 1350}}>{title}</div>}
          </div>
          {routes.some((r) => r.label) && (
            <div style={{display: 'flex', gap: 28, paddingBottom: 10}}>
              {routes.filter((r) => r.label).map((r, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 26, fontWeight: 600, whiteSpace: 'nowrap'}}>
                  <div style={{width: 40, height: 6, borderRadius: 3, background: r.style === 'faded' ? C.muted : C.amber}} />
                  {r.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
