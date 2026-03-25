import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readJsonCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache write failures (storage quota, etc.)
  }
}

