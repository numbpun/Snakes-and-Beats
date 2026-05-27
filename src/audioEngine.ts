/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from './types';

export const TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Cyber Chiptune',
    artist: 'AI Synth, AI Gen',
    genre: 'Chiptune / Retro Arcade',
    bpm: 130,
    description: 'An upbeat, 8-bit chip tune featuring fast square wave arpeggios, bouncing triangle basslines, and retro noise hats.',
    color: 'emerald',
    accentClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/20'
  },
  {
    id: 'track-2',
    title: 'Neon Highway',
    artist: 'Nightcoder, AI Gen',
    genre: 'Synthwave / Outrun',
    bpm: 110,
    description: 'A pumping retro-future track with heavy dual sawtooth basslines, lush sweeping key pads, and echoing neon lead riffs.',
    color: 'magenta',
    accentClass: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30 shadow-fuchsia-500/20'
  },
  {
    id: 'track-3',
    title: 'Aether Ambient',
    artist: 'Zenith Space, AI Gen',
    genre: 'Ambient / Chillout',
    bpm: 80,
    description: 'A deeply relaxing sci-fi ambient landscape with slow-swell sine pads, resonant analog plucks, and a spacey filter tail.',
    color: 'cyan',
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-cyan-500/20'
  }
];

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Track state
  private trackIndex: number = 0;
  private isPlaying: boolean = false;
  private volume: number = 0.5;

  // Scheduler state
  private schedulerInterval: number | null = null;
  private nextNoteTime: number = 0;
  private currentStep: number = 0; // 0 to 15 (16th notes)
  private currentBeat: number = 0; // Cumulative beats
  private scheduleAheadTime = 0.120; // How far ahead to schedule audio (seconds)
  private lookahead = 25.0; // How frequently to call scheduler (ms)

  // Callbacks
  private onStepCallback: ((step: number, beat: number) => void) | null = null;

  // Track progress timing
  private startTime: number = 0;
  private elapsedSinceLastPlay: number = 0;
  private estimatedDuration = 180; // 3 minute standard dummy duration

  constructor() {
    // Initialized lazily on first user play gesture to prevent browser security blocks
  }

  private initCtx() {
    if (this.ctx) return;
    
    // Create AudioContext
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    
    // Create Nodes
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128; // Short FFT for clean music visualizer bars
    
    // Wire up master out
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public start(trackIndex: number, onStep: (step: number, beat: number) => void) {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      if (this.trackIndex === trackIndex) {
        return; // Already playing this track
      } else {
        this.stopScheduler();
      }
    }

    this.trackIndex = trackIndex;
    this.isPlaying = true;
    this.onStepCallback = onStep;
    
    // Reset sequence counter or keep it flowing
    this.currentStep = 0;
    this.currentBeat = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.startTime = this.ctx.currentTime - this.elapsedSinceLastPlay;

    this.startScheduler();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.stopScheduler();
    
    if (this.ctx) {
      this.elapsedSinceLastPlay += (this.ctx.currentTime - (this.startTime + this.elapsedSinceLastPlay));
    }
  }

  public stop() {
    this.isPlaying = false;
    this.stopScheduler();
    this.elapsedSinceLastPlay = 0;
    this.currentStep = 0;
    this.currentBeat = 0;
  }

  public setVolume(volume: number) {
    this.volume = volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }
  }

  public getAnalyserNode(): AnalyserNode | null {
    this.initCtx();
    return this.analyser;
  }

  public getProgress(): { current: number; total: number; percent: number } {
    if (!this.isPlaying) {
      return {
        current: Math.floor(this.elapsedSinceLastPlay) % this.estimatedDuration,
        total: this.estimatedDuration,
        percent: ((this.elapsedSinceLastPlay) % this.estimatedDuration) / this.estimatedDuration
      };
    }
    if (!this.ctx) return { current: 0, total: this.estimatedDuration, percent: 0 };
    
    const playSecs = (this.ctx.currentTime - this.startTime) % this.estimatedDuration;
    return {
      current: Math.floor(playSecs),
      total: this.estimatedDuration,
      percent: playSecs / this.estimatedDuration
    };
  }

  private startScheduler() {
    if (this.schedulerInterval) return;
    
    this.schedulerInterval = window.setInterval(() => {
      this.schedulerTick();
    }, this.lookahead);
  }

  private stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private schedulerTick() {
    if (!this.ctx) return;

    // While there are notes to play before the next interval
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }
  }

  private advanceNote() {
    const track = TRACKS[this.trackIndex];
    const secondsPerBeat = 60.0 / track.bpm;
    const secondsPerStep = secondsPerBeat / 4.0; // 16th note steps

    this.nextNoteTime += secondsPerStep;
    
    // Trigger React UI callback asynchronously to avoid blocking audio thread
    const step = this.currentStep;
    const beat = this.currentBeat;
    if (this.onStepCallback) {
      setTimeout(() => {
        if (this.isPlaying && this.onStepCallback) {
          this.onStepCallback(step, beat);
        }
      }, 0);
    }

    this.currentStep = (this.currentStep + 1) % 16;
    if (this.currentStep % 4 === 0) {
      this.currentBeat++;
    }
  }

  // --- SYNTH PROCEDURAL SCHEDULERS ---

  private scheduleNote(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    switch (this.trackIndex) {
      case 0:
        this.playChiptunePattern(step, time);
        break;
      case 1:
        this.playSynthwavePattern(step, time);
        break;
      case 2:
        this.playAmbientPattern(step, time);
        break;
    }
  }

  // --- 1. CHIPTUNE RETRO ARCADES (130 BPM in C minor/Eb Major) ---
  private playChiptunePattern(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Chord progression in C minor: Cm, Eb, Bb, Fm (4 beats each bar, 16 steps per chord)
    const chordIndex = Math.floor(this.currentBeat / 4) % 4;
    const chords = [
      [130.81, 155.56, 196.00, 261.63], // Cm (C3, Eb3, G3, C4)
      [155.56, 196.00, 233.08, 311.13], // Eb (Eb3, G3, Bb3, Eb4)
      [116.54, 146.83, 174.61, 233.08], // Bb (Bb2, D3, F3, Bb3)
      [138.59, 174.61, 207.65, 277.18]  // Fm (Db3, F3, Ab3, Db4) / FCM adaptation
    ];

    const currentChord = chords[chordIndex];

    // --- BASS TO PULSE ON BEATS (step 0, 4, 8, 12, and optionally others) ---
    if (step % 4 === 0 || step % 4 === 2) {
      // Bouncing triangle wave bass or square
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(currentChord[0] / 2, time); // Octave lower for bass
      
      gainNode.gain.setValueAtTime(0.22, time);
      gainNode.gain.exponentialRampToValueAtTime(0.005, time + 0.18);
      
      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      osc.start(time);
      osc.stop(time + 0.2);
    }

    // --- ARPEGGIATOR MELODY (Fast square wave notes) ---
    // Every step, let's play arpeggios
    const arpNotes = [0, 1, 2, 3, 2, 1, 0, 3, 1, 2, 3, 1, 2, 0, 1, 3];
    const arpVal = arpNotes[step];
    let noteFreq = currentChord[arpVal] * 2; // Octave higher

    // Add visual retro random trills sometimes
    if (step % 8 === 4) {
      noteFreq *= 1.5; // Turn it to a 5th of upper octave
    }

    const leadOsc = this.ctx.createOscillator();
    const leadGain = this.ctx.createGain();
    
    // Retro standard 12.5% or 25% duty cycle pulse simulator (square)
    leadOsc.type = 'square';
    leadOsc.frequency.setValueAtTime(noteFreq, time);
    
    // Retro glide / pitch slide sometimes!
    if (step % 4 === 0) {
      leadOsc.frequency.exponentialRampToValueAtTime(noteFreq * 2, time + 0.08);
    }

    leadGain.gain.setValueAtTime(0.06, time);
    // Short chiptune decay
    leadGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    
    leadOsc.connect(leadGain);
    leadGain.connect(this.masterGain);
    
    leadOsc.start(time);
    leadOsc.stop(time + 0.1);

    // --- PROCEDURAL SNARE / NOISE POP FOR BEAT 2 and 4 (step 4, 12) ---
    if (step === 4 || step === 12) {
      this.playChiptuneNoiseSnare(time);
    }

    // --- ARCADE HI-HAT (Short metal-decay noise on intermediate 8th/16th steps) ---
    if (step % 4 === 2) {
      this.playChiptuneWhiteHat(time);
    }
  }

  // --- 2. NEON HIGHWAY (110 BPM Synthwave / Cinematic driving) ---
  private playSynthwavePattern(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Progression: Am, F, G, Em (8 beats each, which is 32 steps each chord)
    const chordIndex = Math.floor(this.currentBeat / 8) % 4;
    const baseFreqs = [110.00, 87.31, 98.00, 82.41]; // A2, F2, G2, E2
    const currentBase = baseFreqs[chordIndex];

    const chords = [
      [220.00, 261.63, 329.63, 440.00], // Am (A3, C4, E4, A4)
      [174.61, 220.00, 261.63, 349.23], // F (F3, A3, C4, F4)
      [196.00, 246.94, 293.66, 392.00], // G (G3, B3, D4, G4)
      [164.81, 196.00, 246.94, 329.63]  // Em (E3, G3, B3, E4)
    ];

    // --- SYNTHWAVE DOUBLE-PULSING BASSLINE (8th notes: 0, 2, 4, 6...) ---
    if (step % 2 === 0) {
      // Create rich dual-sawtooth bass
      const subOsc = this.ctx.createOscillator();
      const subOsc2 = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      const lowpass = this.ctx.createBiquadFilter();

      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(currentBase / 2, time); // Deep sub

      subOsc2.type = 'sawtooth';
      subOsc2.frequency.setValueAtTime(currentBase / 2 + 1.2, time); // Detuned

      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(320, time); // Dark outrun filter

      // Bass volume envelope
      const isSyncBeat = (step % 4 === 0);
      const vol = isSyncBeat ? 0.35 : 0.28; // Give extra punch on first beat of kick
      subGain.gain.setValueAtTime(vol, time);
      subGain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

      subOsc.connect(lowpass);
      subOsc2.connect(lowpass);
      lowpass.connect(subGain);
      subGain.connect(this.masterGain);

      subOsc.start(time);
      subOsc2.start(time);
      subOsc.stop(time + 0.24);
      subOsc2.stop(time + 0.24);
    }

    // --- SYNTH COMP PAD SWEEP (Only on beat changes or step 0) ---
    if (step === 0) {
      const padOsc = this.ctx.createOscillator();
      const padOsc2 = this.ctx.createOscillator();
      const padFilter = this.ctx.createBiquadFilter();
      const padGain = this.ctx.createGain();

      padOsc.type = 'sawtooth';
      padOsc2.type = 'triangle';

      const padFreq = chords[chordIndex][2]; // Swell the 5th factor
      padOsc.frequency.setValueAtTime(padFreq, time);
      padOsc2.frequency.setValueAtTime(padFreq / 2 + 0.8, time); // detuned lower

      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(100, time);
      padFilter.frequency.exponentialRampToValueAtTime(1200, time + 1.5); // Warm filter sweep

      padGain.gain.setValueAtTime(0.0, time);
      padGain.gain.linearRampToValueAtTime(0.12, time + 0.8); // Slow key attack
      padGain.gain.exponentialRampToValueAtTime(0.001, time + 3.8); // Lush fadeout

      padOsc.connect(padFilter);
      padOsc2.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(this.masterGain);

      padOsc.start(time);
      padOsc2.start(time);
      padOsc.stop(time + 4.0);
      padOsc2.stop(time + 4.0);
    }

    // --- LEAD SYNTH HOOK (Soaring cyber-melody) ---
    // Make a catchy neon 8-step melody loop that syncs to chord progression
    const melodySteps = [0, -1, 2, 3, -1, 5, 4, 3];
    const melodyNoteIdx = melodySteps[this.currentBeat % 8];

    // Only play lead on some structured beats
    if (melodyNoteIdx >= 0 && (step === 0 || step === 3 || step === 6 || step === 10)) {
      const chord = chords[chordIndex];
      const rootNote = chord[melodyNoteIdx % chord.length] * 2; // Boost octave

      const leadOsc = this.ctx.createOscillator();
      const leadFilter = this.ctx.createBiquadFilter();
      const leadGain = this.ctx.createGain();

      leadOsc.type = 'sawtooth';
      leadOsc.frequency.setValueAtTime(rootNote, time);

      leadFilter.type = 'bandpass';
      leadFilter.frequency.setValueAtTime(1400, time);
      leadFilter.Q.setValueAtTime(1.5, time);

      leadGain.gain.setValueAtTime(0.05, time);
      leadGain.gain.exponentialRampToValueAtTime(0.002, time + 0.35); // Echo decay feel

      leadOsc.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(this.masterGain);

      // Simple fake echo/delay line using a second start
      leadOsc.start(time);
      leadOsc.stop(time + 0.4);

      // Echo note slightly staggered and softer
      const echoGain = this.ctx.createGain();
      echoGain.gain.setValueAtTime(0.018, time + 0.15);
      echoGain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      
      const echoOsc = this.ctx.createOscillator();
      echoOsc.type = 'sawtooth';
      echoOsc.frequency.setValueAtTime(rootNote, time + 0.15);
      
      echoOsc.connect(leadFilter);
      leadFilter.connect(echoGain);
      echoGain.connect(this.masterGain);
      
      echoOsc.start(time + 0.15);
      echoOsc.stop(time + 0.5);
    }

    // --- PROCEDURAL LO-FI KICK ON BEATS ---
    if (step % 4 === 0) {
      this.playSynthwaveKick(time);
    }

    // --- SNARE DRUM ON BEATS 2 and 4 (step 4, 12) ---
    if (step === 4 || step === 12) {
      this.playSynthwaveSnare(time);
    }
  }

  // --- 3. AETHER AMBIENT (80 BPM Cinematic Star-Map Space Swells) ---
  private playAmbientPattern(step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Chord progression: Gmaj7 -> F#m7 -> Em7 -> Cmaj7 (16 beats each!)
    const chordIndex = Math.floor(this.currentBeat / 16) % 4;
    // Gmaj7, F#m7, Em7, Cmaj7 base frequencies
    const ambientChords = [
      [196.00, 246.94, 293.66, 369.99, 440.00], // Gmaj7 (G3, B3, D4, F#4, A4)
      [185.00, 220.00, 277.18, 329.63, 440.00], // F#m7 (F#3, A3, C#4, E4, A4)
      [164.81, 196.00, 246.94, 293.66, 392.00], // Em7 (E3, G3, B3, D4, G4)
      [130.81, 164.81, 196.00, 246.94, 329.63]  // Cmaj7 (C3, E3, G3, B3, E4)
    ];

    // --- AMBIENT LUSH SWELLS (Occurs every 8 beats - very slowly) ---
    if (step === 0 && this.currentBeat % 8 === 0) {
      // 3 overlapping slow-phase sine/triangle waves
      const notesToSwell = [ambientChords[chordIndex][0] / 2, ambientChords[chordIndex][1], ambientChords[chordIndex][3]];
      
      notesToSwell.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        // Multi-stage slow swell
        oscGain.gain.setValueAtTime(0.0, time);
        oscGain.gain.linearRampToValueAtTime(0.08, time + 2.0 + idx * 0.4); // Very slow attack
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 6.5); // long release

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 7.0);
      });
    }

    // --- SPARE CRYSTAL RESONANT PLUCKS ---
    // Generate gentle chime notes on pentatonic beats
    if (step % 5 === 0) {
      const scale = ambientChords[chordIndex];
      const randomNote = scale[Math.floor(Math.random() * scale.length)] * 2; // Octave higher

      const chimeOsc = this.ctx.createOscillator();
      const chimeFilter = this.ctx.createBiquadFilter();
      const chimeGain = this.ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(randomNote, time);

      chimeFilter.type = 'peaking';
      chimeFilter.frequency.setValueAtTime(1800, time);
      chimeFilter.Q.setValueAtTime(3.0, time);

      chimeGain.gain.setValueAtTime(0.0, time);
      chimeGain.gain.linearRampToValueAtTime(0.04, time + 0.05); // quick but soft tackle
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2); // sparkling long echo

      chimeOsc.connect(chimeFilter);
      chimeFilter.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      chimeOsc.start(time);
      chimeOsc.stop(time + 1.5);
    }
  }

  // --- PRIMITIVE SYNTH ENGINE DRUM GENERATORS ---

  // Standard chiptune noise channel hihat simulation
  private playChiptuneWhiteHat(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.04; // 40ms noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time); // High metal static cymbal

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.015, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0002, time + 0.038);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + 0.04);
  }

  // Chiptune snare sound combining a pulsing pitch glide with white noise decay
  private playChiptuneNoiseSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;

    // 1. Core noise burst (snare rattle)
    const bufferSize = this.ctx.sampleRate * 0.12; // 120ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.012, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseNode.start(time);
    noiseNode.stop(time + 0.12);

    // 2. Tonal snap
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    
    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(180, time);
    toneOsc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    toneGain.gain.setValueAtTime(0.05, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    toneOsc.connect(toneGain);
    toneGain.connect(this.masterGain);

    toneOsc.start(time);
    toneOsc.stop(time + 0.09);
  }

  // Deep synthwave analog kick: frequency slide from 120Hz to 30Hz in 100ms
  private playSynthwaveKick(time: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    
    // Quick kick sweep
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gainNode.gain.setValueAtTime(0.38, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Heavy synthwave pop-snare with bandpass noise & low-octave wood block pop
  private playSynthwaveSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;

    // 1. Noise smash
    const bufferSize = this.ctx.sampleRate * 0.25; // 250ms snare wire
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1000, time);
    bp.Q.setValueAtTime(1.2, time);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.025, time);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(bp);
    bp.connect(gainNoise);
    gainNoise.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.25);

    // 2. Punch oscillator
    const punch = this.ctx.createOscillator();
    const gainPunch = this.ctx.createGain();

    punch.type = 'triangle';
    punch.frequency.setValueAtTime(180, time);
    punch.frequency.exponentialRampToValueAtTime(100, time + 0.1);

    gainPunch.gain.setValueAtTime(0.18, time);
    gainPunch.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    punch.connect(gainPunch);
    gainPunch.connect(this.masterGain);

    punch.start(time);
    punch.stop(time + 0.13);
  }
}

export const musicEngine = new ProceduralAudioEngine();
