import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, StatusBar,
  ActivityIndicator, Switch, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import {
  Globe, Moon, Sun, LogOut, User, Mail, Lock,
  AlertCircle, Check, Eye, EyeOff, RefreshCw,
  ShieldCheck, ArrowLeft, X, MessageCircle,
} from 'lucide-react-native';
import axios from 'axios';

const LANGS = [
  { code: 'uz', label: 'UZ', name: "O'zbekcha" },
  { code: 'ru', label: 'RU', name: 'Русский'   },
  { code: 'en', label: 'EN', name: 'English'   },
];

// ── OTP Input (6 xonali) ──────────────────────────────────────
function OtpInput({ value, onChange, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  const boxes = Array(6).fill(0);
  const inputs = useRef([]);

  const handleChange = (text, idx) => {
    const digits = value.split('');
    digits[idx] = text.replace(/\D/g, '').slice(-1);
    const newVal = digits.join('');
    onChange(newVal);
    if (text && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !value[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.otpRow}>
      {boxes.map((_, i) => (
        <TextInput
          key={i}
          ref={(r) => (inputs.current[i] = r)}
          style={[
            styles.otpBox,
            {
              borderColor: value[i] ? COLORS.primary : C.border,
              backgroundColor: value[i] ? COLORS.primary + '15' : C.card,
              color: C.text,
            },
          ]}
          value={value[i] || ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="numeric"
          maxLength={1}
          textAlign="center"
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

// ── OTP Screen ────────────────────────────────────────────────
function OtpScreen({ email, isDark, onBack, onSuccess }) {
  const { t, verifyOtp, resendOtp } = useApp();
  const C = isDark ? COLORS.dark : COLORS.light;
  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [resendSec, setResendSec] = useState(60);
  const [success,   setSuccess]   = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const timer = setInterval(() => {
      setResendSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length < 6) { setError('6 xonali kodni to\'liq kiriting'); return; }
    setLoading(true); setError('');
    try {
      await verifyOtp(email, otp);
      setSuccess(true);
      setTimeout(onSuccess, 1200);
    } catch (e) {
      setError(e.response?.data?.error || 'Kod noto\'g\'ri yoki muddati tugagan');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSec > 0) return;
    try {
      await resendOtp(email);
      setResendSec(60);
      setOtp('');
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  return (
    <Animated.View style={[styles.otpScreen, { backgroundColor: C.card, opacity: fadeAnim }]}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <ArrowLeft size={20} color={C.text2} />
        <Text style={[styles.backTxt, { color: C.text2 }]}>{t('login_btn')}</Text>
      </TouchableOpacity>

      {/* Icon */}
      <View style={[styles.otpIconWrap, { backgroundColor: COLORS.primary + '18' }]}>
        {success
          ? <Check size={36} color={COLORS.success} />
          : <ShieldCheck size={36} color={COLORS.primary} />
        }
      </View>

      <Text style={[styles.otpTitle, { color: C.text }]}>{t('otp_title')}</Text>
      <Text style={[styles.otpSub, { color: C.text2 }]}>{t('otp_sub')}</Text>
      <Text style={[styles.otpEmail, { color: COLORS.primary }]}>{email}</Text>

      <OtpInput value={otp} onChange={setOtp} isDark={isDark} />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: COLORS.error + '15', borderColor: COLORS.error + '30' }]}>
          <AlertCircle size={14} color={COLORS.error} />
          <Text style={[styles.errorTxt, { color: COLORS.error }]}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.verifyBtn,
          { backgroundColor: otp.length === 6 ? COLORS.primary : C.border },
        ]}
        onPress={handleVerify}
        disabled={loading || otp.length < 6}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator size="small" color="#0A0F1E" />
          : <Text style={[styles.verifyBtnTxt, { color: otp.length === 6 ? '#0A0F1E' : C.text3 }]}>
              {t('otp_verify_btn')}
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resendBtn, { opacity: resendSec > 0 ? 0.5 : 1 }]}
        onPress={handleResend}
        disabled={resendSec > 0}
      >
        <RefreshCw size={14} color={COLORS.primary} />
        <Text style={[styles.resendTxt, { color: COLORS.primary }]}>
          {resendSec > 0
            ? t('otp_resend_in').replace('{s}', resendSec)
            : t('otp_resend')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Auth Form ────────────────────────────────────────────────
function LoginForm({ isDark }) {
  const { t, login, register } = useApp();
  const C = isDark ? COLORS.dark : COLORS.light;

  const [mode,     setMode]     = useState('login');
  const [step,     setStep]     = useState('form'); // 'form' | 'otp'
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showSupport, setShowSupport] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError(t('error_generic')); return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        if (!email.trim()) { setError(t('error_generic')); setLoading(false); return; }
        const res = await register({ username, password, fullName, email });
        if (res.needsVerification) {
          setStep('otp');
        }
      }
    } catch (e) {
      const errData = e.response?.data;
      if (errData?.needsVerification) {
        setEmail(errData.email || email);
        setStep('otp');
      } else {
        setError(errData?.error || t('error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <OtpScreen
        email={email}
        isDark={isDark}
        onBack={() => setStep('form')}
        onSuccess={() => setStep('form')}
      />
    );
  }

  return (
    <>
      <View style={[styles.authCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {/* Mode toggle */}
        <View style={[styles.modeToggle, { backgroundColor: C.bg }]}>
          {['login', 'register'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeBtn,
                mode === m && { backgroundColor: COLORS.primary },
              ]}
              onPress={() => { setMode(m); setError(''); }}
            >
              <Text style={[
                styles.modeBtnText,
                { color: mode === m ? '#0A0F1E' : C.text2, fontWeight: '700' },
              ]}>
                {m === 'login' ? t('login_btn') : t('register_btn')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.authTitle, { color: C.text }]}>
          {mode === 'login' ? t('login_title') : t('register_title')}
        </Text>
        <Text style={[styles.authSub, { color: C.text2 }]}>
          {mode === 'login' ? t('login_sub') : t('register_sub')}
        </Text>

        {mode === 'register' && (
          <Field
            label={t('register_fullname')} value={fullName} set={setFullName}
            placeholder={t('register_fullname_ph')} Icon={User} C={C}
          />
        )}
        {mode === 'register' && (
          <Field
            label={t('register_email')} value={email} set={setEmail}
            placeholder={t('register_email_ph')} Icon={Mail} C={C}
            keyboardType="email-address"
          />
        )}
        <Field
          label={t('login_username')} value={username} set={setUsername}
          placeholder={t('login_username_ph')} Icon={User} C={C}
          autoCapitalize="none"
        />
        <Field
          label={t('login_password')} value={password} set={setPassword}
          placeholder={t('login_password_ph')} Icon={Lock} C={C}
          secureTextEntry={!showPw}
          right={
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
              {showPw
                ? <EyeOff size={18} color={C.text3} />
                : <Eye size={18} color={C.text3} />
              }
            </TouchableOpacity>
          }
        />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: COLORS.error + '15', borderColor: COLORS.error + '30' }]}>
            <AlertCircle size={14} color={COLORS.error} />
            <Text style={[styles.errorTxt, { color: COLORS.error, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#0A0F1E" />
            : <Text style={styles.submitBtnText}>
                {mode === 'login' ? t('login_btn') : t('register_btn')}
              </Text>
          }
        </TouchableOpacity>

        {/* Support Button - Only in login mode */}
        {mode === 'login' && (
          <TouchableOpacity
            style={[styles.supportBtn, { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '30' }]}
            onPress={() => setShowSupport(true)}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color={COLORS.primary} />
            <Text style={[styles.supportBtnText, { color: COLORS.primary }]}>{t('profile_support')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <SupportModal visible={showSupport} onClose={() => setShowSupport(false)} isDark={isDark} />
    </>
  );
}

function Field({ label, value, set, placeholder, Icon, C, secureTextEntry = false, right, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: C.text2 }]}>{label}</Text>
      <View style={styles.fieldRow}>
        <View style={[styles.fieldIconWrap, { backgroundColor: COLORS.primary + '12' }]}>
          <Icon size={16} color={COLORS.primary} />
        </View>
        <TextInput
          style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, flex: 1 }]}
          value={value}
          onChangeText={set}
          placeholder={placeholder}
          placeholderTextColor={C.text3}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize || 'none'}
          keyboardType={keyboardType || 'default'}
        />
        {right || null}
      </View>
    </View>
  );
}

function SettingRow({ icon, label, right, onPress, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: COLORS.primary + '12' }]}>
        {icon}
      </View>
      <Text style={[styles.settingLabel, { color: C.text }]}>{label}</Text>
      <View style={styles.settingRight}>{right}</View>
    </TouchableOpacity>
  );
}

