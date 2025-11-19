// Modern sound library for duel game effects
// Using Web Audio API for lightweight, modern sound effects
const isClient = typeof window !== "undefined";
const isTelegramAudioEnv = isClient && !!(window as any).Telegram?.WebApp;
const enableAudioDebug =
  import.meta.env.VITE_DEBUG_AUDIO === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_DEBUG_ALL === "true");
const shouldLogAudio = isTelegramAudioEnv || enableAudioDebug;
const audioLog = (...args: any[]) => {
  if (shouldLogAudio) {
    console.debug(...args);
  }
};
const audioWarn = (...args: any[]) => {
  if (shouldLogAudio) {
    audioWarn(...args);
  }
};
const audioError = (...args: any[]) => {
  if (shouldLogAudio) {
    audioError(...args);
  }
};

class SoundManager {
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private enabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private unlocked: boolean = false;

  constructor() {
    // Initialize audio context on first user interaction
    if (isClient) {
      // Проверяем, запущено ли приложение в Telegram WebApp
      audioLog("[SoundManager] 🎵 Инициализация SoundManager:", {
        isTelegram: isTelegramAudioEnv,
        platform: isTelegramAudioEnv ? window.Telegram?.WebApp?.platform : "web",
        userAgent: navigator.userAgent,
      });

      if (isTelegramAudioEnv) {
        this.initAudioContext();
      }
      // Автоматическая разблокировка при первом взаимодействии пользователя
      this.setupAutoUnlock();
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioLog("[SoundManager] ✅ AudioContext создан");
    } catch (e) {
      audioWarn("[SoundManager] ⚠️ Audio context initialization failed:", e);
    }
  }

