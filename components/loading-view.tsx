import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

/** A full-screen centered spinner, shared by every screen's initial-load state. */
export function LoadingView() {
  const tint = useThemeColor({}, 'tint');
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator color={tint} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
