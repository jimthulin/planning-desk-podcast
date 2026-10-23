export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const C = {
  ink: '#0C1421',
  ink2: '#142236',
  ink3: '#1C2E47',
  line: 'rgba(138,152,170,0.22)',
  white: '#F4F1EA',
  muted: '#8A98AA',
  amber: '#F2A33A',
  teal: '#3BC4B4',
  red: '#E5604D',
};

export const FONT = "'Inter', system-ui, sans-serif";

export const SEGMENT_LABELS = {
  cold_open: 'Top story',
  welcome: 'This week',
  lead_stories: 'Lead stories',
  ai_tech: 'AI & tech',
  nordics_dach: 'Nordics & DACH',
  market_moves: 'Market moves',
  use_cases: 'Use cases',
  macro: 'Macro & trade',
  numbers: 'The numbers',
  events_ahead: 'Events ahead',
  quick_hits: 'Quick hits',
  sign_off: 'Sign-off',
};

export const segmentLabel = (id) =>
  SEGMENT_LABELS[id] || (id || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export const fmt = (v, decimals = 0) =>
  Number(v).toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