// ── Support Modal ─────────────────────────────────────────────
function SupportModal({ visible, onClose, isDark }) {
  const { t, user } = useApp();
  const C = isDark ? COLORS.dark : COLORS.light;
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError(t('support_name_required'));
      return;
    }
    if (!email.trim()) {
      setError(t('support_email_required'));
      return;
    }
    if (!message.trim()) {
      setError(t('error_generic'));
      return;
    }
    setLoading(true);
    try {
      await axios.post('http://localhost:3000/api/support', {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMessage('');
      }, 2000);
    } catch (e) {
      const errorMsg = e.response?.data?.error;
      if (errorMsg?.includes('email') || errorMsg?.includes('Email') || errorMsg?.includes('пользователь') || errorMsg?.includes('user')) {
        setError(t('support_email_not_found'));
      } else {
        setError(errorMsg || t('support_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.successIcon, { backgroundColor: COLORS.success + '18' }]}>
              <Check size={36} color={COLORS.success} />
            </View>
            <Text style={[styles.successText, { color: C.text }]}>{t('support_success')}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('support_title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={20} color={C.text2} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalDesc, { color: C.text2 }]}>{t('support_desc')}</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: COLORS.error + '15', borderColor: COLORS.error + '30' }]}>
              <AlertCircle size={14} color={COLORS.error} />
              <Text style={[styles.errorTxt, { color: COLORS.error, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: C.text2 }]}>{t('support_name')}</Text>
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIconWrap, { backgroundColor: COLORS.primary + '12' }]}>
                <User size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, flex: 1 }]}
                value={name}
                onChangeText={setName}
                placeholder={t('support_name')}
                placeholderTextColor={C.text3}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: C.text2 }]}>{t('support_email')}</Text>
            <View style={styles.fieldRow}>
              <View style={[styles.fieldIconWrap, { backgroundColor: COLORS.primary + '12' }]}>
                <Mail size={16} color={COLORS.primary} />
              </View>
              <TextInput
                style={[styles.field, { backgroundColor: C.bg, borderColor: C.border, color: C.text, flex: 1 }]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('support_email')}
                placeholderTextColor={C.text3}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: C.text2 }]}>{t('support_message')}</Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              value={message}
              onChangeText={setMessage}
              placeholder={t('support_message')}
              placeholderTextColor={C.text3}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: COLORS.primary }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#0A0F1E" />
              : <Text style={styles.submitBtnText}>{t('support_send')}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { t, theme, toggleTheme, lang, changeLang, user, logout, isAuth } = useApp();
  const isDark = theme === 'dark';
  const C = isDark ? COLORS.dark : COLORS.light;

  const handleLogout = () => {
    Alert.alert(
      t('profile_logout'),
      lang === 'ru' ? 'Вы уверены?' : lang === 'en' ? 'Are you sure?' : 'Ishonchingiz komilmi?',
      [
        { text: lang === 'uz' ? 'Bekor qilish' : lang === 'ru' ? 'Отмена' : 'Cancel', style: 'cancel' },
        { text: t('profile_logout'), style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.text }]}>{t('profile_title')}</Text>
        </View>

        {isAuth ? (
          <View style={[styles.userCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.userAvatar, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.userAvatarText}>
                {(user?.fullName || user?.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: C.text }]}>
                {user?.fullName || user?.username}
              </Text>
              <Text style={[styles.userSub, { color: C.text2 }]}>@{user?.username}</Text>
              {user?.email && (
                <Text style={[styles.userEmail, { color: C.text3 }]}>{user.email}</Text>
              )}
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: COLORS.success + '18' }]}>
              <Check size={12} color={COLORS.success} />
              <Text style={[styles.verifiedTxt, { color: COLORS.success }]}>
                {lang === 'ru' ? 'Верифицирован' : lang === 'en' ? 'Verified' : 'Tasdiqlangan'}
              </Text>
            </View>
          </View>
        ) : (
          <LoginForm isDark={isDark} />
        )}

        {/* Settings */}
        <View style={[styles.settingsCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.settingsTitle, { color: C.text3 }]}>
            {t('profile_settings').toUpperCase()}
          </Text>

          <SettingRow
            icon={<Globe size={18} color={COLORS.primary} />}
            label={t('profile_lang')}
            isDark={isDark}
            right={
              <View style={styles.langRow}>
                {LANGS.map((l) => (
                  <TouchableOpacity
                    key={l.code}
                    style={[
                      styles.langChip,
                      { borderColor: lang === l.code ? COLORS.primary : C.border },
                      lang === l.code && { backgroundColor: COLORS.primary + '20' },
                    ]}
                    onPress={() => changeLang(l.code)}
                  >
                    <Text style={[styles.langCode, {
                      color: lang === l.code ? COLORS.primary : C.text2,
                      fontWeight: lang === l.code ? '700' : '500',
                    }]}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />

          <SettingRow
            icon={isDark
              ? <Moon size={18} color={COLORS.primary} />
              : <Sun size={18} color={COLORS.primary} />
            }
            label={t('profile_theme')}
            isDark={isDark}
            right={
              <View style={styles.themeRow}>
                <Text style={[styles.themeLabel, { color: C.text2 }]}>
                  {isDark ? t('profile_dark') : t('profile_light')}
                </Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: C.border, true: COLORS.primary + '60' }}
                  thumbColor={isDark ? COLORS.primary : C.text3}
                />
              </View>
            }
          />
        </View>

        {isAuth && (
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: COLORS.error + '40' }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={18} color={COLORS.error} />
            <Text style={[styles.logoutText, { color: COLORS.error }]}>
              {t('profile_logout')}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.versionText, { color: C.text3 }]}>
          Huquq AI · {t('profile_version')} 1.0.0
        </Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: SPACING.md },
  pageHeader: { paddingTop: SPACING.md, marginBottom: SPACING.lg },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: 22, color: '#0A0F1E', fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700' },
  userSub: { fontSize: 13, marginTop: 2 },
  userEmail: { fontSize: 12, marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  verifiedTxt: { fontSize: 11, fontWeight: '600' },

  // Auth card
  authCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.sm,
  },
  modeBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: RADIUS.sm, alignItems: 'center',
  },
  modeBtnText: { fontSize: 14 },
  authTitle: { fontSize: 20, fontWeight: '800' },
  authSub: { fontSize: 13, marginBottom: SPACING.sm },

  // Fields
  fieldWrap: { marginBottom: SPACING.sm },
  fieldLabel: { fontSize: 12, marginBottom: 5, fontWeight: '600', letterSpacing: 0.3 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldIconWrap: {
    width: 40, height: 42, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  field: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 42,
    fontSize: 15,
  },
  eyeBtn: { padding: 10 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, padding: SPACING.sm,
    borderRadius: RADIUS.sm, borderWidth: 1, marginTop: 4,
  },
  errorTxt: { fontSize: 13 },

  // Submit
  submitBtn: {
    paddingVertical: 14, borderRadius: RADIUS.full,
    alignItems: 'center', marginTop: SPACING.sm,
  },
  submitBtnText: { color: '#0A0F1E', fontWeight: '800', fontSize: 16 },

  // OTP screen
  otpScreen: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, alignSelf: 'flex-start', marginBottom: SPACING.lg,
  },
  backTxt: { fontSize: 14 },
  otpIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  otpTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  otpSub: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 4 },
  otpEmail: { fontSize: 14, fontWeight: '700', marginBottom: SPACING.lg },
  otpRow: {
    flexDirection: 'row', gap: 8,
    justifyContent: 'center', marginBottom: SPACING.md,
  },
  otpBox: {
    width: 44, height: 52,
    borderRadius: RADIUS.md, borderWidth: 2,
    fontSize: 22, fontWeight: '700', textAlign: 'center',
  },
  verifyBtn: {
    width: '100%', paddingVertical: 14,
    borderRadius: RADIUS.full, alignItems: 'center',
    marginTop: SPACING.sm,
  },
  verifyBtnTxt: { fontWeight: '800', fontSize: 16 },
  resendBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: SPACING.md, padding: 8,
  },
  resendTxt: { fontSize: 14, fontWeight: '600' },

  // Settings
  settingsCard: {
    borderRadius: RADIUS.md, borderWidth: 1,
    marginBottom: SPACING.md, overflow: 'hidden',
  },
  settingsTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderBottomWidth: 1, gap: SPACING.md,
  },
  settingIconWrap: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { fontSize: 15, flex: 1 },
  settingRight: {},
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.sm, borderWidth: 1,
  },
  langCode: { fontSize: 12 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeLabel: { fontSize: 13 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: RADIUS.md,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  versionText: { textAlign: 'center', fontSize: 12 },

  // Support button
  supportBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: RADIUS.md,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  supportBtnText: { fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalClose: { padding: 4 },
  modalDesc: { fontSize: 14, marginBottom: SPACING.sm },
  textarea: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    minHeight: 100,
  },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
