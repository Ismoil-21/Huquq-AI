import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../utils/theme';
import {
  Briefcase, Users, Home, FileText, ShoppingCart, Gavel,
  Scale, ChevronRight, MessageCircle,
} from 'lucide-react-native';

const SERVICE_ICONS = [Briefcase, Users, Home, FileText, ShoppingCart, Gavel, Scale, FileText];

function ServiceCard({ IconComp, title, desc, onPress, isDark, index }) {
  const C = isDark ? COLORS.dark : COLORS.light;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.cardIcon, { backgroundColor: COLORS.primary + '18' }]}>
        <IconComp size={24} color={COLORS.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: C.text }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: C.text2 }]}>{desc}</Text>
      </View>
      <View style={[styles.arrowWrap, { backgroundColor: C.bg }]}>
        <ChevronRight size={16} color={C.text3} />
      </View>
    </TouchableOpacity>
  );
}

export default function ServicesScreen() {
  const { t, theme, lang } = useApp();
  const isDark = theme === 'dark';
  const C = isDark ? COLORS.dark : COLORS.light;
  const nav = useNavigation();
  const services = t('services');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.text }]}>{t('services_title')}</Text>
          <Text style={[styles.pageSub, { color: C.text2 }]}>{t('services_subtitle')}</Text>
        </View>

        {/* Services list */}
        {Array.isArray(services) && services.map((s, i) => (
          <ServiceCard
            key={i}
            IconComp={SERVICE_ICONS[i] || Scale}
            title={s.title}
            desc={s.desc}
            isDark={isDark}
            index={i}
            onPress={() => nav.navigate('ChatTab', { question: s.title })}
          />
        ))}

        {/* CTA */}
        <View style={[styles.cta, { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '30' }]}>
          <Scale size={28} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
          <Text style={[styles.ctaTitle, { color: C.text }]}>
            {lang === 'ru' ? 'Задайте ваш вопрос' : lang === 'en' ? 'Ask your question' : 'Savolingizni bering'}
          </Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => nav.navigate('ChatTab')}
            activeOpacity={0.85}
          >
            <MessageCircle size={16} color="#0A0F1E" style={{ marginRight: 8 }} />
            <Text style={styles.ctaBtnText}>{t('tab_chat')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: SPACING.md },
  pageHeader: { marginBottom: SPACING.lg, paddingTop: SPACING.md },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, marginTop: 6 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  cardIcon: {
    width: 50, height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  arrowWrap: {
    width: 28, height: 28, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  cta: {
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.md },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
  },
  ctaBtnText: { color: '#0A0F1E', fontWeight: '800', fontSize: 15 },
});
