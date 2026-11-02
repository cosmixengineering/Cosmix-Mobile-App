import { StyleSheet } from 'react-native';

export const colors = {
  navy: '#15213D',
  primary: '#123D70',
  canvas: '#F7F8FA',
  teal: '#087E83',
  mint: '#DFF3EE',
  background: '#F3F6F8',
  white: '#FFFFFF',
  text: '#222E46',
  muted: '#53647A',
  line: '#E1E6EF',
  danger: '#A12C36',
  dangerSoft: '#FFF0F0',
  amber: '#815500',
  amberSoft: '#FFF4D9',
};

export const density = {
  page: 14,
  panel: 12,
  radius: 12,
  gap: 10,
  touch: 44,
} as const;

export const layout = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 680,
    padding: density.page,
    gap: density.gap,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: density.radius,
    padding: density.panel,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  heading: { fontSize: 16, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, lineHeight: 20, color: colors.text },
  muted: { fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stack6: { gap: 6 },
  stack8: { gap: 8 },
  divider: { height: 1, backgroundColor: colors.line },
});
