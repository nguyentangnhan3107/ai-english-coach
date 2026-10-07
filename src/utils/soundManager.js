let audioContext = null;

function getContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function tone(frequency, duration, volume = 0.045, type = 'sine', delay = 0) {
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const playClick = () => tone(520, 0.06, 0.035);
export const playSuccess = () => { tone(660, 0.11, 0.045); tone(880, 0.16, 0.045, 'sine', 0.09); };
export const playComplete = () => { tone(523, 0.12, 0.045); tone(659, 0.12, 0.045, 'sine', 0.1); tone(784, 0.2, 0.05, 'sine', 0.2); };
export const playError = () => tone(220, 0.12, 0.04, 'triangle');
