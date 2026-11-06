import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type DimensionValue,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { useLanguage } from '../../i18n/preference';
import { t } from '../../i18n/language';

type Kind = 'card' | 'list' | 'field' | 'avatar' | 'badge' | 'summary';
type Sweep = Animated.Value | null;

function Bar({
  sweep,
  width,
  height = 12,
  round = false,
}: {
  sweep: Sweep;
  width: DimensionValue;
  height?: number;
  round?: boolean;
}) {
  const [span, setSpan] = useState(0);
  return (
    <View
      onLayout={e => setSpan(e.nativeEvent.layout.width)}
      style={[styles.bar, { width, height }, round && styles.round]}
    >
      {sweep && span > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                {
                  translateX: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-span, span],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="shine" x1="0%" x2="100%" y1="0%" y2="0%">
                <Stop offset="0" stopColor="#f1f5f9" stopOpacity={0} />
                <Stop offset="0.55" stopColor="#f8fafc" />
                <Stop offset="1" stopColor="#f1f5f9" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#shine)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

export function LoadingSkeleton({
  kind = 'card',
  label,
  rows = 3,
}: {
  kind?: Kind;
  label?: string;
  rows?: number;
}) {
  const reduced = useMotionPreference();
  const language = useLanguage();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const rtl = language === 'ur';
    progress.setValue(rtl ? 1 : 0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: rtl ? 0 : 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        isInteraction: false,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduced, language]);
  const sweep = reduced ? null : progress;
  const bar = (width: DimensionValue, height?: number, round?: boolean) => (
    <Bar sweep={sweep} width={width} height={height} round={round} />
  );
  let content;
  switch (kind) {
    case 'avatar':
      content = bar(48, 48, true);
      break;
    case 'badge':
      content = bar(28, 10, true);
      break;
    case 'field':
      content = (
        <>
          {bar('36%')}
          {bar('100%', 40)}
        </>
      );
      break;
    case 'summary':
      content = (
        <View style={styles.row}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.flex}>
              {bar('100%', 62)}
            </View>
          ))}
        </View>
      );
      break;
    case 'list':
      content = Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          {bar(30, 30, true)}
          <View style={styles.flex}>
            {bar('73%')}
            {bar('45%', 9)}
          </View>
          {bar(42, 14, true)}
        </View>
      ));
      break;
    case 'card':
      content = (
        <>
          {bar('53%', 16)}
          {bar('91%')}
          {bar('68%')}
        </>
      );
      break;
  }
  return (
    <View
      accessible
      accessibilityLabel={label ?? t('Loading…')}
      accessibilityState={{ busy: true }}
      pointerEvents="none"
      style={styles.group}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.group}
      >
        {content}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1, gap: 6 },
  round: { borderRadius: 999 },
  bar: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#e2e8f0' },
});
