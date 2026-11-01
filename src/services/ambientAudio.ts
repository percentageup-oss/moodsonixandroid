// Web Audio API Ambient Sound Synthesizer
// Synthesizes Rain, Campfire, and Nature without external audio files.

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Rain nodes
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private isRainPlaying = false;

  // Campfire nodes
  private campfireGain: GainNode | null = null;
  private campfireRoarSource: AudioBufferSourceNode | null = null;
  private campfireTimer: any = null;
  private isCampfirePlaying = false;

  // Nature nodes
  private natureGain: GainNode | null = null;
  private natureWindSource: AudioBufferSourceNode | null = null;
  private natureLfo: OscillatorNode | null = null;
  private natureChirpTimer: any = null;
  private isNaturePlaying = false;

  // Resume an already-created AudioContext during a user gesture
  public async resumeContext(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {}
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Generate pink/brown noise buffer for natural sounding atmospheric beds
  private createNoiseBuffer(durationSeconds = 5, color: 'pink' | 'brown' | 'white' = 'pink'): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (color === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else if (color === 'brown') {
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      } else {
        output[i] = white * 0.2;
      }
    }
    return buffer;
  }

  // RAIN GENERATOR
  public setRain(enabled: boolean, volume = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (enabled && !this.isRainPlaying) {
      this.isRainPlaying = true;
      const noiseBuffer = this.createNoiseBuffer(6, 'pink');
      this.rainSource = this.ctx.createBufferSource();
      this.rainSource.buffer = noiseBuffer;
      this.rainSource.loop = true;

      // Filter to simulate soft rainfall against surfaces
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1100, this.ctx.currentTime);

      const highpass = this.ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(volume * 0.45, this.ctx.currentTime);

      this.rainSource.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);

      this.rainSource.start(0);
    } else if (!enabled && this.isRainPlaying) {
      this.isRainPlaying = false;
      if (this.rainSource) {
        try { this.rainSource.stop(); this.rainSource.disconnect(); } catch {}
        this.rainSource = null;
      }
      this.rainGain = null;
    } else if (enabled && this.rainGain) {
      this.rainGain.gain.setValueAtTime(volume * 0.45, this.ctx.currentTime);
    }
  }

  // CAMPFIRE GENERATOR (Low rumble + sporadic soft crackles and pops)
  public setCampfire(enabled: boolean, volume = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (enabled && !this.isCampfirePlaying) {
      this.isCampfirePlaying = true;
      this.campfireGain = this.ctx.createGain();
      this.campfireGain.gain.setValueAtTime(volume * 0.5, this.ctx.currentTime);
      this.campfireGain.connect(this.masterGain);

      // Low ember roar base
      const roarBuffer = this.createNoiseBuffer(5, 'brown');
      const roarSource = this.ctx.createBufferSource();
      roarSource.buffer = roarBuffer;
      roarSource.loop = true;
      this.campfireRoarSource = roarSource;

      const roarFilter = this.ctx.createBiquadFilter();
      roarFilter.type = 'lowpass';
      roarFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      const roarGain = this.ctx.createGain();
      roarGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      roarSource.connect(roarFilter);
      roarFilter.connect(roarGain);
      roarGain.connect(this.campfireGain);
      roarSource.start(0);

      // Procedural soft crackle bursts
      const triggerCrackle = () => {
        if (!this.isCampfirePlaying || !this.ctx || !this.campfireGain) return;

        const burstTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const popFilter = this.ctx.createBiquadFilter();
        const popGain = this.ctx.createGain();

        // High frequency sharp snap
        popFilter.type = 'bandpass';
        popFilter.frequency.setValueAtTime(1200 + Math.random() * 2400, burstTime);
        popFilter.Q.setValueAtTime(4 + Math.random() * 6, burstTime);

        popGain.gain.setValueAtTime(0.0, burstTime);
        popGain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.12, burstTime + 0.002);
        popGain.gain.exponentialRampToValueAtTime(0.0001, burstTime + 0.02 + Math.random() * 0.04);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100 + Math.random() * 300, burstTime);

        osc.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(this.campfireGain);

        osc.start(burstTime);
        osc.stop(burstTime + 0.08);

        // Schedule next random crackle
        const nextDelay = 80 + Math.random() * 350;
        this.campfireTimer = setTimeout(triggerCrackle, nextDelay);
      };

      triggerCrackle();
    } else if (!enabled && this.isCampfirePlaying) {
      this.isCampfirePlaying = false;
      if (this.campfireTimer) {
        clearTimeout(this.campfireTimer);
        this.campfireTimer = null;
      }
      if (this.campfireRoarSource) {
        try { this.campfireRoarSource.stop(); this.campfireRoarSource.disconnect(); } catch {}
        this.campfireRoarSource = null;
      }
      if (this.campfireGain) {
        try { this.campfireGain.disconnect(); } catch {}
        this.campfireGain = null;
      }
    } else if (enabled && this.campfireGain) {
      this.campfireGain.gain.setValueAtTime(volume * 0.5, this.ctx.currentTime);
    }
  }

  // NATURE GENERATOR (Soft swaying breeze + gentle bird chirp harmonics)
  public setNature(enabled: boolean, volume = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    if (enabled && !this.isNaturePlaying) {
      this.isNaturePlaying = true;
      this.natureGain = this.ctx.createGain();
      this.natureGain.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime);
      this.natureGain.connect(this.masterGain);

      // Wind sway
      const windBuffer = this.createNoiseBuffer(8, 'pink');
      this.natureWindSource = this.ctx.createBufferSource();
      this.natureWindSource.buffer = windBuffer;
      this.natureWindSource.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Modulate wind frequency
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start(0);
      this.natureLfo = lfo;

      this.natureWindSource.connect(windFilter);
      windFilter.connect(this.natureGain);
      this.natureWindSource.start(0);

      // Subtle gentle distant birdsong tone
      const playGentleChirp = () => {
        if (!this.isNaturePlaying || !this.ctx || !this.natureGain) return;

        const chirpTime = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const cGain = this.ctx.createGain();

        const baseFreq = 2200 + Math.random() * 800;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, chirpTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, chirpTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, chirpTime + 0.12);

        cGain.gain.setValueAtTime(0.0001, chirpTime);
        cGain.gain.linearRampToValueAtTime(0.03, chirpTime + 0.02);
        cGain.gain.exponentialRampToValueAtTime(0.0001, chirpTime + 0.15);

        osc.connect(cGain);
        cGain.connect(this.natureGain);

        osc.start(chirpTime);
        osc.stop(chirpTime + 0.16);

        const nextDelay = 3000 + Math.random() * 6000;
        this.natureChirpTimer = setTimeout(playGentleChirp, nextDelay);
      };

      playGentleChirp();
    } else if (!enabled && this.isNaturePlaying) {
      this.isNaturePlaying = false;
      if (this.natureChirpTimer) {
        clearTimeout(this.natureChirpTimer);
        this.natureChirpTimer = null;
      }
      if (this.natureLfo) {
        try { this.natureLfo.stop(); this.natureLfo.disconnect(); } catch {}
        this.natureLfo = null;
      }
      if (this.natureWindSource) {
        try { this.natureWindSource.stop(); this.natureWindSource.disconnect(); } catch {}
        this.natureWindSource = null;
      }
      if (this.natureGain) {
        try { this.natureGain.disconnect(); } catch {}
        this.natureGain = null;
      }
    } else if (enabled && this.natureGain) {
      this.natureGain.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime);
    }
  }

  // Play a soft bell/chime for Pomodoro timer completion
  public playCompletionTone() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major chord shimmer

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.08);

      gain.gain.setValueAtTime(0, t + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 1.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 2.0);
    });
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }
}

export const ambientAudio = new AmbientAudioEngine();
