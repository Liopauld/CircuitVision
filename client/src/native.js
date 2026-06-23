// Native-only enhancements applied when the app runs inside the Capacitor
// shell (iOS/Android). On the web these are no-ops, so importing this module
// is always safe.
import { Capacitor } from '@capacitor/core';

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#070b14' });
    }
  } catch {
    /* status-bar plugin unavailable — ignore */
  }
}

// Light haptic tap, used on key actions on supported devices.
export async function tapHaptic() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}
