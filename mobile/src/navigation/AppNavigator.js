import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../utils/theme';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ServicesScreen from '../screens/ServicesScreen';
import AboutScreen from '../screens/AboutScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Home, MessageCircle, Grid, Info, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const ICON_MAP = {
  HomeTab:     Home,
  ChatTab:     MessageCircle,
  ServicesTab: Grid,
  AboutTab:    Info,
  ProfileTab:  User,
};

function TabIcon({ name, focused, color }) {
  const IconComp = ICON_MAP[name] || Home;
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: COLORS.primary + '22' }]}>
      <IconComp size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
    </View>
  );
}

export default function AppNavigator() {
  const { t, theme } = useApp();
  const isDark = theme === 'dark';
  const C = isDark ? COLORS.dark : COLORS.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: t('tab_home') }} />
      <Tab.Screen name="ChatTab" component={ChatScreen} options={{ tabBarLabel: t('tab_chat') }} />
      <Tab.Screen name="ServicesTab" component={ServicesScreen} options={{ tabBarLabel: t('tab_services') }} />
      <Tab.Screen name="AboutTab" component={AboutScreen} options={{ tabBarLabel: t('tab_about') }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: t('tab_profile') }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
