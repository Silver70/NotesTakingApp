import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { LoadingView } from '@/components/loading-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { openDatabase, runMigrations } from './client';
import { createNotesRepository, type NotesRepository } from './repository';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; repo: NotesRepository }
  | { status: 'error'; error: Error };

const NotesRepositoryContext = createContext<NotesRepository | null>(null);

/**
 * Opens the on-device database, applies pending migrations, and makes the
 * resulting Notes repository available to the app via `useNotesRepository`.
 * Renders a loading state while migrations run (they're a one-off cost,
 * but real on a first launch) and an error state if opening the database
 * fails outright, instead of letting screens underneath render against a
 * repository that was never wired up.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = openDatabase();
        await runMigrations(db);
        if (cancelled) return;
        setState({ status: 'ready', repo: createNotesRepository(db) });
      } catch (error) {
        if (cancelled) return;
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return <LoadingView />;
  }

  if (state.status === 'error') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Couldn&apos;t open the notes database</ThemedText>
        <ThemedText>{state.error.message}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <NotesRepositoryContext.Provider value={state.repo}>{children}</NotesRepositoryContext.Provider>
  );
}

export function useNotesRepository(): NotesRepository {
  const repo = useContext(NotesRepositoryContext);
  if (!repo) {
    throw new Error('useNotesRepository must be called within a DatabaseProvider');
  }
  return repo;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
});
