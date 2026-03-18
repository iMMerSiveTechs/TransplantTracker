import { useColorScheme } from '@/lib/useColorScheme';
import { colors } from '@/data/colors';

export interface Theme {
  bg: string;
  bgElevated: string;
  bgCard: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
}

const lightTheme: Theme = {
  bg: colors.slate50,
  bgElevated: colors.white,
  bgCard: colors.white,
  border: colors.slate200,
  textPrimary: colors.slate800,
  textSecondary: colors.slate600,
  textMuted: colors.slate400,
  primary: colors.indigo500,
  primaryBg: colors.indigo50,
  success: colors.emerald700,
  successBg: colors.emerald50,
  warning: colors.amber700,
  warningBg: colors.amber50,
  danger: colors.rose700,
  dangerBg: colors.rose50,
};

const darkTheme: Theme = {
  bg: '#0F172A',        // slate900
  bgElevated: '#1E293B', // slate800
  bgCard: '#1E293B',
  border: '#334155',    // slate700
  textPrimary: '#F1F5F9', // slate100
  textSecondary: '#CBD5E1', // slate300
  textMuted: '#64748B',  // slate500
  primary: '#818CF8',   // indigo400
  primaryBg: '#1E1B4B', // indigo950
  success: '#34D399',   // emerald400
  successBg: '#022C22', // emerald950
  warning: '#FBBF24',   // amber400
  warningBg: '#1C1208', // dark amber
  danger: '#FB7185',    // rose400
  dangerBg: '#1C0510',  // dark rose
};

export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}

export { lightTheme, darkTheme };
