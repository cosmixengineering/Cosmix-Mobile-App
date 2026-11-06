import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
export type HomeSymbol =
  | 'faceScan'
  | 'applyLeave'
  | 'shiftClock'
  | 'editRequest'
  | 'punch'
  | 'leave'
  | 'schedule'
  | 'request'
  | 'bell'
  | 'present'
  | 'late'
  | 'absent'
  | 'site';
const paths: Record<HomeSymbol, string> = {
  faceScan:
    'M8 3H4v4m12-4h4v4M4 17v4h4m12-4v4h-4M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM7 17a5 5 0 0 1 10 0',
  applyLeave:
    'M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M7 2v4m8-4v4M3 9h16M22 17a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM17 14.5v5m-2.5-2.5h5',
  shiftClock:
    'M12 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M7 2v4m8-4v4M3 9h16M22 17a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM17 14v3l2 1',
  editRequest:
    'M8 4H5v17h9M16 4h3v5M9 3h2a1 1 0 0 1 2 0h2v3H9zM8 10h7m-7 4h4M14 18l6-6 2 2-6 6-3 1z',
  punch:
    'M3 11a9 9 0 0 1 18 0M6 12a6 6 0 1 1 12 0c0 3-.4 5-1.4 8M9 13v-1a3 3 0 0 1 6 0c0 3-.3 7-2.4 10M12 12c0 5-1.2 7.5-3.3 10M5.7 14.5c0 2.2-.6 3.8-1.4 5M8.6 16c-.2 2-1 4.1-2 5',
  leave: 'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-12 4h2m3 0h3m-8 3h2',
  schedule: 'M3 6h18v15H3zM7 3v5m10-5v5M3 11h18',
  request: 'M5 2h9l5 5v15H5zM14 2v6h5M8 12h8m-8 4h6',
  bell: 'M5 17h14c-2-2-2-3-2-7a5 5 0 0 0-10 0c0 4 0 5-2 7ZM10 20c.5 1.8 3.5 1.8 4 0',
  present: 'M3 6h18v15H3zM7 3v5m10-5v5M3 10h18m-13 5 3 3 5-5',
  late: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 2',
  absent: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9l6 6m0-6-6 6',
  site: 'M5 21V5l10-2v18m0-12 4 1v11M3 21h18M8 8v1m3-2v1m-3 4v1m3-2v1m-3 4v1m3-2v1',
};
export function HomeIcon({
  name,
  color,
  size = 24,
}: {
  name: HomeSymbol;
  color: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d={paths[name]} />
    </Svg>
  );
}
export function HeroBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 150"
        preserveAspectRatio="none"
        accessible={false}
      >
        <Defs>
          <LinearGradient id="hero" x2="1" y2=".45">
            <Stop offset="0" stopColor="#254887" />
            <Stop offset=".6" stopColor="#122F59" />
            <Stop offset="1" stopColor="#186877" />
          </LinearGradient>
        </Defs>
        <Rect width="360" height="150" fill="url(#hero)" />
        <Circle
          cx="316"
          cy="62"
          r="94"
          fill="none"
          stroke="#5363CA"
          strokeOpacity=".33"
          strokeWidth="24"
        />
        <Circle
          cx="331"
          cy="63"
          r="69"
          fill="none"
          stroke="#2DBEAC"
          strokeOpacity=".18"
          strokeWidth="18"
        />
      </Svg>
    </View>
  );
}
