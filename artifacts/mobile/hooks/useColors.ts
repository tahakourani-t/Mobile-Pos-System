import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

/**
 * Returns the design tokens for the current color scheme.
 *
 * Priority: storeSettings.theme (light | dark | blue | system).
 * When 'system', follows the device appearance setting.
 */
export function useColors() {
  const systemScheme = useColorScheme();

  // AppContext may not be mounted yet (loading screen) — guard with try/catch
  let theme: 'light' | 'dark' | 'blue' | 'system' = 'light';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { storeSettings } = useApp();
    theme = storeSettings?.theme ?? 'light';
  } catch {
    theme = 'light';
  }

  let palette: typeof colors.light;
  if (theme === 'system') {
    palette = systemScheme === 'dark' ? colors.dark : colors.light;
  } else if (theme === 'dark') {
    palette = colors.dark;
  } else if (theme === 'blue') {
    palette = colors.blue;
  } else {
    palette = colors.light;
  }

  return { ...palette, radius: colors.radius };
}
