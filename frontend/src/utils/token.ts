import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from '@/constants';

export const tokenStorage = {
  get: async () => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: async (token: string) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
      }
    }
  },
  remove: async () => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  },
};