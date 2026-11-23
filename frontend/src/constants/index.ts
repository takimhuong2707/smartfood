const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.4:5000/api';
export const API_URL = rawApiUrl.trim().replace(/\s+/g, '');
export const TOKEN_KEY = 'token';

export const COLORS = {
  primary: '#2E7D4F',
  primaryDark: '#1F5C39',
  primarySoft: '#E6F2EA',
  bg: '#F6F7F2',
  card: '#FFFFFF',
  ink: '#1B2A22',
  muted: '#5B6B62',
  border: '#D5DCD1',
  placeholder: '#8A978F',
  error: '#B3261E',
  errorBg: '#FDECEA',
};