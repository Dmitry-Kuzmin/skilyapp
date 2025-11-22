
export const playEngineSound = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const t = ctx.currentTime;

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
};

export const playBiometricSound = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  
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
};

// --- UI INTERACTION SOUNDS ---

export const playClickSound = () => {
  // Crisp, high-tech mechanical tick
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;

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
};

export const playHoverSound = () => {
  // Extremely subtle high-frequency breath/air
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine'; // Sine is cleaner than noise for UI
  osc.frequency.setValueAtTime(2000, t);
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.02, t + 0.01); // Very quiet
  gain.gain.linearRampToValueAtTime(0, t + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
};

export const playTabSwitchSound = () => {
  // "Whoosh" / Slide effect
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
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
};

export const playAlertSound = () => {
  // Soft "Glass Ping" - Double tone
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.value = 0.2;
  gain.connect(ctx.destination);

  const playTone = (time: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, time); // A4
    osc.connect(gain);
    
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
};

export const playErrorSound = () => {
  // Soft denial / low thud
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  
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
};

export const playSuccessSound = () => {
  // Ascending shimmer (Major 7th)
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.15;
  masterGain.connect(ctx.destination);

  // C Major 7 chord: C, E, G, B
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
};

export const playLevelUpSound = () => {
  // Energetic Arpeggio
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.15;
  masterGain.connect(ctx.destination);

  const freqs = [440, 554.37, 659.25, 880, 1108.73, 1318.51]; // A Major

  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square'; // 8-bitish feel but filtered
    
    // Lowpass filter to make it less harsh
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
};

export const playUnlockSound = () => {
  // Mechanical "Click-Clack"
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;

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
};

export const playNotificationSound = () => {
  // Crystal Bell
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  
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
};

export const playStartupSound = () => {
  // Futuristic Power On Swell
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const t = ctx.currentTime;
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

  // Add some "sparkle" noise or high pitch overlay
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
};
