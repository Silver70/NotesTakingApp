import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

/** A full-screen centered spinner, shared by every screen's initial-load state. */
export function LoadingView() {
  return (
    <ThemedView style={styles.centered}>
      <ActivityIndicator />
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
