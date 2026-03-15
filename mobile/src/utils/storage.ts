import AsyncStorage from '@react-native-async-storage/async-storage';

const S = {
  async get(k: string): Promise<any> {
    try {
      const raw = await AsyncStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  // Returns true on success, false on failure.
  // Callers performing critical writes (dose tracking, med saves, profile saves)
  // should check the return value and show a toast on false.
  async set(k: string, v: any): Promise<boolean> {
    try {
      await AsyncStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) {
      console.error('[Storage] Failed to write key:', k, e);
      return false;
    }
  },
  async del(k: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(k);
    } catch {}
  },
};

export default S;
