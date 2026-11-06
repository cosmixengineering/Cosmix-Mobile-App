import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MyScheduleScreen } from '../screens/MyScheduleScreen';
import { EmployeeRequestForm } from '../screens/RequestFormScreen';
import { useMotionPreference } from '../hooks/useMotionPreference';
import type { HomeStackParams } from './types';

const Home = createNativeStackNavigator<HomeStackParams>();
function ApplyLeave() {
  return <EmployeeRequestForm kind="leave" />;
}
export function HomeNavigator() {
  useLanguage();
  const reducedMotion = useMotionPreference();
  return (
    <Home.Navigator
      screenOptions={{
        animation: reducedMotion ? 'none' : 'slide_from_right',
        animationDuration: 260,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 17, fontWeight: '700' },
        headerTintColor: '#101532',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#FAFAFC' },
      }}
    >
      <Home.Screen
        name="HomeOverview"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Home.Screen
        name="MySchedule"
        component={MyScheduleScreen}
        options={{ title: t('My Schedule') }}
      />
      <Home.Screen
        name="ApplyLeave"
        component={ApplyLeave}
        options={{ title: t('Apply Leave') }}
      />
    </Home.Navigator>
  );
}
