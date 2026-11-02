import { StyleSheet } from 'react-native';

export const authColors = {
  background: '#F5F7FB',
  card: '#FFFFFF',
  primary: '#153E74',
  ink: '#15213D',
  muted: '#57657A',
  line: '#DFE6EF',
  soft: '#F1F5FA',
  green: '#087C4A',
};

export const authStyles = StyleSheet.create({
  stack: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    color: authColors.ink,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  heading: {
    color: authColors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  body: { color: authColors.muted, fontSize: 14, lineHeight: 20 },
  label: { color: authColors.ink, fontSize: 14, fontWeight: '600' },
  caption: { color: authColors.muted, fontSize: 12, lineHeight: 19 },
  centered: { textAlign: 'center' },
  link: { color: authColors.primary, fontWeight: '700', fontSize: 14 },
});
