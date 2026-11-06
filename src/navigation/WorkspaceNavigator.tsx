import { t } from '../i18n/language';
import { useLanguage } from '../i18n/preference';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { HomeNavigator } from './HomeNavigator';
import { ServicesScreen } from '../screens/ServicesScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useSession } from '../app/AppProvider';
import { useMotionPreference } from '../hooks/useMotionPreference';
import { canOpenService, resolveHistoryCategory } from '../constants/services';
import { ProfilePhotoProvider } from '../components/ProfilePhoto';
import { colors } from '../theme/theme';
import {
  WorkspaceInteraction,
  useWorkspaceInteraction,
} from './WorkspaceInteraction';
import { WorkspaceTabBar } from './WorkspaceTabBar';
import type { WorkspaceScreenProps, WorkspaceTabParams } from './types';

const Tabs = createMaterialTopTabNavigator<WorkspaceTabParams>();

function renderTabBar(props: MaterialTopTabBarProps): React.JSX.Element {
  return <WorkspaceTabBar {...props} />;
}

function TabHeading({ title }: { title: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
    </SafeAreaView>
  );
}

function ProfileTab() {
  useLanguage();
  return (
    <>
      <TabHeading title={t('Profile')} />
      <ProfileScreen />
    </>
  );
}

function HistoryTab(props: WorkspaceScreenProps<'History'>) {
  useLanguage();
  const auth = useSession();
  const showHeading =
    resolveHistoryCategory(props.route.params?.category, auth) !== 'punches';
  return (
    <>
      {showHeading && <TabHeading title={t('History')} />}
      <HistoryScreen {...props} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white },
  title: {
    textAlign: 'center',
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
});

export function WorkspaceNavigator() {
  return (
    <WorkspaceInteraction>
      <WorkspacePages />
    </WorkspaceInteraction>
  );
}

function WorkspacePages(): React.JSX.Element {
  const { locked } = useWorkspaceInteraction();
  const reducedMotion = useMotionPreference();
  useLanguage();
  const auth = useSession();
  const photoSession = canOpenService('profile', auth)
    ? auth.sessionId ?? null
    : null;
  return (
    <ProfilePhotoProvider key={photoSession} sessionId={photoSession}>
      <Tabs.Navigator
        backBehavior="history"
        tabBar={renderTabBar}
        tabBarPosition="bottom"
        screenOptions={{
          animationEnabled: !reducedMotion,
          swipeEnabled: !locked,
          lazy: true,
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="Dashboard"
          component={HomeNavigator}
          options={({ route }) => ({
            swipeEnabled:
              !locked &&
              (getFocusedRouteNameFromRoute(route) ?? 'HomeOverview') ===
                'HomeOverview',
            title: t('Home'),
            tabBarAccessibilityLabel: t('Home'),
          })}
        />
        <Tabs.Screen
          name="Services"
          component={ServicesScreen}
          options={{
            title: t('Services'),
            tabBarAccessibilityLabel: t('Employee services'),
          }}
        />
        <Tabs.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{
            title: t('Attendance'),
            tabBarAccessibilityLabel: t('Attendance: Check In and Check Out'),
          }}
        />
        <Tabs.Screen
          name="History"
          component={HistoryTab}
          options={{
            title: t('History'),
            tabBarAccessibilityLabel: t('History: your records'),
          }}
        />
        <Tabs.Screen
          name="Profile"
          component={ProfileTab}
          options={{
            title: t('Profile'),
            tabBarAccessibilityLabel: t('Your profile'),
          }}
        />
      </Tabs.Navigator>
    </ProfilePhotoProvider>
  );
}
