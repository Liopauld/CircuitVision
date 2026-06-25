import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Token storage abstraction. SecureStore is native-only (it throws on web,
// where the module isn't implemented), so fall back to localStorage in the
// browser. On a real device / Expo Go this always uses SecureStore.
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
