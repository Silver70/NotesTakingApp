import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { createDictationAdapter, type DictationAdapter } from './dictation-adapter';

/**
 * The app-runtime Dictation adapter, wired to the real on-device speech
 * recognizer. Mirrors `db/client.ts` vs `db/repository.ts`: the seam
 * (`dictation-adapter.ts`) stays driver-agnostic and fully testable, while
 * this file is the one place that touches the actual native module.
 *
 * Test-only code must never import this file — `ExpoSpeechRecognitionModule`
 * throws immediately under Jest ("Cannot find native module
 * 'ExpoSpeechRecognition'") since no native binary is loaded there. Tests
 * exercise `createDictationAdapter` directly against a fake `DictationEngine`
 * instead (see `__tests__/dictation-adapter.test.ts`).
 */
export function createNativeDictationAdapter(): DictationAdapter {
  return createDictationAdapter(ExpoSpeechRecognitionModule);
}
