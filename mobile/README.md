# Huquq AI — Mobile App

O'zbekiston qonunchiligi bo'yicha AI huquqiy maslahatchi — **Android** va **iOS** uchun mobil ilova.

## 📱 Ilova haqida

- **React Native + Expo** asosida qurilgan
- Android va iOS — **bitta kod**dan ishlaydi
- Backend bilan to'liq ulangan (JWT auth, chat API)
- **3 til**: O'zbek 🇺🇿, Русский 🇷🇺, English 🇬🇧
- **Dark / Light** mavzu
- Offline-friendly (tarjimalar lokalda)

## 🗂️ Papka tuzilishi

```
HuquqApp/
├── App.js                      # Entry point
├── app.json                    # Expo konfiguratsiya
├── eas.json                    # EAS Build konfiguratsiya
├── babel.config.js
├── package.json
└── src/
    ├── context/
    │   └── AppContext.js       # Auth, til, mavzu holati
    ├── i18n/
    │   └── translations.js     # uz / ru / en tarjimalar
    ├── navigation/
    │   └── AppNavigator.js     # Bottom tab navigatsiya
    ├── screens/
    │   ├── HomeScreen.js       # Bosh sahifa
    │   ├── ChatScreen.js       # AI maslahat chat
    │   ├── ServicesScreen.js   # Xizmatlar
    │   ├── AboutScreen.js      # Biz haqimizda
    │   └── ProfileScreen.js    # Profil + sozlamalar
    └── utils/
        ├── api.js              # Backend API chaqiruvlari
        └── theme.js            # Ranglar, o'lchamlar
```

## ⚙️ O'rnatish va ishga tushirish

### Talablar
- Node.js 18+
- npm yoki yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android: [Android Studio](https://developer.android.com/studio) yoki real qurilma
- iOS: Mac + Xcode (faqat Mac da)

### 1. O'rnatish

```bash
cd HuquqApp
npm install
```

### 2. API URL sozlash

`src/utils/api.js` faylida:
```js
const API_URL = 'https://huquq.uz/api';
// Local test uchun:
// const API_URL = 'http://192.168.1.X:3000/api';
// (X — siz bilan backend bir xil Wi-Fi da bo'lishi kerak)
```

### 3. Ishga tushirish

```bash
npx expo start
```

QR kodni **Expo Go** ilovasi orqali skanerlang (Android / iOS).

Yoki:
```bash
npx expo start --android   # Android emulyator
npx expo start --ios       # iOS simulator (faqat Mac)
```

---

## 📦 APK / IPA qurish (EAS Build)

### Expo account yaratish
```bash
npm install -g eas-cli
eas login
```

### Preview APK (Android — o'rnatish uchun)
```bash
eas build --platform android --profile preview
```
→ `.apk` fayl yuklab olinadi, to'g'ridan-to'g'ri qurilmaga o'rnatish mumkin.

### Production AAB (Google Play uchun)
```bash
eas build --platform android --profile production
```

### iOS IPA (App Store uchun)
```bash
eas build --platform ios --profile production
```
> iOS uchun Apple Developer akaunt ($99/yil) kerak.

---

## 🏪 Do'konlarga chiqarish

### Google Play Store
1. `eas build` bilan `.aab` faylini oling
2. [Google Play Console](https://play.google.com/console) ga kiring
3. Yangi ilova yarating → AAB yuklang
4. Tavsif, rasm, narx belgilang → Chiqaring

### Apple App Store
1. Mac + Xcode bo'lishi shart
2. Apple Developer Program ($99/yil)
3. `eas build --platform ios` bilan IPA oling
4. [App Store Connect](https://appstoreconnect.apple.com) ga yuklang

---

## 🎨 Dizayn tizimi

| Element | Qiymat |
|---------|--------|
| Asosiy rang | `#C9A84C` (oltin) |
| Fon (dark) | `#080D1A` |
| Fon (light) | `#F5F3EE` |
| Radius | 8 / 12 / 16 / 24px |

---

## 🔗 Backend API endpointlari

| Method | URL | Tavsif |
|--------|-----|--------|
| POST | `/api/auth/login` | Kirish |
| POST | `/api/auth/register` | Ro'yxatdan o'tish |
| GET | `/api/auth/me` | Profil ma'lumotlari |
| POST | `/api/chat/send` | AI ga savol yuborish |
| GET | `/api/chat/history` | Suhbatlar tarixi |
| GET | `/api/chat/usage` | Kunlik limit holati |

---

## 📋 Ekranlar

| Ekran | Tavsif |
|-------|--------|
| **Home** | Bosh sahifa — kategoriyalar, tez savollar, statistika |
| **Chat** | AI maslahat — real vaqt suhbat, sessiya, limit |
| **Services** | Barcha xizmatlar ro'yxati |
| **About** | Biz haqimizda, kontakt, ogohlantirishlar |
| **Profile** | Login/Register, til, mavzu, chiqish |
