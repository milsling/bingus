// Notification sound effects using Web Audio API

type SoundType = 'none' | 'chime' | 'pop' | 'bell' | 'whoosh' | 'ding' | 'bubble' | 'soft' | 'alert' | '808' | 'scratch' | 'hihat' | 'boombap' | 'notify';

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

// --- Hip-hop inspired sounds ---

// Deep 808-style sub bass hit with pitch drop
const play808 = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  osc.connect(gain);
  gain.connect(compressor);
  compressor.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.55);
};

// Vinyl scratch — filtered noise sweep up then down
const playScratch = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const dur = 0.22;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(4000, ctx.currentTime + 0.1);
  filter.frequency.linearRampToValueAtTime(600, ctx.currentTime + dur);
  filter.Q.value = 4;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.015);
  gain.gain.setValueAtTime(0.18, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime);
};

// Crisp hi-hat tick — short filtered white noise
const playHihat = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const dur = 0.06;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime);
};

// Boom bap — punchy kick (sine thump) + crisp snare snap layered
const playBoomBap = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Kick — sub thump
  const kick = ctx.createOscillator();
  const kickGain = ctx.createGain();
  kick.connect(kickGain);
  kickGain.connect(ctx.destination);
  kick.type = 'sine';
  kick.frequency.setValueAtTime(150, ctx.currentTime);
  kick.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
  kickGain.gain.setValueAtTime(0, ctx.currentTime);
  kickGain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.004);
  kickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  kick.start(ctx.currentTime);
  kick.stop(ctx.currentTime + 0.25);
  // Snare — short noise burst delayed slightly
  const snareDur = 0.08;
  const snareStart = ctx.currentTime + 0.18;
  const buf = ctx.createBuffer(1, ctx.sampleRate * snareDur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2500;
  filter.Q.value = 0.8;
  const snareGain = ctx.createGain();
  snareGain.gain.setValueAtTime(0.22, snareStart);
  snareGain.gain.exponentialRampToValueAtTime(0.001, snareStart + snareDur);
  src.connect(filter);
  filter.connect(snareGain);
  snareGain.connect(ctx.destination);
  src.start(snareStart);
};

// Notify — two-note melodic ping (perfect fifth), smooth and modern
const playNotify = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  const freqs = [523.25, 783.99]; // C5 → G5
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.13;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.start(t);
    osc.stop(t + 0.45);
  });
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
    case '808': play808(); break;
    case 'scratch': playScratch(); break;
    case 'hihat': playHihat(); break;
    case 'boombap': playBoomBap(); break;
    case 'notify': playNotify(); break;
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
  notify: 'Notify',
  '808': '808 Bass',
  scratch: 'Scratch',
  hihat: 'Hi-Hat',
  boombap: 'Boom Bap',
};

export const messageSoundLabels: Record<string, string> = {
  none: 'None',
  ding: 'Ding',
  bubble: 'Bubble',
  soft: 'Soft',
  alert: 'Alert',
  hihat: 'Hi-Hat',
  scratch: 'Scratch',
  boombap: 'Boom Bap',
};
