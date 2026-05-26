import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import {
  Scale, MapPin, Phone, Mail, Send,
  ShieldCheck, Zap, Lock, Calendar, Award, Users,
} from 'lucide-react-native';

function StatBox({ IconComp, value, label, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <View style={[styles.statBox, { backgroundColor: C.card, borderColor: C.border }]}>
      <IconComp size={20} color={COLORS.primary} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color: C.gold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.text2 }]}>{label}</Text>
    </View>
  );
}

function ContactRow({ IconComp, text, onPress, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <TouchableOpacity
      style={[styles.contactRow, { borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.contactIconWrap, { backgroundColor: COLORS.primary + '15' }]}>
        <IconComp size={18} color={COLORS.primary} />
      </View>
      <Text style={[styles.contactText, { color: C.text }]}>{text}</Text>
      {onPress && <ChevronRight size={16} color={C.text3} />}
    </TouchableOpacity>
  );
}

function FeatureRow({ IconComp, title, desc, isDark }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <View style={[styles.featureRow, { borderBottomColor: C.border }]}>
      <View style={[styles.featureIcon, { backgroundColor: COLORS.primary + '15' }]}>
        <IconComp size={20} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: C.text2 }]}>{desc}</Text>
      </View>
    </View>
  );
}

// Need ChevronRight inside ContactRow
import { ChevronRight } from 'lucide-react-native';

export default function AboutScreen() {
  const { t, theme, lang } = useApp();
  const isDark = theme === 'dark';
  const C = isDark ? COLORS.dark : COLORS.light;

  const features = [
    {
      IconComp: ShieldCheck,
      title: lang === 'ru' ? 'Надёжность' : lang === 'en' ? 'Reliability' : 'Ishonchlilik',
      desc: lang === 'ru' ? 'Каждый ответ основан на законах.' : lang === 'en' ? 'Every answer is law-based.' : 'Har bir javob qonunlarga asoslangan.',
    },
    {
      IconComp: Zap,
      title: lang === 'ru' ? 'Быстрота' : lang === 'en' ? 'Speed' : 'Tezkorlik',
      desc: lang === 'ru' ? 'Отвечаем на вопросы как можно быстрее.' : lang === 'en' ? 'We answer questions as fast as possible.' : 'Savollaringizga imkon qadar tez javob beramiz.',
    },
    {
      IconComp: Lock,
      title: lang === 'ru' ? 'Конфиденциальность' : lang === 'en' ? 'Privacy' : 'Maxfiylik',
      desc: lang === 'ru' ? 'Ваши данные полностью защищены.' : lang === 'en' ? 'Your data is fully protected.' : "Sizning ma'lumotlaringiz to'liq himoyalangan.",
    },
  ];

  const statIcons = [Calendar, Award, Users];
  const stats = t('stats');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={[styles.logoWrap, { backgroundColor: COLORS.primary }]}>
            <Scale size={36} color="#0A0F1E" />
          </View>
          <Text style={[styles.appName, { color: C.text }]}>Huquq AI</Text>
          <Text style={[styles.tagline, { color: C.text2 }]}>{t('app_tagline')}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {Array.isArray(stats) && stats.map((s, i) => (
            <StatBox
              key={i}
              IconComp={statIcons[i] || Award}
              value={s.value}
              label={s.label}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Features */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>
            {lang === 'ru' ? 'Наши преимущества' : lang === 'en' ? 'Our advantages' : 'Bizning afzalliklarimiz'}
          </Text>
          {features.map((f, i) => (
            <FeatureRow key={i} isDark={isDark} {...f} />
          ))}
        </View>

        {/* About text */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('about_title')}</Text>
          <Text style={[styles.cardText, { color: C.text2 }]}>{t('about_lead')}</Text>
        </View>

        {/* Warning */}
        <View style={[styles.warnCard, { backgroundColor: COLORS.warning + '10', borderColor: COLORS.warning + '30' }]}>
          <Text style={[styles.warnText, { color: C.text2 }]}>{t('about_warn')}</Text>
        </View>

        {/* Contact */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('contact_title')}</Text>
          <ContactRow IconComp={MapPin} text={t('contact_address')} isDark={isDark} />
          <ContactRow
            IconComp={Phone}
            text={t('contact_phone')}
            isDark={isDark}
            onPress={() => Linking.openURL(`tel:${t('contact_phone').replace(/\s/g, '')}`)}
          />
          <ContactRow
            IconComp={Mail}
            text={t('contact_email')}
            isDark={isDark}
            onPress={() => Linking.openURL(`mailto:${t('contact_email')}`)}
          />
          <ContactRow
            IconComp={Send}
            text={t('contact_telegram')}
            isDark={isDark}
            onPress={() => Linking.openURL('https://t.me/mening_huquqlarim_bot')}
          />
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: C.text3 }]}>
          {t('profile_version')} 1.0.0
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: SPACING.md },
  pageHeader: { alignItems: 'center', paddingVertical: SPACING.xl },
  logoWrap: {
    width: 80, height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  appName: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: SPACING.lg },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: SPACING.md },
  cardText: { fontSize: 14, lineHeight: 21 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  featureDesc: { fontSize: 13, lineHeight: 18 },
  warnCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  warnText: { fontSize: 13, lineHeight: 19 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  contactIconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  contactText: { flex: 1, fontSize: 14 },
  version: { textAlign: 'center', fontSize: 12, marginTop: SPACING.sm },
});
