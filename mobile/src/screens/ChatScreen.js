import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, Animated, Modal, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { chatAPI } from '../utils/api';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import {
  Scale, Send, Plus, LogIn, UserPlus, Lock,
  ShieldCheck, History, X, Trash2, ChevronRight,
  MessageSquare, Clock, ArrowLeft,
} from 'lucide-react-native';

// ── Vaqtni formatlash (ms → "2 soat 15 daqiqa" yoki "45 daqiqa") ──
function formatCountdown(ms) {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m da ochiladi`;
  if (m > 0) return `${m} daqiqada ochiladi`;
  return 'Tez orada ochiladi';
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator({ isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(a, { toValue: -6, duration: 280, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0,  duration: 280, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={[styles.msgRow, styles.msgRowBot]}>
      <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
        <Scale size={16} color="#0A0F1E" />
      </View>
      <View style={[styles.bubble, styles.bubbleBot, {
        backgroundColor: C.card,
        borderColor: C.border,
        flexDirection: 'row',
        gap: 5,
        paddingVertical: 16,
      }]}>
        {anims.map((a, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { backgroundColor: COLORS.primary, transform: [{ translateY: a }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Message bubble ────────────────────────────────────────────
function Message({ item, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  const isUser = item.role === 'user';
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
          <Scale size={16} color="#0A0F1E" />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: COLORS.primary }]
          : [styles.bubbleBot, { backgroundColor: C.card, borderColor: C.border }],
      ]}>
        <Text style={[styles.bubbleTxt, { color: isUser ? '#0A0F1E' : C.text }]}>
          {item.content}
        </Text>
        {item.timestamp && (
          <Text style={[styles.msgTime, { color: isUser ? '#0A0F1E80' : C.text3 }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Auth Wall ─────────────────────────────────────────────────
function AuthWall({ isDark, lang, onLogin, onRegister }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const title = lang === 'ru' ? 'Войдите, чтобы начать'
    : lang === 'en' ? 'Sign in to start'
    : 'Boshlash uchun kiring';
  const sub = lang === 'ru'
    ? 'Для использования AI помощника необходима регистрация'
    : lang === 'en' ? 'Registration required to use AI assistant'
    : "AI maslahatchi foydalanish uchun ro'yxatdan o'tish kerak";
  const feats = lang === 'ru'
    ? ['Неограниченные вопросы', 'История чатов', 'Безопасность данных']
    : lang === 'en' ? ['Unlimited questions', 'Chat history', 'Data security']
    : ['Cheksiz savollar', 'Chat tarixi', "Ma'lumotlar xavfsizligi"];

  return (
    <View style={[styles.wallWrap, { backgroundColor: C.bg }]}>
      <Animated.View style={[styles.wallInner, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={[styles.wallIcon, { backgroundColor: COLORS.primary }]}>
          <Lock size={36} color="#0A0F1E" />
        </View>
        <Text style={[styles.wallTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.wallSub, { color: C.text2 }]}>{sub}</Text>

        <View style={[styles.wallFeats, { backgroundColor: C.card, borderColor: C.border }]}>
          {feats.map((f, i) => (
            <View
              key={i}
              style={[
                styles.wallFeatRow,
                i < feats.length - 1 && { borderBottomColor: C.border, borderBottomWidth: 1 },
              ]}
            >
              <ShieldCheck size={16} color={COLORS.primary} />
              <Text style={[styles.wallFeatTxt, { color: C.text }]}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.wallBtn, { backgroundColor: COLORS.primary }]}
          onPress={onLogin}
          activeOpacity={0.85}
        >
          <LogIn size={18} color="#0A0F1E" />
          <Text style={styles.wallBtnTxt}>
            {lang === 'ru' ? 'Войти' : lang === 'en' ? 'Sign In' : 'Kirish'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.wallBtnOutline, { borderColor: COLORS.primary }]}
          onPress={onRegister}
          activeOpacity={0.85}
        >
          <UserPlus size={18} color={COLORS.primary} />
          <Text style={[styles.wallBtnOutlineTxt, { color: COLORS.primary }]}>
            {lang === 'ru' ? 'Зарегистрироваться' : lang === 'en' ? 'Create Account' : "Ro'yxatdan o'tish"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── History Modal ─────────────────────────────────────────────
function HistoryModal({ visible, isDark, lang, onClose, onSelect, onDelete }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    chatAPI.history()
      .then((r) => setSessions(r.data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const CAT_LABELS = {
    mehnat: 'Mehnat', oila: 'Oila', meros: 'Meros',
    yer: 'Yer', istemolchi: "Iste'molchi", jinoiy: 'Jinoyat',
    tadbirkorlik: 'Biznes', uy_joy: 'Uy-joy', general: 'Umumiy',
  };

  const handleDelete = (sessionId) => {
    Alert.alert(
      lang === 'ru' ? 'Удалить?' : lang === 'en' ? 'Delete?' : "O'chirish?",
      lang === 'ru' ? 'Этот чат будет удалён.'
        : lang === 'en' ? 'This chat will be deleted.'
        : "Bu suhbat o'chiriladi.",
      [
        { text: lang === 'ru' ? 'Отмена' : lang === 'en' ? 'Cancel' : 'Bekor', style: 'cancel' },
        {
          text: lang === 'ru' ? 'Удалить' : lang === 'en' ? 'Delete' : "O'chirish",
          style: 'destructive',
          onPress: () => {
            chatAPI.deleteSession(sessionId).catch(() => {});
            setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
            onDelete?.(sessionId);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: C.bg }]} edges={['top']}>
        <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>
            {lang === 'ru' ? 'История чатов' : lang === 'en' ? 'Chat History' : 'Suhbatlar tarixi'}
          </Text>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: C.card }]} onPress={onClose}>
            <X size={20} color={C.text2} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MessageSquare size={48} color={C.text3} />
            <Text style={[styles.emptyTxt, { color: C.text2 }]}>
              {lang === 'ru' ? 'История пуста' : lang === 'en' ? 'No history yet' : "Tarix bo'sh"}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalList}>
            {sessions.map((s) => (
              <View key={s.sessionId} style={[styles.historyItem, { backgroundColor: C.card, borderColor: C.border }]}>
                <TouchableOpacity
                  style={styles.historyItemContent}
                  onPress={() => { onSelect(s); onClose(); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.historyIcon, { backgroundColor: COLORS.primary + '15' }]}>
                    <MessageSquare size={16} color={COLORS.primary} />
                  </View>
                  <View style={styles.historyTexts}>
                    <View style={styles.historyTop}>
                      <Text style={[styles.historyCat, { color: COLORS.primary }]}>
                        {CAT_LABELS[s.category] || 'Umumiy'}
                      </Text>
                      <View style={styles.historyMeta}>
                        <Clock size={11} color={C.text3} />
                        <Text style={[styles.historyDate, { color: C.text3 }]}>
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.historyQ, { color: C.text }]} numberOfLines={2}>
                      {s.firstQuestion || '—'}
                    </Text>
                    <Text style={[styles.historyCount, { color: C.text3 }]}>
                      {s.messageCount} {lang === 'ru' ? 'сообщений' : lang === 'en' ? 'messages' : 'ta xabar'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={C.text3} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.historyDelete, { borderTopColor: C.border }]}
                  onPress={() => handleDelete(s.sessionId)}
                >
                  <Trash2 size={14} color={COLORS.error} />
                  <Text style={[styles.historyDeleteTxt, { color: COLORS.error }]}>
                    {lang === 'ru' ? 'Удалить' : lang === 'en' ? 'Delete' : "O'chirish"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Main ChatScreen ───────────────────────────────────────────
export default function ChatScreen() {
  const { t, theme, lang, user, isAuth, updateUsageStats } = useApp();
  const isDark = theme === 'dark';
  const C = isDark ? COLORS.dark : COLORS.light;
  const nav   = useNavigation();
  const route = useRoute();

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [showHist,  setShowHist]  = useState(false);

  // Limit block state
  const [isBlocked,  setIsBlocked]  = useState(false);
  const [unblockAt,  setUnblockAt]  = useState(null); // Date object
  const [countdown,  setCountdown]  = useState('');   // "2 soat 15 daqiqa da ochiladi"

  const flatRef = useRef(null);

  // ── Countdown timer ──
  useEffect(() => {
    if (!unblockAt) return;
    const update = () => {
      const ms = new Date(unblockAt) - Date.now();
      if (ms <= 0) {
        setIsBlocked(false);
        setUnblockAt(null);
        setCountdown('');
        setRemaining(null);
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      if (lang === 'ru') {
        setCountdown(h > 0 ? `Откроется через ${h}ч ${m}м` : `Откроется через ${m} мин`);
      } else if (lang === 'en') {
        setCountdown(h > 0 ? `Opens in ${h}h ${m}m` : `Opens in ${m} min`);
      } else {
        setCountdown(h > 0 ? `${h}h ${m}m da ochiladi` : `${m} daqiqada ochiladi`);
      }
    };
    update();
    const id = setInterval(update, 30000); // har 30 soniyada yangilash
    return () => clearInterval(id);
  }, [unblockAt, lang]);

  const genSession = () => `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const initChat = useCallback(() => {
    if (!isAuth) return;
    setSessionId(genSession());
    setMessages([{
      role: 'assistant',
      content: lang === 'ru'
        ? 'Здравствуйте! Я ваш профессиональный юридический помощник по законодательству Узбекистана. Какой у вас вопрос?'
        : lang === 'en'
        ? 'Hello! I am your professional legal assistant based on Uzbekistan law. What is your question?'
        : "Salom! Men O'zbekiston qonunchiligiga asoslangan professional huquqiy maslahatchi. Savolingizni bering.",
      timestamp: new Date().toISOString(),
    }]);
    setRemaining(null);
  }, [lang, isAuth]);

  useEffect(() => { initChat(); }, [initChat]);

  // Auto-fill question from navigation params
  useEffect(() => {
    if (route.params?.question && isAuth) {
      setInput(route.params.question);
    }
  }, [route.params?.question, isAuth]);

  const scrollToBottom = () => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || isBlocked) return;

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await chatAPI.send(text, sessionId, lang);
      const { reply, remaining: rem, sessionId: sid, unblockAt: uat, timeLeft } = res.data;
      if (sid && !sessionId) setSessionId(sid);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }]);

      if (rem !== undefined) {
        setRemaining(rem);
        updateUsageStats({ remaining: rem, unblockAt: uat, timeLeft });
        if (rem === 1) {
          const { showLimitWarning } = await import('../utils/notifications');
          await showLimitWarning(1, null).catch(() => {});
        }
      }
    } catch (err) {
      const status  = err.response?.status;
      const errData = err.response?.data || {};

      if (status === 429 && errData.limitExceeded) {
        // Limit tugadi — inputni block qilish
        setIsBlocked(true);
        setRemaining(0);
        if (errData.unblockAt) {
          setUnblockAt(errData.unblockAt);
          updateUsageStats({ remaining: 0, unblockAt: errData.unblockAt, timeLeft: errData.timeLeft });
        }

        const blockMsg = lang === 'ru'
          ? `⏳ Ваш дневной лимит исчерпан (${errData.limit} вопросов).\n\n${errData.timeLeft ? `Доступ откроется через: ${errData.timeLeft}` : 'Попробуйте завтра.'}`
          : lang === 'en'
          ? `⏳ Daily limit reached (${errData.limit} questions).\n\n${errData.timeLeft ? `Access opens in: ${errData.timeLeft}` : 'Try again tomorrow.'}`
          : `⏳ Kunlik limit tugadi (${errData.limit} ta savol).\n\n${errData.timeLeft ? `Ochiladi: ${errData.timeLeft} dan so'ng` : "Ertaga qayta urinib ko'ring."}`;

        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: blockMsg,
          timestamp: new Date().toISOString(),
          isSystemMsg: true,
        }]);

        const { showLimitWarning } = await import('../utils/notifications');
        await showLimitWarning(0, errData.timeLeft).catch(() => {});
      } else {
        const errMsg = errData?.error || t('chat_error');
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: errMsg,
          timestamp: new Date().toISOString(),
        }]);
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  // Load a past session from history
  const loadSession = async (session) => {
    try {
      const res = await chatAPI.session(session.sessionId);
      const { messages: msgs, sessionId: sid } = res.data;
      setSessionId(sid || session.sessionId);
      setMessages(msgs.map((m) => ({
        role:      m.role,
        content:   m.content,
        timestamp: m.timestamp || new Date().toISOString(),
      })));
    } catch {
      Alert.alert('Xatolik', 'Suhbat yuklanmadi');
    }
  };

  const goToProfile = () => nav.navigate('ProfileTab');

  // Placeholder matni — block bo'lsa countdown ko'rsatiladi
  const inputPlaceholder = isBlocked
    ? (countdown || (lang === 'ru' ? 'Лимит исчерпан...' : lang === 'en' ? 'Limit reached...' : 'Limit tugadi...'))
    : t('chat_placeholder');

  // ── Auth wall ──
  if (!isAuth) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerAvatar, { backgroundColor: COLORS.primary }]}>
              <Scale size={18} color="#0A0F1E" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: C.text }]}>{t('chat_title')}</Text>
              <Text style={[styles.headerSub, { color: C.text3 }]}>
                {lang === 'ru' ? 'Требуется вход' : lang === 'en' ? 'Login required' : 'Kirish kerak'}
              </Text>
            </View>
          </View>
        </View>
        <AuthWall isDark={isDark} lang={lang} onLogin={goToProfile} onRegister={goToProfile} />
      </SafeAreaView>
    );
  }

  // ── Chat UI ──
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerAvatar, { backgroundColor: COLORS.primary }]}>
            <Scale size={18} color="#0A0F1E" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t('chat_title')}</Text>
            <Text style={[styles.headerSub, { color: COLORS.success }]}>● Online</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { borderColor: C.border }]}
            onPress={() => setShowHist(true)}
          >
            <History size={18} color={C.text2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, styles.newBtn, { borderColor: COLORS.primary + '50' }]}
            onPress={initChat}
          >
            <Plus size={16} color={C.gold} />
            <Text style={[styles.newBtnTxt, { color: C.gold }]}>{t('chat_new')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Remaining banner — faqat qolgan limit ko'rsatiladi (block bo'lmasa) */}
      {remaining !== null && !isBlocked && (
        <View style={[styles.remainBanner, { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary + '30' }]}>
          <Text style={[styles.remainTxt, { color: COLORS.primary }]}>
            {t('chat_remaining').replace('{n}', remaining)}
          </Text>
        </View>
      )}

      {/* Block banner — limit tugagan bo'lsa */}
      {isBlocked && (
        <View style={[styles.blockBanner, { backgroundColor: COLORS.error + '18', borderColor: COLORS.error + '35' }]}>
          <Clock size={14} color={COLORS.error} />
          <Text style={[styles.blockTxt, { color: COLORS.error }]}>
            {countdown || (lang === 'ru' ? 'Лимит исчерпан' : lang === 'en' ? 'Daily limit reached' : 'Kunlik limit tugadi')}
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={loading ? [...messages, { role: 'typing', content: '', timestamp: '' }] : messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        renderItem={({ item }) =>
          item.role === 'typing'
            ? <TypingIndicator isDark={isDark} />
            : <Message item={item} isDark={isDark} />
        }
      />

      {/* Input row */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'margin' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={[
          styles.inputRow,
          { backgroundColor: C.surface, borderTopColor: C.border },
          isBlocked && { opacity: 0.75 },
        ]}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: C.card, borderColor: isBlocked ? COLORS.error + '60' : C.border, color: C.text },
            ]}
            placeholder={inputPlaceholder}
            placeholderTextColor={isBlocked ? COLORS.error + 'AA' : C.text3}
            value={input}
            onChangeText={isBlocked ? undefined : setInput}
            editable={!isBlocked}
            multiline
            maxLength={2000}
          />
          {/* Yuborish tugmasi — limit tugasa to'liq disabled va ko'rinmaydi */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: isBlocked
                  ? C.border
                  : input.trim() && !loading ? COLORS.primary : C.border,
              },
            ]}
            onPress={isBlocked ? undefined : sendMessage}
            disabled={!input.trim() || loading || isBlocked}
            activeOpacity={isBlocked ? 1 : 0.8}
          >
            {loading
              ? <ActivityIndicator size="small" color="#0A0F1E" />
              : <Send size={20} color={!isBlocked && input.trim() && !loading ? '#0A0F1E' : C.text3} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* History modal */}
      <HistoryModal
        visible={showHist}
        isDark={isDark}
        lang={lang}
        onClose={() => setShowHist(false)}
        onSelect={loadSession}
        onDelete={(sid) => { if (sid === sessionId) initChat(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700' },
  headerSub:    { fontSize: 12 },
  headerActions:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  newBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full, width: 'auto', height: 'auto',
    flexDirection: 'row', gap: 4,
  },
  newBtnTxt: { fontSize: 13, fontWeight: '600' },

  // Remaining
  remainBanner: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderBottomWidth: 1, alignItems: 'center',
  },
  remainTxt: { fontSize: 13, fontWeight: '600' },

  // Block banner
  blockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  blockTxt: { fontSize: 13, fontWeight: '600' },

  // Messages
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.lg },
  msgRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot:  { justifyContent: 'flex-start' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  bubble:     { maxWidth: '80%', padding: SPACING.md, borderRadius: RADIUS.lg },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot:  { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleTxt:  { fontSize: 15, lineHeight: 22 },
  msgTime:    { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  dot:        { width: 8, height: 8, borderRadius: 4 },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: SPACING.md, gap: SPACING.sm, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: RADIUS.lg, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: 15, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  // Auth wall
  wallWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  wallInner: { width: '100%', alignItems: 'center' },
  wallIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  wallTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, marginBottom: SPACING.sm },
  wallSub:   { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: SPACING.xl, paddingHorizontal: SPACING.md },
  wallFeats: { width: '100%', borderRadius: RADIUS.md, borderWidth: 1, marginBottom: SPACING.lg, overflow: 'hidden' },
  wallFeatRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: SPACING.md, paddingVertical: 14,
  },
  wallFeatTxt: { fontSize: 14, fontWeight: '500' },
  wallBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, width: '100%',
    paddingVertical: 16, borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  wallBtnTxt: { color: '#0A0F1E', fontWeight: '800', fontSize: 16 },
  wallBtnOutline: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, width: '100%',
    paddingVertical: 16, borderRadius: RADIUS.full, borderWidth: 1.5,
  },
  wallBtnOutlineTxt: { fontWeight: '700', fontSize: 16 },

  // History Modal
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle:  { fontSize: 20, fontWeight: '800' },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTxt:    { fontSize: 15 },
  modalList:   { padding: SPACING.md, gap: SPACING.sm },

  historyItem: { borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  historyItemContent: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, gap: SPACING.md,
  },
  historyIcon: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  historyTexts: { flex: 1 },
  historyTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 3,
  },
  historyCat:   { fontSize: 12, fontWeight: '700' },
  historyMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyDate:  { fontSize: 11 },
  historyQ:     { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 3 },
  historyCount: { fontSize: 12 },
  historyDelete: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderTopWidth: 1,
  },
  historyDeleteTxt: { fontSize: 13, fontWeight: '600' },
});
