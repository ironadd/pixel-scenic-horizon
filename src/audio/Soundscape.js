// Pure Web Audio API healing coastal soundscape (Ocean surf + gentle pentatonic piano/celesta melody)

export class ScenicSoundscape {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.masterGain = null;
    this.timer = null;
    this.step = 0;
  }

  toggle() {
    if (!this.ctx) {
      this._init();
    }
    if (this.playing) {
      this.stop();
    } else {
      this.start();
    }
    return this.playing;
  }

  _init() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0;
    this.masterGain.connect(this.ctx.destination);

    // Filtered pink/brown noise for gentle rhythmic ocean waves washing ashore!
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      out[i] = (b0 + b1 + b2) * 0.35;
    }

    const surfSource = this.ctx.createBufferSource();
    surfSource.buffer = noiseBuffer;
    surfSource.loop = true;

    const surfFilter = this.ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 420;

    const surfGain = this.ctx.createGain();
    surfGain.gain.value = 0.14;

    // LFO modulating wave swell every ~7 seconds
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.14;
    const lfoFilterDepth = this.ctx.createGain();
    lfoFilterDepth.gain.value = 260;
    const lfoVolDepth = this.ctx.createGain();
    lfoVolDepth.gain.value = 0.07;

    lfo.connect(lfoFilterDepth);
    lfoFilterDepth.connect(surfFilter.frequency);
    lfo.connect(lfoVolDepth);
    lfoVolDepth.connect(surfGain.gain);

    surfSource.connect(surfFilter);
    surfFilter.connect(surfGain);
    surfGain.connect(this.masterGain);

    surfSource.start();
    lfo.start();
  }

  _playNote(freq, duration = 2.6, volume = 0.075, delay = 0) {
    if (!this.ctx || !this.playing) return;
    const t = this.ctx.currentTime + delay;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 2.0, t);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(volume, t + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.12;

    osc1.connect(env);
    osc2.connect(overtoneGain);
    overtoneGain.connect(env);
    env.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration + 0.05);
    osc2.stop(t + duration + 0.05);
  }

  start() {
    if (!this.ctx) this._init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.85, this.ctx.currentTime + 1.2);

    // Nostalgic F-major / D-minor pentatonic pastoral progression (Summer coastal breeze feel)
    const chords = [
      [174.61, 261.63, 329.63, 392.00], // Fmaj7
      [196.00, 293.66, 392.00, 493.88], // G6
      [220.00, 329.63, 392.00, 523.25], // Am7
      [146.83, 220.00, 293.66, 440.00]  // Dm9
    ];
    const melodyPool = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

    const tick = () => {
      if (!this.playing) return;
      const bar = Math.floor(this.step / 4) % chords.length;
      const beat = this.step % 4;
      const chord = chords[bar];

      if (beat === 0) {
        chord.forEach((f, idx) => this._playNote(f, 3.6, 0.048, idx * 0.09));
      }
      if (Math.random() > 0.25) {
        const m = melodyPool[(this.step * 2 + bar) % melodyPool.length];
        this._playNote(m, 2.4, 0.052, 0.12);
      }
      this.step++;
    };

    tick();
    this.timer = setInterval(tick, 1350);
  }

  stop() {
    this.playing = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
    }
  }
}
