import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { LoadingView } from '@/components/loading-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { openDatabase, runMigrations } from './client';
import { createNotesRepository, type NotesRepository } from './repository';
import { createSettingsRepository, type SettingsRepository } from './settings-repository';

/** The repositories built over the one open database handle. Two separate
 * seams rather than one (see settings-repository.ts), handed out through
 * their own hooks so no screen ends up holding the one it doesn't use. */
interface Repositories {
  notes: NotesRepository;
  settings: SettingsRepository;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; repos: Repositories }
  | { status: 'error'; error: Error };

const RepositoriesContext = createContext<Repositories | null>(null);

/**
 * Opens the on-device database, applies pending migrations, and makes the
 * resulting Notes and Settings repositories available to the app via
 * `useNotesRepository` / `useSettingsRepository`.
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
        setState({
          status: 'ready',
          repos: { notes: createNotesRepository(db), settings: createSettingsRepository(db) },
        });
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
    <RepositoriesContext.Provider value={state.repos}>{children}</RepositoriesContext.Provider>
  );
}

function useRepositories(hookName: string): Repositories {
  const repos = useContext(RepositoriesContext);
  if (!repos) {
    throw new Error(`${hookName} must be called within a DatabaseProvider`);
  }
  return repos;
}

export function useNotesRepository(): NotesRepository {
  return useRepositories('useNotesRepository').notes;
}

export function useSettingsRepository(): SettingsRepository {
  return useRepositories('useSettingsRepository').settings;
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
