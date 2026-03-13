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
  async set(k: string, v: any): Promise<void> {
    try {
      await AsyncStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      console.error(e);
    }
  },
  async del(k: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(k);
    } catch {}
  },
};

export default S;
