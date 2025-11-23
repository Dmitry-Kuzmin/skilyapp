// Audio Service for Dashboard - optimized for Telegram WebApp
// Uses single AudioContext instance with proper unlocking for Telegram

const isClient = typeof window !== "undefined";
const isTelegramAudioEnv = isClient && !!(window as any).Telegram?.WebApp;
const enableAudioDebug =
  import.meta.env.VITE_DEBUG_AUDIO === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_DEBUG_ALL === "true");
const shouldLogAudio = isTelegramAudioEnv || enableAudioDebug;

const audioLog = (...args: any[]) => {
  if (shouldLogAudio) {
    console.debug('[AudioService]', ...args);
  }
};

const audioWarn = (...args: any[]) => {
  if (shouldLogAudio) {
    console.warn('[AudioService]', ...args);
  }
};

// Single AudioContext instance
let audioContext: AudioContext | null = null;
let isUnlocked = false;

// Initialize AudioContext
const getAudioContext = (): AudioContext | null => {
  if (!isClient) return null;
  
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        audioWarn('AudioContext не поддерживается');
        return null;
      }
      
      audioContext = new AudioContextClass();
      audioLog('✅ AudioContext создан', {
        state: audioContext.state,
        sampleRate: audioContext.sampleRate,
        isTelegram: isTelegramAudioEnv,
      });
    } catch (e) {
      audioWarn('Ошибка создания AudioContext:', e);
      return null;
    }
  }
  
  return audioContext;
};

// Unlock AudioContext for Telegram WebApp
const unlockAudioContext = async (): Promise<boolean> => {
  if (isUnlocked) {
    return true;
  }
  
  const ctx = getAudioContext();
  if (!ctx) {
    audioWarn('AudioContext не создан');
    return false;
  }
  
  try {
    // Check if context is suspended
    if (ctx.state === 'suspended') {
      audioLog('🔄 AudioContext suspended, resuming...');
      await ctx.resume();
      audioLog('✅ AudioContext resumed, state:', ctx.state);
    }
    
    // Unlock by playing a silent buffer (critical for Telegram WebApp)
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    isUnlocked = true;
    audioLog('🔓 AudioContext разблокирован, state:', ctx.state);
    return true;
  } catch (e) {
    audioWarn('Ошибка разблокировки AudioContext:', e);
    return false;
  }
};

// Setup auto-unlock on first user interaction
const setupAutoUnlock = () => {
  if (!isClient) return;
  
  const unlockEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
  const unlockHandler = async (event?: Event) => {
    if (isUnlocked) return;
    
    audioLog('🔓 Попытка разблокировки через событие:', event?.type);
    await unlockAudioContext();
  };
  
  unlockEvents.forEach(eventType => {
    document.addEventListener(eventType, unlockHandler, { once: true, passive: true, capture: true });
    window.addEventListener(eventType, unlockHandler, { once: true, passive: true, capture: true });
  });
  
  audioLog('🔓 Автоматическая разблокировка настроена');
};

// Initialize on module load
if (isClient) {
  if (isTelegramAudioEnv) {
    getAudioContext();
  }
  setupAutoUnlock();
}

// Helper function to ensure context is ready before playing
const ensureAudioReady = async (): Promise<AudioContext | null> => {
  const ctx = getAudioContext();
  if (!ctx) return null;
  
  // Try to unlock if needed
  if (!isUnlocked || ctx.state === 'suspended') {
    await unlockAudioContext();
  }
  
  // Double check state
  if (ctx.state === 'suspended') {
    audioWarn('AudioContext все еще suspended');
    return null;
  }
  
  return ctx;
};

// Play sound with error handling
const playSound = async (soundFunction: (ctx: AudioContext, t: number) => void) => {
  const ctx = await ensureAudioReady();
  if (!ctx) {
    audioWarn('AudioContext не готов к воспроизведению');
    return;
  }
  
  try {
    const t = ctx.currentTime;
    soundFunction(ctx, t);
  } catch (e) {
    audioWarn('Ошибка воспроизведения звука:', e);
  }
};

