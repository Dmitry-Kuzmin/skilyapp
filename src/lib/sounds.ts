// Modern sound library for duel game effects
// Using Web Audio API for lightweight, modern sound effects

class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private unlocked: boolean = false;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Audio context initialization failed:', e);
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    return this.audioContext;
  }

  // Check if audio context is unlocked
  isUnlocked(): boolean {
    return this.unlocked || (this.audioContext?.state === 'running' ?? false);
  }

  // Force unlock audio context (for Telegram WebApp)
  forceUnlock(): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.unlocked = true;
        console.log('[SoundManager] AudioContext unlocked');
      }).catch((e) => {
        console.warn('[SoundManager] Failed to unlock AudioContext:', e);
      });
    } else {
      this.unlocked = true;
    }
  }

  // Play a modern UI sound with envelope
  private playSound(
    frequency: number = 800,
    duration: number = 0.08,
    type: OscillatorType = 'sine',
    volume: number = 0.12,
    envelope: { attack?: number; decay?: number; sustain?: number; release?: number } = {}
  ) {
    if (!this.enabled) return;

    const audioContext = this.ensureAudioContext();
    if (!audioContext) return;

    // Auto-unlock if suspended
    if (audioContext.state === 'suspended') {
      this.forceUnlock();
    }

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      // Modern envelope with attack, decay, sustain, release
      const attack = envelope.attack ?? 0.01;
      const decay = envelope.decay ?? 0.02;
      const sustain = envelope.sustain ?? 0.6;
      const release = envelope.release ?? 0.05;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + attack); // Attack
      gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay); // Decay
      gainNode.gain.setValueAtTime(volume * sustain, now + duration - release); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Play a click/tap sound
  private playClick(frequency: number = 1000, volume: number = 0.1) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Quick click - very short attack and release
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.001);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      oscillator.start(now);
      oscillator.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Play a pop sound
  private playPop(pitch: 'high' | 'medium' | 'low' = 'medium', volume: number = 0.12) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) return;

    try {
      const frequencies = { high: 1200, medium: 800, low: 600 };
      const freq = frequencies[pitch];
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(freq, now);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 0.3, now + 0.08);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      oscillator.start(now);
      oscillator.stop(now + 0.08);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Play a success sound (modern chime)
  private playSuccess(volume: number = 0.15) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;
      
      // Play a pleasant chord
      const frequencies = [523.25, 659.25, 783.99]; // C, E, G
      frequencies.forEach((freq, i) => {
        const oscillator = audioContext!.createOscillator();
        const gainNode = audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext!.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const delay = i * 0.05;
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + delay + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.15);
      });
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Play an error sound (soft buzz)
  private playError(volume: number = 0.1) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 300;
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.setValueAtTime(volume, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      oscillator.start(now);
      oscillator.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  // Notification sounds
  notificationPop() {
    this.playPop('high', 0.1);
  }

  notificationImportant() {
    this.playClick(1200, 0.12);
    setTimeout(() => this.playPop('medium', 0.1), 100);
  }

  // Boost sounds
  boostFiftyFifty() {
    this.playSound(800, 0.1, 'sine', 0.12, { attack: 0.01, release: 0.08 });
  }

  boostTimeExtend() {
    this.playClick(1000, 0.1);
    setTimeout(() => this.playPop('high', 0.1), 80);
  }

  boostHint() {
    this.playPop('medium', 0.11);
  }

  boostSkip() {
    this.playClick(900, 0.1);
  }

  boostFreeze() {
    this.playSound(400, 0.15, 'sine', 0.1, { attack: 0.02, release: 0.1 });
  }

  // Answer sounds
  correctAnswer() {
    this.playSuccess(0.15);
  }

  wrongAnswer() {
    this.playError(0.1);
  }

  // Opponent sounds
  opponentAnswer() {
    this.playClick(600, 0.08);
  }

  // Timer sounds
  timeRunningOut() {
    this.playClick(800, 0.09);
  }

  // Countdown sounds
  countdownTick() {
    this.playClick(700, 0.08);
  }

  countdownFinish() {
    this.playSuccess(0.18);
  }

  timeExtended() {
    this.playPop('high', 0.12);
  }

  // Combo sounds
  combo(comboLevel: number) {
    const baseFreq = 800;
    const volume = 0.1;
    const delay = 50;
    
    for (let i = 0; i < Math.min(comboLevel, 5); i++) {
      setTimeout(() => {
        const freq = baseFreq * (1 + i * 0.15);
        this.playSound(freq, 0.08, 'sine', volume, { attack: 0.01, release: 0.06 });
      }, i * delay);
    }
  }

  // Confetti sound
  confetti() {
    // Play multiple quick pops
    this.playPop('high', 0.1);
    setTimeout(() => this.playPop('medium', 0.1), 60);
    setTimeout(() => this.playPop('high', 0.1), 120);
  }

  // Victory/Defeat
  victory() {
    // Modern victory sound - ascending tones
    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playSound(freq, 0.2, 'sine', 0.15, { attack: 0.02, decay: 0.05, release: 0.1 });
      }, i * 100);
    });
  }

  defeat() {
    this.playError(0.12);
  }

  // Question transition
  questionTransition() {
    this.playClick(600, 0.06);
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
