// Rev.A "Populated Board" palette, ported for React Native (no backdrop-blur,
// so glass surfaces become solid soldermask tones). Custom brand colours, so we
// use plain hex rather than the expo-router Color semantic API.
export const colors = {
  bg: '#07120d',
  bg2: '#0a1a13',
  surface: '#102016',
  surfaceHi: '#16301f',
  border: 'rgba(201, 138, 58, 0.22)',
  borderHi: 'rgba(232, 183, 101, 0.5)',

  copper: '#c98a3a',
  copperBright: '#e8b765',
  gold: '#e8b765',
  solder: '#d8dde0',

  text: '#eef3ea',
  muted: '#8aa394',
  textDim: '#5e7567',

  green: '#4cc38a',
  amber: '#e8b765',
  danger: '#ff5c84',

  // Authentic board colours for category tags
  esp32: '#3fa7b8',
  raspi: '#c51a4a',
  arduino: '#00979d',
} as const;

export const radius = { md: 14, sm: 9, pill: 999 } as const;

// Monospace face for datasheet-style readouts (prices, designators).
import { Platform } from 'react-native';
export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
})!;
