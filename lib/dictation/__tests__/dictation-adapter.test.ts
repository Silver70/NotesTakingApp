import type { ExpoSpeechRecognitionNativeEventMap } from 'expo-speech-recognition';

import { createDictationAdapter, type DictationEngine } from '../dictation-adapter';

type ResultListener = (event: ExpoSpeechRecognitionNativeEventMap['result']) => void;
type ErrorListener = (event: ExpoSpeechRecognitionNativeEventMap['error']) => void;

/**
 * A synthetic stand-in for `ExpoSpeechRecognitionModule` (ticket 07's
 * testing decision: drive the adapter via synthetic partial/final events,
 * never the real native module — see spec.md's "Testing Decisions"). Only
 * `emitResult`/`emitError` are test-only API; everything else is the real
 * `DictationEngine` surface.
 */
function createFakeEngine() {
  const resultListeners = new Set<ResultListener>();
  const errorListeners = new Set<ErrorListener>();
  return {
    start: jest.fn(),
    stop: jest.fn(),
    addListener: jest.fn((eventName: 'result' | 'error', listener: ResultListener | ErrorListener) => {
      const listeners = eventName === 'result' ? resultListeners : errorListeners;
      listeners.add(listener as never);
      return { remove: () => listeners.delete(listener as never) };
    }),
    emitResult(event: ExpoSpeechRecognitionNativeEventMap['result']) {
      resultListeners.forEach((listener) => listener(event));
    },
    emitError(event: ExpoSpeechRecognitionNativeEventMap['error']) {
      errorListeners.forEach((listener) => listener(event));
    },
  } satisfies DictationEngine & {
    emitResult: (event: ExpoSpeechRecognitionNativeEventMap['result']) => void;
    emitError: (event: ExpoSpeechRecognitionNativeEventMap['error']) => void;
  };
}

function partialResult(transcript: string): ExpoSpeechRecognitionNativeEventMap['result'] {
  return { isFinal: false, results: [{ transcript, confidence: 0, segments: [] }] };
}

function finalResult(transcript: string): ExpoSpeechRecognitionNativeEventMap['result'] {
  return { isFinal: true, results: [{ transcript, confidence: 0.9, segments: [] }] };
}

describe('createDictationAdapter', () => {
  it('start/stop proxy independently to the underlying engine', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);

    adapter.start();
    expect(engine.start).toHaveBeenCalledTimes(1);
    expect(engine.stop).not.toHaveBeenCalled();

    adapter.stop();
    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it('configures the engine for on-device recognition with interim results, never a network call', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);

    adapter.start();

    expect(engine.start).toHaveBeenCalledWith(
      expect.objectContaining({ requiresOnDeviceRecognition: true, interimResults: true }),
    );
  });

  it('never asks the engine to persist audio', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);

    adapter.start();

    const options = engine.start.mock.calls[0][0];
    expect(options.recordingOptions).toBeUndefined();
    expect(options.audioSource).toBeUndefined();
  });

  it('emits partial results as interim speech comes in, before the user stops speaking', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onPartial = jest.fn();
    adapter.onPartialResult(onPartial);

    engine.emitResult(partialResult('Hello wor'));

    expect(onPartial).toHaveBeenCalledWith({ transcript: 'Hello wor' });
  });

  it('emits a final result once recognition settles on a phrase', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onFinal = jest.fn();
    adapter.onFinalResult(onFinal);

    engine.emitResult(finalResult('Hello world.'));

    expect(onFinal).toHaveBeenCalledWith({ transcript: 'Hello world.' });
  });

  it('keeps partial and final listeners independent of each other', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onPartial = jest.fn();
    const onFinal = jest.fn();
    adapter.onPartialResult(onPartial);
    adapter.onFinalResult(onFinal);

    engine.emitResult(partialResult('Hello'));
    expect(onPartial).toHaveBeenCalledTimes(1);
    expect(onFinal).not.toHaveBeenCalled();

    engine.emitResult(finalResult('Hello world.'));
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onPartial).toHaveBeenCalledTimes(1);
  });

  it('only ever hands a consumer the transcript — no confidence, segments, or other native fields', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onFinal = jest.fn();
    adapter.onFinalResult(onFinal);

    engine.emitResult(finalResult('Buy milk.'));

    expect(onFinal).toHaveBeenCalledWith({ transcript: 'Buy milk.' });
    expect(Object.keys(onFinal.mock.calls[0][0])).toEqual(['transcript']);
  });

  it('ignores a result event with no transcript', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onPartial = jest.fn();
    adapter.onPartialResult(onPartial);

    engine.emitResult({ isFinal: false, results: [] });

    expect(onPartial).not.toHaveBeenCalled();
  });

  it('delivers a final result with a legitimately empty transcript, distinct from no result at all', () => {
    // Ticket 08's consumer resets its own bookkeeping on every final
    // result — dropping this one (a truthiness check would, since '' is
    // falsy) would leave that bookkeeping a result stale.
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onFinal = jest.fn();
    adapter.onFinalResult(onFinal);

    engine.emitResult({ isFinal: true, results: [{ transcript: '', confidence: 0, segments: [] }] });

    expect(onFinal).toHaveBeenCalledWith({ transcript: '' });
  });

  it('stops delivering results once unsubscribed', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onPartial = jest.fn();
    const unsubscribe = adapter.onPartialResult(onPartial);

    unsubscribe();
    engine.emitResult(partialResult('still talking'));

    expect(onPartial).not.toHaveBeenCalled();
  });

  it('surfaces an engine failure (e.g. permission denied) through onError', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onError = jest.fn();
    adapter.onError(onError);

    engine.emitError({ error: 'not-allowed', message: 'Microphone permission denied' });

    expect(onError).toHaveBeenCalledWith({ code: 'not-allowed', message: 'Microphone permission denied' });
  });

  it('stops delivering errors once unsubscribed', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);
    const onError = jest.fn();
    const unsubscribe = adapter.onError(onError);

    unsubscribe();
    engine.emitError({ error: 'no-speech', message: 'No speech detected' });

    expect(onError).not.toHaveBeenCalled();
  });

  it('supports starting and stopping multiple times across one adapter instance', () => {
    const engine = createFakeEngine();
    const adapter = createDictationAdapter(engine);

    adapter.start();
    adapter.stop();
    adapter.start();
    adapter.stop();

    expect(engine.start).toHaveBeenCalledTimes(2);
    expect(engine.stop).toHaveBeenCalledTimes(2);
  });
});
