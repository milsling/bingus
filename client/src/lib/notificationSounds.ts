// Notification sound effects using Web Audio API

type SoundType = 'none' | 'chime' | 'pop' | 'bell' | 'whoosh' | 'ding' | 'bubble' | 'soft' | 'alert';

const getAudioContext = (): AudioContext | null => {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
};

// Notification sounds
const playChime = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  
  osc.type = 'sine';
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
};

const playPop = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  
  osc.type = 'sine';
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
};

const playBell = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Two oscillators for bell-like harmonics
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  
  osc1.frequency.setValueAtTime(800, ctx.currentTime);
  osc2.frequency.setValueAtTime(1200, ctx.currentTime);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.6);
  osc2.stop(ctx.currentTime + 0.6);
};

const playWhoosh = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const bufferSize = ctx.sampleRate * 0.2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.3;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  noise.start(ctx.currentTime);
};

// Message sounds
const playDing = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(1000, ctx.currentTime);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  
  osc.type = 'sine';
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
};

const playBubble = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  
  osc.type = 'sine';
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
};

const playSoft = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(550, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  
  osc.type = 'sine';
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
};

const playAlert = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  // Two quick beeps
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
  gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  
  osc.type = 'square';
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
};

export const playNotificationSound = (sound: SoundType) => {
  switch (sound) {
    case 'chime': playChime(); break;
    case 'pop': playPop(); break;
    case 'bell': playBell(); break;
    case 'whoosh': playWhoosh(); break;
    case 'ding': playDing(); break;
    case 'bubble': playBubble(); break;
    case 'soft': playSoft(); break;
    case 'alert': playAlert(); break;
    case 'none':
    default:
      break;
  }
};

export const notificationSoundLabels: Record<string, string> = {
  none: 'None',
  chime: 'Chime',
  pop: 'Pop',
  bell: 'Bell',
  whoosh: 'Whoosh',
};

export const messageSoundLabels: Record<string, string> = {
  none: 'None',
  ding: 'Ding',
  bubble: 'Bubble',
  soft: 'Soft',
  alert: 'Alert',
};
