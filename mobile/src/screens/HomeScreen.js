import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import {
  Scale, MessageSquare, ChevronRight, AlertTriangle,
  Briefcase, Users, Home, ShoppingCart, Gavel, FileText,
  Bell, Menu, Star, Clock,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

function StatCard({ value, label, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.statValue, { color: C.gold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.text2 }]}>{label}</Text>
    </View>
  );
}

function CategoryCard({ IconComp, title, onPress, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <TouchableOpacity
      style={[styles.catCard, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.catIconWrap, { backgroundColor: COLORS.primary + '18' }]}>
        <IconComp size={26} color={COLORS.primary} />
      </View>
      <Text style={[styles.catTitle, { color: C.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function QuickQuestion({ text, onPress, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <TouchableOpacity
      style={[styles.quickBtn, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.quickText, { color: C.text, flex: 1 }]}>{text}</Text>
      <View style={[styles.quickIcon, { backgroundColor: COLORS.primary + '18' }]}>
        <ChevronRight size={16} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { t, theme, lang, user } = useApp();
  const isDark = theme === 'dark';
  const C = isDark ? COLORS.dark : COLORS.light;
  const nav = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const cats = t('cats');
  const quickQs = t('quick_questions');

  const catIconMap = {
    'Mehnat huquqi': Briefcase,
    'Oila huquqi': Users,
    'Meros va mulk': Home,
    'Yer masalalari': FileText,
    "Iste'molchi huquqlari": ShoppingCart,
    'Jinoyat huquqi': Gavel,
    'Labor law': Briefcase,
    'Family law': Users,
    'Inheritance': Home,
    'Land issues': FileText,
    "Consumer rights": ShoppingCart,
    'Criminal law': Gavel,
    'Трудовое право': Briefcase,
    'Семейное право': Users,
    'Наследство': Home,
    'Земельные вопросы': FileText,
    'Права потребителей': ShoppingCart,
    'Уголовное право': Gavel,
  };

  const catsWithIcons = Array.isArray(cats) ? cats.map(cat => ({
    ...cat,
    IconComp: catIconMap[cat.title] || Scale,
  })) : [];

  const stats_data = [
    { value: '8+', label: t('stats_areas') || 'Sohalar' },
    { value: '500+', label: lang === 'ru' ? 'Дел' : lang === 'en' ? 'Cases' : 'Ishlar' },
    { value: '1000+', label: lang === 'ru' ? 'Клиентов' : lang === 'en' ? 'Clients' : 'Mijozlar' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: C.border }]}>
        <View style={styles.topLeft}>
          <View style={[styles.logoCircle, { backgroundColor: COLORS.primary }]}>
            <Scale size={16} color="#0A0F1E" />
          </View>
          <Text style={[styles.topTitle, { color: C.text }]}>
            {lang === 'ru' ? 'ПРАВО ДЛЯ ВАС' : lang === 'en' ? 'LAW FOR YOU' : 'HUQUQ ADOLAT'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { borderColor: C.border }]}>
          <Bell size={18} color={C.text2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Hero section */}
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, { color: C.text }]}>
              {lang === 'ru'
                ? 'Ваше право —\nнаша главная цель'
                : lang === 'en'
                ? 'Your right is our\nprimary goal'
                : 'Huquqingiz bizning\nustuvor maqsadimiz'}
            </Text>
            <Text style={[styles.heroSub, { color: C.text2 }]}>
              {lang === 'ru'
                ? 'Профессиональная юридическая помощь по законодательству Узбекистана.'
                : lang === 'en'
                ? "Professional legal help based on Uzbekistan's legislation."
                : "O'zbekiston huquq sohasida sizga professional yordam beramiz."}
            </Text>

            {/* Search bar */}
            <TouchableOpacity
              style={[styles.searchBar, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => nav.navigate('ChatTab')}
              activeOpacity={0.85}
            >
              <Text style={[styles.searchPlaceholder, { color: C.text3 }]}>
                {lang === 'ru' ? 'Задайте свой вопрос...' : lang === 'en' ? 'Ask your question...' : 'Savolingizni yozing...'}
              </Text>
              <View style={[styles.searchBtn, { backgroundColor: COLORS.primary }]}>
                <MessageSquare size={16} color="#0A0F1E" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats_data.map((s, i) => (
              <StatCard key={i} value={s.value} label={s.label} isDark={isDark} />
            ))}
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>
                {lang === 'ru' ? 'В каких областях я помогу?' : lang === 'en' ? 'How can I help?' : 'Qaysi sohalarda yordam beraman?'}
              </Text>
              <TouchableOpacity onPress={() => nav.navigate('ServicesTab')}>
                <Text style={[styles.seeAll, { color: COLORS.primary }]}>
                  {lang === 'ru' ? 'Все' : lang === 'en' ? 'See all' : "Barchasini ko'rish"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.catsGrid}>
              {catsWithIcons.slice(0, 6).map((cat, i) => (
                <CategoryCard
                  key={i}
                  IconComp={cat.IconComp}
                  title={cat.title}
                  isDark={isDark}
                  onPress={() => nav.navigate('ChatTab', { question: cat.title })}
                />
              ))}
            </View>
          </View>

          {/* Quick questions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('quick_title')}</Text>
            </View>
            {Array.isArray(quickQs) && quickQs.slice(0, 4).map((q, i) => (
              <QuickQuestion
                key={i}
                text={q}
                isDark={isDark}
                onPress={() => nav.navigate('ChatTab', { question: q })}
              />
            ))}
          </View>

          {/* How it works */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {lang === 'ru' ? 'Как это работает?' : lang === 'en' ? 'How does it work?' : 'Qanday ishlaydi?'}
            </Text>
            {[
              {
                num: '01',
                title: lang === 'ru' ? 'Задайте вопрос' : lang === 'en' ? 'Ask a question' : 'Savolingizni yozing',
                sub: lang === 'ru' ? 'Создайте бесплатный аккаунт' : lang === 'en' ? 'Create a free account' : 'Bepul hisob yarating',
                Icon: MessageSquare,
              },
              {
                num: '02',
                title: lang === 'ru' ? 'AI отвечает' : lang === 'en' ? 'AI answers' : 'Al javob beradi',
                sub: lang === 'ru' ? 'Объяснение на понятном языке' : lang === 'en' ? 'Simple explanation' : 'Oddiy tilda tushuntirish',
                Icon: Scale,
              },
              {
                num: '03',
                title: lang === 'ru' ? 'Получите решение' : lang === 'en' ? 'Get the solution' : 'Yechimni oling',
                sub: lang === 'ru' ? 'Точный ответ на основе закона' : lang === 'en' ? 'Law-based exact answer' : 'Qonun asosida aniq javob',
                Icon: Star,
              },
            ].map((step, i) => (
              <View key={i} style={[styles.stepRow, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={[styles.stepNumBadge, { backgroundColor: COLORS.primary + '18' }]}>
                  <Text style={[styles.stepNum, { color: COLORS.primary }]}>{step.num}</Text>
                </View>
                <View style={[styles.stepIconWrap, { backgroundColor: C.bg }]}>
                  <step.Icon size={20} color={COLORS.primary} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: C.text }]}>{step.title}</Text>
                  <Text style={[styles.stepSub, { color: C.text2 }]}>{step.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Warning */}
          <View style={[styles.warnBox, { backgroundColor: C.card, borderColor: COLORS.warning + '35' }]}>
            <AlertTriangle size={15} color={COLORS.warning} style={{ marginRight: 8 }} />
            <Text style={[styles.warnText, { color: C.text2, flex: 1 }]}>
              {lang === 'ru'
                ? "Предоставляет общую информацию. По сложным делам консультируйтесь с адвокатом."
                : lang === 'en'
                ? 'Provides general information. Consult a lawyer for complex cases.'
                : "Umumiy ma'lumot beradi. Murakkab ishlarda advokat bilan maslahatlashing."}
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: SPACING.md },
  hero: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: SPACING.sm,
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingLeft: SPACING.md,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchPlaceholder: { flex: 1, fontSize: 14 },
  searchBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  catsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  catCard: {
    width: (width - SPACING.md * 2 - SPACING.sm) / 2,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  catIconWrap: {
    width: 46, height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  catTitle: { fontSize: 13, fontWeight: '700' },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  quickText: { fontSize: 14, flex: 1, marginRight: 8 },
  quickIcon: {
    width: 30, height: 30, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  stepNumBadge: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '800' },
  stepIconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepSub: { fontSize: 12, marginTop: 2 },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  warnText: { fontSize: 13, lineHeight: 19 },
});