// --- SOUND FUNCTIONS ---

export const playEngineSound = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.4, t);
    masterGain.connect(ctx.destination);

    // 1. THE TURBINE (Futuristic Electric Whine)
    const oscTurbine = ctx.createOscillator();
    const gainTurbine = ctx.createGain();
    
    oscTurbine.type = 'sine';
    oscTurbine.frequency.setValueAtTime(150, t);
    oscTurbine.frequency.exponentialRampToValueAtTime(600, t + 1.5);
    
    gainTurbine.gain.setValueAtTime(0, t);
    gainTurbine.gain.linearRampToValueAtTime(0.4, t + 0.5);
    gainTurbine.gain.exponentialRampToValueAtTime(0.01, t + 1.8);

    oscTurbine.connect(gainTurbine);
    gainTurbine.connect(masterGain);
    oscTurbine.start(t);
    oscTurbine.stop(t + 2.0);

    // 2. LOW HUM (The Body)
    const oscHum = ctx.createOscillator();
    const gainHum = ctx.createGain();
    oscHum.type = 'triangle';
    oscHum.frequency.setValueAtTime(60, t);
    oscHum.frequency.linearRampToValueAtTime(120, t + 1.5);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gainHum.gain.setValueAtTime(0, t);
    gainHum.gain.linearRampToValueAtTime(0.3, t + 0.2);
    gainHum.gain.linearRampToValueAtTime(0, t + 1.8);

    oscHum.connect(filter);
    filter.connect(gainHum);
    gainHum.connect(masterGain);
    oscHum.start(t);
    oscHum.stop(t + 2.0);
  });
};

export const playBiometricSound = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99]; 
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = t + (index * 0.08);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  });
};

export const playClickSound = () => {
  playSound((ctx, t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  });
};

export const playHoverSound = () => {
  playSound((ctx, t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.02, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });
};

export const playTabSwitchSound = () => {
  playSound((ctx, t) => {
    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    
    const localGain = ctx.createGain();
    localGain.gain.setValueAtTime(0, t);
    localGain.gain.linearRampToValueAtTime(0.5, t + 0.05);
    localGain.gain.linearRampToValueAtTime(0, t + 0.15);

    osc.connect(localGain);
    localGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
};

export const playAlertSound = () => {
  playSound((ctx, t) => {
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    gain.connect(ctx.destination);

    const playTone = (time: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, time);
      
      const localGain = ctx.createGain();
      localGain.gain.setValueAtTime(0, time);
      localGain.gain.linearRampToValueAtTime(0.5, time + 0.05);
      localGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      
      osc.connect(localGain);
      localGain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.3);
    };

    playTone(t);
    playTone(t + 0.15);
  });
};

export const playErrorSound = () => {
  playSound((ctx, t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.2);
    
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
};

export const playSuccessSound = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(ctx.destination);

    const freqs = [523.25, 659.25, 783.99, 987.77];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; 
      osc.frequency.setValueAtTime(f, t + i * 0.05);
      
      gain.gain.setValueAtTime(0, t + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.05 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.6);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.6);
    });
  });
};

export const playLevelUpSound = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(ctx.destination);

    const freqs = [440, 554.37, 659.25, 880, 1108.73, 1318.51];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      osc.frequency.setValueAtTime(f, t + i * 0.08);
      
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.1, t + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });
  });
};

// Вариант 1: Триумфальный аккорд (текущий)
export const playCelebrationSound = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);

    // Триумфальный аккорд
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C (мажорный аккорд)
    
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      osc.frequency.setValueAtTime(f, t);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 1.5);
    });

    // Дополнительные высокие ноты для "вау" эффекта
    const highFreqs = [1318.51, 1567.98, 1975.53]; // E, G, B
    highFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const startTime = t + 0.3 + i * 0.1;
      osc.frequency.setValueAtTime(f, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  });
};

