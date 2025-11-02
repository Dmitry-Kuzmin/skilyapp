// Sound library for duel game effects
// Using Howler.js for better audio control

class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;

  constructor() {
    // Pre-load all sounds
    this.preloadSounds();
  }

  private preloadSounds() {
    // Note: In production, replace with actual audio files
    // For now, we'll use the Web Audio API to generate simple tones
    
    // This is a placeholder - in production you'd load actual audio files:
    // this.sounds.boostFiftyFifty = new Audio('/sounds/zap.mp3');
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Более тихая громкость для ненавязчивости
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Notification sounds
  notificationPop() {
    this.playTone(880, 0.08);
    setTimeout(() => this.playTone(1100, 0.08), 60);
  }

  notificationImportant() {
    this.playTone(660, 0.1);
    setTimeout(() => this.playTone(880, 0.15), 100);
  }

  // Boost sounds
  boostFiftyFifty() {
    this.playTone(800, 0.2, 'square');
    setTimeout(() => this.playTone(600, 0.2, 'square'), 100);
  }

  boostTimeExtend() {
    this.playTone(400, 0.1);
    setTimeout(() => this.playTone(600, 0.1), 100);
    setTimeout(() => this.playTone(800, 0.2), 200);
  }

  boostHint() {
    this.playTone(523, 0.1); // C
    setTimeout(() => this.playTone(659, 0.2), 100); // E
  }

  boostSkip() {
    this.playTone(800, 0.1);
    setTimeout(() => this.playTone(1000, 0.15), 80);
  }

  boostFreeze() {
    this.playTone(200, 0.3, 'sawtooth');
    setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 200);
  }

  // Answer sounds
  correctAnswer() {
    this.playTone(523, 0.1); // C
    setTimeout(() => this.playTone(659, 0.1), 80); // E
    setTimeout(() => this.playTone(784, 0.2), 160); // G
  }

  wrongAnswer() {
    this.playTone(200, 0.3, 'sawtooth');
  }

  // Opponent sounds
  opponentAnswer() {
    this.playTone(440, 0.08);
  }

  // Timer sounds
  timeRunningOut() {
    this.playTone(880, 0.1);
  }

  timeExtended() {
    this.playTone(440, 0.15);
    setTimeout(() => this.playTone(554, 0.2), 100);
  }

  // Combo sounds
  combo(comboLevel: number) {
    const baseFreq = 440;
    for (let i = 0; i < Math.min(comboLevel, 5); i++) {
      setTimeout(() => {
        this.playTone(baseFreq * (1 + i * 0.2), 0.1);
      }, i * 50);
    }
  }

  // Confetti sound
  confetti() {
    this.playTone(523, 0.08);
    setTimeout(() => this.playTone(659, 0.08), 60);
    setTimeout(() => this.playTone(784, 0.08), 120);
    setTimeout(() => this.playTone(1047, 0.12), 180);
  }

  // Victory/Defeat
  victory() {
    this.playTone(523, 0.15);
    setTimeout(() => this.playTone(659, 0.15), 120);
    setTimeout(() => this.playTone(784, 0.15), 240);
    setTimeout(() => this.playTone(1047, 0.3), 360);
  }

  defeat() {
    this.playTone(400, 0.2);
    setTimeout(() => this.playTone(350, 0.2), 150);
    setTimeout(() => this.playTone(300, 0.4), 300);
  }

  // Question transition
  questionTransition() {
    this.playTone(600, 0.1);
  }

  // Enable/disable sounds
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const sounds = new SoundManager();
