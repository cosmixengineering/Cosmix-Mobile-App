import { LanguageSwitch } from '../LanguageSwitch';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  AppState,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { authColors } from '../../theme/authTheme';
import { AuthAmbientBackground } from './AuthAmbientBackground';

const MotionContext = createContext(false);
export const useAuthMotion = () => useContext(MotionContext);

export function AuthFrame({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const reduced = useMotionPreference();
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const progress = useRef(new Animated.Value(1)).current;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const viewportHeight = useRef(0);
  const revealInput = React.useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const content = scroll.current?.getInnerViewRef();
    if (!input || !content || !viewportHeight.current) return;
    input.measureLayout(content, (_x, y, _width, fieldHeight) => {
      const clearance = Math.min(80, viewportHeight.current / 4);
      scroll.current?.scrollTo({
        y: Math.max(0, y + fieldHeight + clearance - viewportHeight.current),
        animated: !reduced,
      });
    });
  }, [reduced]);
  useEffect(() => {
    if (!focused || Platform.OS !== 'android') return;
    const subscription = Keyboard.addListener('keyboardDidShow', revealInput);
    return () => subscription.remove();
  }, [focused, revealInput]);
  const motion = focused && active && !reduced;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next =>
      setActive(next === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!motion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [motion, progress]);
  return (
    <MotionContext.Provider value={motion}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <AuthAmbientBackground motion={motion} />
        <SafeAreaView style={styles.safe}>
          <ScrollView
            ref={scroll}
            onLayout={event => {
              viewportHeight.current = event.nativeEvent.layout.height;
              if (focused && Platform.OS === 'android' && Keyboard.isVisible())
                revealInput();
            }}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.card,
                {
                  minHeight: Math.max(
                    580,
                    height - insets.top - insets.bottom - 32,
                  ),
                  opacity: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                  transform: [
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LanguageSwitch />
              {children}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </MotionContext.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    padding: 16,
    backgroundColor: authColors.card,
    gap: 12,
    boxShadow: '0 2px 8px rgba(21, 33, 61, 0.05)',
  },
});
