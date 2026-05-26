import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Backend URL ──────────────────────────────────────────────
// Production: serveringizning haqiqiy IP/domain
// Development (Expo Go): kompyuteringizning lokal IP manzili
// Masalan: http://192.168.1.100:3000/api
// Docker: http://10.0.2.2:3000/api  (Android emulator)
//         http://localhost:3000/api  (iOS simulator)
const DEV_URL  = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api'
  : 'https://huquq-ai-fpa2.onrender.com/api';

const PROD_URL = process.env.EXPO_PUBLIC_API_URL || DEV_URL;
export const API_URL = __DEV__ ? DEV_URL : PROD_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Token + platform header interceptor
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['x-app-platform'] = 'mobile';
  return config;
});

// Response interceptor — 401 da tokenni tozalash
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(err);
  }
);

// ─── Auth API ─────────────────────────────────────────────────
export const authAPI = {
  login:     (username, password) => api.post('/auth/login', { username, password }),
  register:  (data) =>              api.post('/auth/register', data),
  verifyOtp: (email, otp) =>        api.post('/auth/verify-otp', { email, otp }),
  resendOtp: (email) =>             api.post('/auth/resend-otp', { email }),
  me:        () =>                  api.get('/auth/me'),
  logout:    () =>                  api.post('/auth/logout'),
  updateProfile: (data) =>          api.put('/auth/profile', data),
};

// ─── Chat API ─────────────────────────────────────────────────
export const chatAPI = {
  send:          (message, sessionId, lang = 'uz') =>
    api.post('/chat/send', { message, sessionId, lang }),
  history:       () =>
    api.get('/chat/history'),
  session:       (sessionId) =>
    api.get(`/chat/session/${sessionId}`),
  deleteSession: (sessionId) =>
    api.delete(`/chat/session/${sessionId}`),
  usage:         () =>
    api.get('/chat/usage'),
};

export default api;
