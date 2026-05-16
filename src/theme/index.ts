export const colors = {
  background: '#F8F6F1',
  surface: '#FFFFFF',
  card: '#F2F0EB',
  accent: '#2C3E6B',
  accentLight: '#EEF1F8',
  accentSoft: '#4A5E8A',
  success: '#3D7A5C',
  successLight: '#EBF5EF',
  danger: '#C0392B',
  dangerLight: '#FBEAE8',
  warning: '#B7621A',
  warningLight: '#FDF3E8',
  gold: '#B7621A',
  text: '#1A1917',
  textSecondary: '#7A7570',
  textMuted: '#B0ADA6',
  border: '#E8E5DE',
  borderStrong: '#D0CCC4',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  smallBold: { fontSize: 13, fontWeight: '600' as const },
  tiny: { fontSize: 11, fontWeight: '400' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};

export const shadow = {
  sm: {
    shadowColor: '#1A1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};
