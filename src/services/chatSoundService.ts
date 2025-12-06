import { Howl } from 'howler';

/**
 * Chat sound service for gaming-themed sound effects
 * Uses Howler.js for cross-browser audio support
 */

// Sound configuration
const SOUND_ENABLED_KEY = 'battlemanager_chat_sounds_enabled';
const DEFAULT_SOUND_ENABLED = true;

// Check if sounds are enabled (user preference)
const isSoundEnabled = (): boolean => {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  if (stored === null) return DEFAULT_SOUND_ENABLED;
  return stored === 'true';
};

// Generate a simple beep sound using Web Audio API as fallback
const generateBeepSound = (frequency: number, duration: number, type: 'sent' | 'received'): Howl => {
  // For now, we'll use a simple approach with Howler
  // In production, you can replace this with actual sound files
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a simple tone
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type === 'sent' ? 'sine' : 'square';
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  // Since we can't easily convert Web Audio to Howl, we'll use a placeholder
  // In production, load actual sound files
  return new Howl({
    src: [], // Empty - will use Web Audio fallback
    volume: 0.3,
    onloaderror: () => {
      // Fallback to Web Audio API
      try {
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        console.warn('Could not play sound:', e);
      }
    },
  });
};

// Create sound instances (lazy loaded)
let sentSound: Howl | null = null;
let receivedSound: Howl | null = null;

/**
 * Initialize chat sounds
 * In production, replace with actual sound file paths
 */
const initSounds = () => {
  if (sentSound && receivedSound) return;

  // For now, create placeholder sounds
  // In production, load actual sound files:
  // sentSound = new Howl({ src: ['/sounds/message-sent.mp3'], volume: 0.3 });
  // receivedSound = new Howl({ src: ['/sounds/message-received.mp3'], volume: 0.3 });

  // Placeholder: Use Web Audio API for simple beeps
  // This is a fallback until actual sound files are added
  sentSound = new Howl({
    src: [],
    volume: 0.2,
    html5: true,
  });

  receivedSound = new Howl({
    src: [],
    volume: 0.15,
    html5: true,
  });
};

/**
 * Play sound effect when message is sent
 */
export const playMessageSent = (): void => {
  if (!isSoundEnabled()) return;

  try {
    initSounds();
    if (sentSound) {
      // Use Web Audio API as fallback
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Higher pitch for sent
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  } catch (error) {
    // Silently fail if audio is not available
    console.debug('Could not play sent sound:', error);
  }
};

/**
 * Play sound effect when message is received
 */
export const playMessageReceived = (): void => {
  if (!isSoundEnabled()) return;

  try {
    initSounds();
    if (receivedSound) {
      // Use Web Audio API as fallback
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 600; // Lower pitch for received
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  } catch (error) {
    // Silently fail if audio is not available
    console.debug('Could not play received sound:', error);
  }
};

/**
 * Toggle sound effects on/off
 */
export const toggleSounds = (enabled: boolean): void => {
  localStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
};

/**
 * Check if sounds are currently enabled
 */
export const getSoundsEnabled = (): boolean => {
  return isSoundEnabled();
};

