import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Bildirishnoma oldindan ko'rinishi sozlamalari
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Push token olish va serverga saqlash
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('Push notifications faqat haqiqiy qurilmada ishlaydi');
    return null;
  }

  // Ruxsat so'rash
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification ruxsati berilmadi');
    return null;
  }

  // Android uchun kanal yaratish
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'Asosiy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0AD4B1',
    });

    await Notifications.setNotificationChannelAsync('limit', {
      name:       'Limit bildirishi',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#FF6B6B',
    });
  }

  try {
    // Expo push token olish
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'uz.huquq.app', // app.json dagi slug
    });
    const pushToken = tokenData.data;

    // Saqlangan token bilan solishtirib, faqat o'zgarganda yuborish
    const savedToken = await AsyncStorage.getItem('pushToken');
    if (pushToken !== savedToken) {
      // Serverga yuborish
      await api.post('/notifications/register-token', {
        token:    pushToken,
        platform: Platform.OS,
      });
      await AsyncStorage.setItem('pushToken', pushToken);
    }

    return pushToken;
  } catch (err) {
    console.error('Push token olishda xato:', err.message);
    return null;
  }
}

/**
 * Push token o'chirish (logout da)
 */
export async function unregisterPushToken() {
  try {
    await api.delete('/notifications/register-token');
    await AsyncStorage.removeItem('pushToken');
  } catch (err) {
    console.error('Push token o\'chirishda xato:', err.message);
  }
}

/**
 * Bildirishnomaga bosilganda qilish kerak bo'lgan ish
 */
export function setupNotificationListeners(navigation) {
  // Bildirishnomaga bosildi
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    if (data?.type === 'limit_reset') {
      // Limit yangilandi — chat ga o'tish
      navigation?.navigate?.('Chat');
    } else if (data?.type === 'limit_reached') {
      // Limit tugadi — profil ga o'tish
      navigation?.navigate?.('Profile');
    }
  });

  return () => subscription.remove();
}

/**
 * Lokal bildirishnoma (internet kerak emas)
 */
export async function showLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: null, // darhol
  });
}

/**
 * Limit haqida lokal xabar (serverga so'rov kerak emas)
 */
export async function showLimitWarning(remaining, timeLeft) {
  if (remaining === 1) {
    await showLocalNotification(
      '⚠️ Oxirgi savol qoldi!',
      `Kunlik limitingizda faqat 1 ta savol qoldi.`,
      { type: 'limit_warning' }
    );
  } else if (remaining === 0) {
    await showLocalNotification(
      '❌ Limit tugadi',
      `Kunlik limit tugadi. ${timeLeft} dan so'ng ochiladi.`,
      { type: 'limit_reached', timeLeft }
    );
  }
}
