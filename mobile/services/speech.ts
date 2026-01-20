import * as Speech from 'expo-speech';

/**
 * Default TTS configuration.
 * Change values here to adjust global speech characteristics.
 */
export const DEFAULT_SPEECH_CONFIG: Omit<Speech.SpeechOptions, 'onDone' | 'onStopped' | 'onError'> =
  {
    language: 'en-US',
    rate: 1.1, // Slightly faster for urgency
    pitch: 1.0,
  };

/**
 * Speak a message using expo-speech with default config merged
 * with any callback overrides.
 *
 * @param message - The text to speak
 * @param callbacks - Optional TTS callbacks (onDone, onError, etc.)
 */
export function speak(
  message: string,
  callbacks?: Pick<Speech.SpeechOptions, 'onDone' | 'onStopped' | 'onError'>
) {
  Speech.speak(message, {
    ...DEFAULT_SPEECH_CONFIG,
    ...callbacks,
  });
}

/**
 * Stop any ongoing TTS playback.
 */
export function stopSpeaking(): Promise<void> {
  return Speech.stop();
}

/**
 * Returns whether TTS is currently speaking.
 */
export function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