  // Автоматическая разблокировка при первом взаимодействии пользователя
  private setupAutoUnlock() {
    // Список событий для разблокировки
    const unlockEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
    
    const unlockAudio = (event?: Event) => {
      if (this.unlocked) return;
      
      // Логируем событие разблокировки
      audioLog('[SoundManager] 🔓 Попытка разблокировки AudioContext через событие:', event?.type || 'unknown');
      
      const unlocked = this.unlockAudio();
      if (unlocked) {
        audioLog('[SoundManager] ✅ AudioContext успешно разблокирован');
      } else {
        audioWarn('[SoundManager] ⚠️ Не удалось разблокировать AudioContext');
      }
    };

    // Добавляем слушатели для разблокировки
    // Используем capture phase для более раннего перехвата событий
    unlockEvents.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true, capture: true });
      // Также добавляем на window для надежности
      window.addEventListener(event, unlockAudio, { once: true, passive: true, capture: true });
    });

    audioLog('[SoundManager] 🔓 Автоматическая разблокировка настроена для событий:', unlockEvents);
  }

  // Разблокировка AudioContext через пользовательский жест
  public unlockAudio(): boolean {
    if (this.unlocked) {
      audioLog('[SoundManager] ✅ Audio уже разблокирован');
      return true;
    }

    const audioContext = this.ensureAudioContext();
    if (!audioContext) {
      audioWarn('[SoundManager] ⚠️ AudioContext не создан');
      return false;
    }

    audioLog('[SoundManager] 🔍 Состояние AudioContext перед разблокировкой:', {
      state: audioContext.state,
      sampleRate: audioContext.sampleRate,
      destination: audioContext.destination,
    });

    try {
      // Проверяем состояние контекста
      if (audioContext.state === 'suspended') {
        audioLog('[SoundManager] 🔄 AudioContext в состоянии suspended, пробуем возобновить...');
        // Пробуем возобновить контекст
        audioContext.resume().then(() => {
          audioLog('[SoundManager] ✅ AudioContext возобновлен, состояние:', audioContext.state);
          this.unlocked = true;
        }).catch((e) => {
          audioWarn('[SoundManager] ⚠️ Не удалось возобновить AudioContext:', e);
        });
      }

      // Разблокируем через воспроизведение тихого звука
      // Это критически важно для Telegram WebApp
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);

      this.unlocked = true;
      audioLog('[SoundManager] 🔓 Audio разблокирован через пользовательский жест, состояние:', audioContext.state);
      return true;
    } catch (e) {
      audioWarn('[SoundManager] ⚠️ Не удалось разблокировать Audio:', e);
      audioError('[SoundManager] Детали ошибки:', {
        error: e,
        audioContextState: audioContext.state,
        audioContextExists: !!audioContext,
      });
      return false;
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    // Если контекст в состоянии suspended, пробуем возобновить
    if (this.audioContext && this.audioContext.state === 'suspended') {
      audioLog('[SoundManager] 🔄 AudioContext в состоянии suspended, пробуем возобновить...');
      this.audioContext.resume().then(() => {
        audioLog('[SoundManager] ✅ AudioContext возобновлен, состояние:', this.audioContext?.state);
        this.unlocked = true;
      }).catch((e) => {
        audioWarn('[SoundManager] ⚠️ Не удалось возобновить AudioContext:', e);
      });
    }
    
    return this.audioContext;
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
    if (!audioContext) {
      audioWarn('[SoundManager] ⚠️ AudioContext недоступен');
      return;
    }

    // Если контекст заблокирован, пробуем разблокировать
    // КРИТИЧЕСКИ ВАЖНО для Telegram WebApp: проверяем и unlocked, и состояние suspended
    if (!this.unlocked || audioContext.state === 'suspended') {
      audioLog('[SoundManager] 🔓 Попытка разблокировки AudioContext перед воспроизведением звука');
      this.unlockAudio();
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
      audioWarn('[SoundManager] ⚠️ Audio playback failed:', e);
      // Если ошибка из-за блокировки, пробуем разблокировать
      if (!this.unlocked) {
        this.unlockAudio();
      }
    }
  }

  // Play a click/tap sound
  private playClick(frequency: number = 1000, volume: number = 0.1) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) {
      audioWarn('[SoundManager] ⚠️ AudioContext недоступен');
      return;
    }

    // Если контекст заблокирован, пробуем разблокировать
    // КРИТИЧЕСКИ ВАЖНО для Telegram WebApp: проверяем и unlocked, и состояние suspended
    if (!this.unlocked || audioContext.state === 'suspended') {
      audioLog('[SoundManager] 🔓 Попытка разблокировки AudioContext перед воспроизведением звука');
      this.unlockAudio();
    }

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
      audioWarn('[SoundManager] ⚠️ Audio playback failed:', e);
      // Если ошибка из-за блокировки, пробуем разблокировать
      if (!this.unlocked) {
        this.unlockAudio();
      }
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
      audioWarn('[SoundManager] ⚠️ Audio playback failed:', e);
      // Если ошибка из-за блокировки, пробуем разблокировать
      if (!this.unlocked) {
        this.unlockAudio();
      }
    }
  }

  // Play a success sound (modern chime)
  private playSuccess(volume: number = 0.15) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) {
      audioWarn('[SoundManager] ⚠️ AudioContext недоступен');
      return;
    }

    // Если контекст заблокирован, пробуем разблокировать
    // КРИТИЧЕСКИ ВАЖНО для Telegram WebApp: проверяем и unlocked, и состояние suspended
    if (!this.unlocked || audioContext.state === 'suspended') {
      audioLog('[SoundManager] 🔓 Попытка разблокировки AudioContext перед воспроизведением звука');
      this.unlockAudio();
    }

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
      audioWarn('[SoundManager] ⚠️ Audio playback failed:', e);
      // Если ошибка из-за блокировки, пробуем разблокировать
      if (!this.unlocked) {
        this.unlockAudio();
      }
    }
  }

  // Play an error sound (soft buzz)
  private playError(volume: number = 0.1) {
    if (!this.enabled) return;
    const audioContext = this.ensureAudioContext();
    if (!audioContext) {
      audioWarn('[SoundManager] ⚠️ AudioContext недоступен');
      return;
    }

    // Если контекст заблокирован, пробуем разблокировать
    // КРИТИЧЕСКИ ВАЖНО для Telegram WebApp: проверяем и unlocked, и состояние suspended
    if (!this.unlocked || audioContext.state === 'suspended') {
      audioLog('[SoundManager] 🔓 Попытка разблокировки AudioContext перед воспроизведением звука');
      this.unlockAudio();
    }

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
      audioWarn('[SoundManager] ⚠️ Audio playback failed:', e);
      // Если ошибка из-за блокировки, пробуем разблокировать
      if (!this.unlocked) {
        this.unlockAudio();
      }
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

  // Card flip sound
  flip() {
    this.playClick(700, 0.08);
  }

  // Success/Error aliases for consistency
  success() {
    this.correctAnswer();
  }

  error() {
    this.wrongAnswer();
  }

  // Enable/disable sounds
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    audioLog(`[SoundManager] ${enabled ? '✅' : '❌'} Звуки ${enabled ? 'включены' : 'выключены'}`);
  }

  isEnabled() {
    return this.enabled;
  }

  // Проверка состояния разблокировки
  isUnlocked() {
    return this.unlocked;
  }

  // Принудительная разблокировка (для кнопки "Включить звуки")
  forceUnlock() {
    return this.unlockAudio();
  }
}

export const sounds = new SoundManager();
