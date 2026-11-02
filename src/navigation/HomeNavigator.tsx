import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MyScheduleScreen } from '../screens/MyScheduleScreen';
import { EmployeeRequestForm } from '../screens/RequestFormScreen';
import type { HomeStackParams } from './types';

const Home = createNativeStackNavigator<HomeStackParams>();
function ApplyLeave() {
  return <EmployeeRequestForm kind="leave" />;
}
export function HomeNavigator() {
  return (
    <Home.Navigator
      screenOptions={{
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
        options={{ title: 'My Schedule' }}
      />
      <Home.Screen
        name="ApplyLeave"
        component={ApplyLeave}
        options={{ title: 'Apply Leave' }}
      />
    </Home.Navigator>
  );
}
