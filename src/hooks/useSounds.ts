import { useState, useCallback, useRef } from 'react';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

export const useSounds = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a single tone
  const playTone = useCallback((config: SoundConfig) => {
    if (!soundEnabled) return;

    try {
      const audioContext = initAudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      oscillator.type = config.type;

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (error) {
      console.log('Sound playback failed:', error);
    }
  }, [soundEnabled, initAudioContext]);

  // Predefined sound effects
  const sounds = {
    // UI Sounds
    click: () => playTone({ frequency: 800, duration: 0.1, type: 'sine' }),
    hover: () => playTone({ frequency: 600, duration: 0.05, type: 'sine' }),
    success: () => playTone({ frequency: 523, duration: 0.3, type: 'sine' }), // C5
    error: () => playTone({ frequency: 200, duration: 0.2, type: 'square' }),
    celebration: () => {
      // Play a sequence of notes
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.2, type: 'sine' }), index * 100);
      });
    },

    // Math Game Sounds
    correct: () => {
      const sequence = [523, 659, 784]; // C5, E5, G5
      sequence.forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.15, type: 'sine' }), index * 80);
      });
    },
    incorrect: () => playTone({ frequency: 200, duration: 0.3, type: 'square' }),

    // Music Room Sounds
    piano: () => playTone({ frequency: 523, duration: 0.5, type: 'triangle' }), // C5
    drum: () => playTone({ frequency: 150, duration: 0.2, type: 'square' }),
    guitar: () => playTone({ frequency: 440, duration: 0.3, type: 'sawtooth' }), // A4
    trumpet: () => playTone({ frequency: 349, duration: 0.4, type: 'sawtooth' }), // F4
    violin: () => playTone({ frequency: 659, duration: 0.6, type: 'triangle' }), // E5
    flute: () => playTone({ frequency: 784, duration: 0.8, type: 'sine' }), // G5

    // Art Studio Sounds
    brush: () => playTone({ frequency: 400, duration: 0.1, type: 'sine' }),
    eraser: () => playTone({ frequency: 300, duration: 0.15, type: 'square' }),
    save: () => {
      const sequence = [523, 784, 1047]; // C5, G5, C6
      sequence.forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.2, type: 'sine' }), index * 150);
      });
    },

    // World Explorer Sounds
    travel: () => {
      const sequence = [440, 523, 659, 784, 880]; // A4, C5, E5, G5, A5
      sequence.forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.1, type: 'sine' }), index * 100);
      });
    },

    // Achievement Sounds
    achievement: () => {
      const sequence = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
      sequence.forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.2, type: 'sine' }), index * 100);
      });
    },

    // Story Reading Sounds
    pageTurn: () => playTone({ frequency: 600, duration: 0.1, type: 'sine' }),
    storyComplete: () => {
      const sequence = [523, 587, 659, 698, 784, 880, 988, 1047]; // C major scale
      sequence.forEach((freq, index) => {
        setTimeout(() => playTone({ frequency: freq, duration: 0.15, type: 'triangle' }), index * 80);
      });
    }
  };

  return {
    soundEnabled,
    setSoundEnabled,
    playTone,
    ...sounds
  };
};