import type { MonsterSpriteId } from '../types/game';

/**
 * MapleStory-inspired 8-bit / retro Web Audio synthesizer.
 * Zero external audio files required.
 */
class PixelSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.08,
    delay = 0,
    slideTo?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private noiseBurst(duration: number, volume = 0.06, delay = 0, highpass = 800) {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    const now = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
  }

  click() {
    this.tone(680, 0.04, 'triangle', 0.05);
  }

  /** Crisp MapleStory sword-slash + thud */
  hit() {
    this.noiseBurst(0.055, 0.07, 0, 1200);
    this.tone(240, 0.065, 'triangle', 0.09, 0, 95);
    this.tone(420, 0.04, 'square', 0.04, 0.01, 180);
  }

  /** Punchy MapleStory Critical hit */
  crit() {
    this.noiseBurst(0.07, 0.09, 0, 1600);
    this.tone(520, 0.06, 'sawtooth', 0.07, 0, 220);
    this.tone(780, 0.08, 'triangle', 0.08, 0.02, 320);
  }

  /** Hero 5th Job Combo Deathfault: screen-splitting slash + heavy impact */
  deathfault() {
    // Sharp metallic slice
    this.noiseBurst(0.14, 0.12, 0, 2200);
    this.tone(1100, 0.14, 'sawtooth', 0.09, 0, 260);
    // Heavy screen-shatter boom
    this.tone(140, 0.32, 'sawtooth', 0.13, 0.08, 38);
    this.tone(95, 0.36, 'triangle', 0.14, 0.08, 32);
    // Multi-hit rapid ticks
    this.tone(620, 0.04, 'square', 0.06, 0.12, 340);
    this.tone(740, 0.04, 'square', 0.06, 0.17, 380);
    this.tone(880, 0.05, 'square', 0.06, 0.22, 420);
  }

  /** MapleStory-style monster death sounds (especially Orange Mushroom!) */
  mobDie(spriteId: MonsterSpriteId) {
    switch (spriteId) {
      case 'mushroom':
        // Classic Maple Orange Mushroom squishy descending "삐요옹~뽀옥!"
        this.tone(560, 0.11, 'triangle', 0.1, 0, 240);
        this.tone(320, 0.09, 'sine', 0.09, 0.07, 130);
        break;
      case 'slime':
        // Squelchy bubble pop
        this.tone(300, 0.06, 'sine', 0.09, 0, 680);
        this.tone(420, 0.09, 'triangle', 0.08, 0.05, 180);
        break;
      case 'pig':
        // Cute pig squeal down
        this.tone(720, 0.08, 'sawtooth', 0.06, 0, 480);
        this.tone(460, 0.09, 'triangle', 0.07, 0.06, 210);
        break;
      case 'golem':
        // Rocky crumble
        this.noiseBurst(0.16, 0.09, 0, 300);
        this.tone(130, 0.18, 'square', 0.08, 0, 45);
        break;
      case 'chronos':
        // Clock chime unwind
        this.tone(880, 0.08, 'sine', 0.07, 0, 440);
        this.tone(587, 0.12, 'triangle', 0.07, 0.06, 220);
        break;
      case 'zakum':
        // Boss defeat rumble
        this.noiseBurst(0.24, 0.12, 0, 200);
        this.tone(180, 0.3, 'sawtooth', 0.1, 0, 40);
        break;
    }
  }

  coin() {
    this.tone(988, 0.055, 'square', 0.06, 0);
    this.tone(1319, 0.12, 'square', 0.06, 0.055);
  }

  buy() {
    this.tone(523, 0.06, 'square', 0.07, 0);
    this.tone(659, 0.06, 'square', 0.07, 0.06);
    this.tone(784, 0.12, 'square', 0.08, 0.12);
  }

  sell() {
    this.tone(784, 0.06, 'triangle', 0.09, 0);
    this.tone(1046, 0.12, 'triangle', 0.09, 0.06);
  }

  questClear() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      this.tone(n, 0.11, 'square', 0.08, idx * 0.08);
    });
  }

  fever() {
    const notes = [440, 554, 659, 880, 1108];
    notes.forEach((n, idx) => {
      this.tone(n, 0.09, 'sawtooth', 0.06, idx * 0.05);
    });
  }

  error() {
    this.tone(160, 0.12, 'sawtooth', 0.07, 0, 110);
  }
}

export const sfx = new PixelSoundEngine();