// Вариант 2: Фанфары (восходящая мелодия)
export const playCelebrationSoundFanfare = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);

    // Восходящая мелодия фанфар
    const fanfareNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98]; // C, E, G, B, D, E, G
    
    fanfareNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;
      
      const startTime = t + i * 0.08;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  });
};

// Вариант 3: Звон колоколов (торжественный)
export const playCelebrationSoundBells = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);

    // Колокольный звон
    const bellFreqs = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C, E, G, C, E
    
    bellFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 2;
      filter.Q.value = 5;
      
      const startTime = t + i * 0.1;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  });
};

// Вариант 4: Электронный синтезатор (современный)
export const playCelebrationSoundSynth = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);

    // Электронная мелодия
    const synthNotes = [
      { freq: 440, time: 0 },    // A
      { freq: 554.37, time: 0.1 }, // C#
      { freq: 659.25, time: 0.2 }, // E
      { freq: 880, time: 0.3 },     // A
      { freq: 1108.73, time: 0.4 }, // C#
      { freq: 1318.51, time: 0.5 }, // E
    ];
    
    synthNotes.forEach((note, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, t + note.time);
      filter.frequency.exponentialRampToValueAtTime(8000, t + note.time + 0.2);
      filter.frequency.exponentialRampToValueAtTime(2000, t + note.time + 0.4);
      
      const startTime = t + note.time;
      osc.frequency.setValueAtTime(note.freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.05, startTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  });
};

// Вариант 5: Оркестровый финал (эпичный)
export const playCelebrationSoundOrchestral = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.18;
    masterGain.connect(ctx.destination);

    // Низкие ноты (басы)
    const bassFreqs = [261.63, 329.63, 392.00]; // C, E, G
    bassFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      
      const startTime = t + i * 0.15;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.2);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 2);
    });

    // Средние ноты (мелодия)
    const melodyFreqs = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C, E, G, B, D
    melodyFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const startTime = t + 0.2 + i * 0.1;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 1.2);
    });

    // Высокие ноты (финал)
    const highFreqs = [1318.51, 1567.98, 1975.53, 2637.02]; // E, G, B, E
    highFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const startTime = t + 0.6 + i * 0.08;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  });
};

// Вариант 6: Поп-конфетти (веселый, короткий)
export const playCelebrationSoundPop = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);

    // Быстрые веселые ноты
    const popNotes = [
      { freq: 523.25, time: 0 },   // C
      { freq: 659.25, time: 0.05 }, // E
      { freq: 783.99, time: 0.1 },  // G
      { freq: 1046.5, time: 0.15 }, // C
      { freq: 1318.51, time: 0.2 }, // E
      { freq: 1567.98, time: 0.25 }, // G
    ];
    
    popNotes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4000;
      
      const startTime = t + note.time;
      osc.frequency.setValueAtTime(note.freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  });
};

export const playUnlockSound = () => {
  playSound((ctx, t) => {
    const createClick = (time: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.05);
    };

    createClick(t, 1200);
    createClick(t + 0.1, 1200);
  });
};

export const playNotificationSound = () => {
  playSound((ctx, t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.0);
  });
};

export const playStartupSound = () => {
  playSound((ctx, t) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 1.0);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.5);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();
    oscHigh.type = 'square';
    oscHigh.frequency.setValueAtTime(2000, t);
    gainHigh.gain.setValueAtTime(0, t);
    gainHigh.gain.linearRampToValueAtTime(0.05, t + 0.5);
    gainHigh.gain.linearRampToValueAtTime(0, t + 0.8);

    osc.connect(gain);
    oscHigh.connect(gainHigh);
    gain.connect(masterGain);
    gainHigh.connect(masterGain);
    
    osc.start(t);
    osc.stop(t + 1.0);
    oscHigh.start(t);
    oscHigh.stop(t + 1.0);
  });
};

// Export unlock function for manual unlocking if needed
export const unlockAudio = () => unlockAudioContext();
