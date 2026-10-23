import React from 'react';
import {Composition} from 'remotion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import {Episode} from './Episode.jsx';
import {FPS, H, W} from './theme.js';

const defaultProps = {
  show: 'The Planning Desk',
  week: '',
  episodeTitle: '',
  totalSec: 30,
  outroStartSec: 20,
  lines: [],
  cues: [],
  envelope: [],
  audioFile: null,
  credit: '',
  disclosure: '',
  site: '',
};

export const RemotionRoot = () => (
  <Composition
    id="Episode"
    component={Episode}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={FPS * 30}
    defaultProps={defaultProps}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Math.ceil(props.totalSec * FPS))})}
  />
);
