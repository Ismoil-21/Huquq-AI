import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { translations, defaultLang } from '../i18n/translations';
import { authAPI } from '../utils/api';
import {
  registerForPushNotifications,
  unregisterPushToken,
} from '../utils/notifications';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang,    setLang]    = useState(defaultLang);
  const [theme,   setTheme]   = useState('dark');
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  // Limit state
  const [usageStats, setUsageStats] = useState({ used: 0, limit: 20, remaining: 20 });
  const appState = useRef(AppState.currentState);

  const t = (key) => {
    const val = translations[lang]?.[key] ?? translations[defaultLang]?.[key] ?? key;
    return val;
  };

  // Load saved prefs on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedLang, savedTheme, savedToken] = await Promise.all([
          AsyncStorage.getItem('lang'),
          AsyncStorage.getItem('theme'),
          AsyncStorage.getItem('token'),
        ]);
        if (savedLang && translations[savedLang]) setLang(savedLang);
        if (savedTheme) setTheme(savedTheme);
        if (savedToken) {
          setToken(savedToken);
          try {
            const res = await authAPI.me();
            setUser(res.data.user);
          } catch {
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (e) {
        console.error('Load prefs error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Push notification — foydalanuvchi kirganida ro'yxatdan o'tkazish
  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch((err) => {
        console.warn('Push registration error:', err.message);
      });
    }
  }, [user?._id]);

  // App foreground ga kelganda — notification check
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App foreground ga keldi — agar user bor bo'lsa usage ni yangilaymiz
        // (qo'shimcha API call kerak emas — chat da yangilanadi)
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const changeLang = async (code) => {
    setLang(code);
    await AsyncStorage.setItem('lang', code);
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await AsyncStorage.setItem('theme', next);
  };

  const login = async (username, password) => {
    const res = await authAPI.login(username, password);
    const { token: tk, user: u } = res.data;
    setToken(tk);
    setUser(u);
    await AsyncStorage.setItem('token', tk);
    return u;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await authAPI.verifyOtp(email, otp);
    const { token: tk, user: u } = res.data;
    setToken(tk);
    setUser(u);
    await AsyncStorage.setItem('token', tk);
    return u;
  };

  const resendOtp = async (email) => {
    const res = await authAPI.resendOtp(email);
    return res.data;
  };

  const logout = async () => {
    try {
      await unregisterPushToken(); // Push tokenni o'chiramiz
      await authAPI.logout();
    } catch {}
    setToken(null);
    setUser(null);
    setUsageStats({ used: 0, limit: 20, remaining: 20 });
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('pushToken');
  };

  const updateUsageStats = (stats) => {
    if (stats) setUsageStats(stats);
  };

  return (
    <AppContext.Provider value={{
      lang, changeLang, t,
      theme, toggleTheme,
      user, token, loading,
      login, register, verifyOtp, resendOtp, logout,
      isAuth: !!user,
      usageStats, updateUsageStats,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
