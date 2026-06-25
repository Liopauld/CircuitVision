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

// One spacing scale used everywhere so layouts stay consistent.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32 } as const;

// Soft elevation for raised surfaces (use the boxShadow style prop, not the
// legacy RN shadow props — per the Expo UI guidelines).
export const shadow = { boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)' } as const;

// Status → accent colour, shared by listing + order status tags.
export const statusColor: Record<string, string> = {
  available: '#4cc38a',
  reserved: '#e8b765',
  pending: '#e8b765',
  sold: '#8aa394',
  rejected: '#8aa394',
  // order lifecycle
  awaiting_payment: '#e8b765',
  payment_submitted: '#e8b765',
  payment_verified: '#3fa7b8',
  preparing: '#3fa7b8',
  ready: '#3fa7b8',
  completed: '#4cc38a',
  cancelled: '#8aa394',
  disputed: '#ff5c84',
};

// Monospace face for datasheet-style readouts (prices, designators).
import { Platform } from 'react-native';
export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
})!;
