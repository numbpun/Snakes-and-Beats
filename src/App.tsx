/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { TRACKS, musicEngine } from './audioEngine';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SnakeGame } from './components/SnakeGame';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Music, 
  Disc, 
  Sparkles, 
  Cpu, 
  Gamepad2, 
  Info, 
  Zap,
  Sliders,
  Tv,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [beatIndex, setBeatIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  
  // Track timeline progress
  const [playbackProgress, setPlaybackProgress] = useState({ current: 0, total: 180, percent: 0 });

  const activeTrack = TRACKS[currentTrackIndex];

  // Callback whenever the music sequencer steps forward
  const handleMusicStep = (step: number, beat: number) => {
    setStepIndex(step);
    setBeatIndex(beat);
  };

  // Start playing a specific track
  const handlePlayTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    musicEngine.start(index, handleMusicStep);
  };

  // Toggle play/pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      musicEngine.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      musicEngine.start(currentTrackIndex, handleMusicStep);
    }
  };

  // Turn to Next Track
  const handleNextTrack = () => {
    const nextIdx = (currentTrackIndex + 1) % TRACKS.length;
    handlePlayTrack(nextIdx);
  };

  // Back to Previous Track
  const handlePrevTrack = () => {
    const prevIdx = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    handlePlayTrack(prevIdx);
  };

  // Change master volume state & sync engine
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    musicEngine.setVolume(newVol);
  };

  // Monitor play progression clock
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaybackProgress(musicEngine.getProgress());
    }, 450);

    return () => clearInterval(interval);
  }, []);

  // Set the default volume to the audio engine on boot load
  useEffect(() => {
    musicEngine.setVolume(volume);
  }, [volume]);

  // Clean format helper for seconds -> mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Spinning speed multiplier of retro vinyl based on track details (higher BPM = faster)
  const getDiscAnimationSpeed = () => {
    if (!isPlaying) return 'paused';
    const baseDuration = 5; // standard seconds rotation for 100bpm
    const duration = (60 / activeTrack.bpm) * baseDuration;
    return `${duration}s`;
  };

  // Color specific mappings
  const themeClasses = {
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      activeBorder: 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
      text: 'text-emerald-400',
      fill: 'bg-emerald-500',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    magenta: {
      border: 'border-fuchsia-500/20 hover:border-fuchsia-500/40',
      activeBorder: 'border-fuchsia-500/60 shadow-[0_0_15px_rgba(217,70,239,0.35)]',
      text: 'text-fuchsia-400',
      fill: 'bg-fuchsia-500',
      badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
    },
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      activeBorder: 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.35)]',
      text: 'text-cyan-400',
      fill: 'bg-cyan-500',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    }
  }[activeTrack.color] || {
    border: 'border-purple-500/20',
    activeBorder: 'border-purple-500/60 shadow-purple-500/35',
    text: 'text-purple-400',
    fill: 'bg-purple-500',
    badge: 'bg-purple-500/10 text-purple-400'
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 flex flex-col font-sans selection:bg-fuchsia-500/40 selection:text-white crt-screen" id="main-root-container">
      {/* Interactive CRT Scanline and Static Noise layer overlays */}
      <div className="crt-scanline" />
      <div className="absolute inset-0 pointer-events-none static-noise z-30 opacity-10" />

      {/* 1. Cryptic System Header Banner */}
      <header className="border-b-2 border-fuchsia-500 bg-black/90 sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-[0_4px_15px_rgba(255,0,127,0.2)]" id="arcade-header">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-fuchsia-600 p-[2px] shadow-[0_0_10px_rgba(255,0,127,0.8)] border border-cyan-400 animate-pulse">
            <div className="h-full w-full bg-black flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-fuchsia-500" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest flex items-center gap-2 text-fuchsia-500 glitch-text">
              ARCADE_DECOY_CONTRAND <span className="text-[9px] font-mono tracking-widest text-cyan-400 border border-cyan-400 px-1.5 py-0.5 bg-black rounded uppercase">v4.92_ACTIVE</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono tracking-tight uppercase">SYSTEM_OPERATOR: PROCEDURAL_CYBERNETIC_SEQUENCER_REPLICA</p>
          </div>
        </div>

        {/* Binary / Cryptic System specifications indicators */}
        <div className="hidden sm:flex items-center gap-3" id="system-stats-indicator">
          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-black px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
            <Cpu size={12} className="text-cyan-400 animate-pulse" />
            <span className="uppercase tracking-widest">OSC_MATRIX: SECURE_LINK</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-black px-3 py-1.5 rounded border border-fuchsia-500/40 text-fuchsia-400 shadow-[0_0_8px_rgba(255,0,127,0.2)]">
            <Tv size={12} className="text-fuchsia-400" />
            <span className="uppercase tracking-widest">RASTER_CLOCK: 60Hz_CRT</span>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 relative z-10" id="applet-viewport">
        
        {/* Intro Machine Command Instructions Line */}
        <div className="bg-black rounded border-2 border-cyan-500/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_15px_rgba(0,240,255,0.1)]" id="intro-card">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500 shrink-0 mt-0.5 animate-pulse">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-fuchsia-500 tracking-wider uppercase glitch-text">:: SYSTEM MANUAL PROTOCOL_608 ::</h4>
              <p className="text-xs text-zinc-300 max-w-2xl mt-0.5 font-mono leading-relaxed">
                COGNITIVE COMMAND GRIDS INITIATED. UNLOCK CYBERNETIC SPECTRUM TO MERGE SIGNAL FREQUENCIES WITH CLASSIC GRID MOVEMENT patterns. ACTIVE STEP SYNC WILL CONSTRUCT HARMONIC TIMING DELAYS FOR OPTIMAL BIO-ORGANISM REFLEX TUNING.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                id="initialize-synth-btn"
                onClick={handleTogglePlay}
                className="px-5 py-2.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 font-mono text-xs font-bold text-black uppercase transition-all duration-150 tracking-widest shadow-[0_0_15px_rgba(255,0,127,0.6)] border border-cyan-400 shrink-0 flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
              >
                <Play size={12} fill="currentColor" /> INT_CORE_HARMONICS
              </button>
            ) : (
              <span className="text-[11px] font-mono text-cyan-400 px-3 py-1 bg-black border-2 border-cyan-400 rounded flex items-center gap-1.5 animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                <span className="h-1.5 w-1.5 bg-cyan-400 rounded-none shadow-[0_0_5px_rgba(0,240,255,0.9)]" /> DECOY_HARMONICS_LIVE
              </span>
            )}
          </div>
        </div>

        {/* 3-Column Core Grid Setup (Left: Tracks, Center: Game, Right: Visualizer & Controls) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-bento-grid">
          
          {/* A. LEFT COLUMN: PLAYBACK CONSOLE & INTEGRATION SPECS (4 / 12) */}
          <div className="lg:col-span-4 flex flex-col gap-6 font-sans" id="col-playlist">
            
            {/* Music playlists listing card with jarring Cyan vs Magenta contrasts */}
            <div className="bg-black/95 border-2 border-fuchsia-500 rounded p-5 shadow-[0_0_15px_rgba(255,0,127,0.2)] flex flex-col" id="playlist-card">
              <div className="flex items-center justify-between border-b-2 border-fuchsia-500/40 pb-3 mb-4">
                <h3 className="text-md font-bold text-fuchsia-400 flex items-center gap-2 uppercase tracking-widest">
                  <Music className="w-4 h-4 text-fuchsia-500" /> WAVEFORM_MATRIX // EMISSIONS
                </h3>
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest bg-cyan-950/40 border border-cyan-400 px-1.5 py-0.5 rounded uppercase">
                  3_MODELS_ACTIVE
                </span>
              </div>

              {/* Individual Track Blocks */}
              <div className="flex flex-col gap-3" id="playlist-track-list">
                {TRACKS.map((track, idx) => {
                  const isCurrent = idx === currentTrackIndex;
                  const itemColorConfig = {
                    emerald: {
                      borderClass: 'border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-400/65',
                      activeClass: 'border-cyan-400 bg-cyan-950/25 shadow-[0_0_12px_rgba(0,240,255,0.4)]',
                      bullet: 'bg-cyan-400',
                      subtext: 'text-cyan-400'
                    },
                    magenta: {
                      borderClass: 'border-fuchsia-500/20 bg-fuchsia-950/5 hover:border-fuchsia-400/65',
                      activeClass: 'border-fuchsia-400 bg-fuchsia-950/25 shadow-[0_0_12px_rgba(255,0,127,0.4)]',
                      bullet: 'bg-fuchsia-500',
                      subtext: 'text-fuchsia-400'
                    },
                    cyan: {
                      borderClass: 'border-cyan-500/20 bg-cyan-950/5 hover:border-cyan-400/65',
                      activeClass: 'border-cyan-400 bg-cyan-950/25 shadow-[0_0_12px_rgba(0,240,255,0.4)]',
                      bullet: 'bg-cyan-400',
                      subtext: 'text-cyan-400'
                    }
                  }[track.color];

                  return (
                    <button
                      key={track.id}
                      id={`track-select-${idx}`}
                      onClick={() => handlePlayTrack(idx)}
                      className={`w-full text-left p-4 rounded-none border transition-all duration-300 flex items-start justify-between cursor-pointer group ${
                        isCurrent ? itemColorConfig.activeClass : itemColorConfig.borderClass
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Interactive Status Sphere */}
                        <div className="mt-1">
                          {isCurrent && isPlaying ? (
                            <span className="flex h-3 w-3 relative">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-none opacity-75 ${itemColorConfig.bullet}`}></span>
                              <span className={`relative inline-flex rounded-none h-3 w-3 ${itemColorConfig.bullet}`}></span>
                            </span>
                          ) : (
                            <div className={`h-2.5 w-2.5 rounded-none bg-zinc-800 group-hover:bg-fuchsia-400 transition-colors ${
                              isCurrent ? itemColorConfig.bullet : ''
                            }`} />
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5 leading-none">
                          <span className={`text-[10px] font-bold font-mono uppercase tracking-widest leading-none ${
                            isCurrent ? itemColorConfig.subtext : 'text-zinc-500'
                          }`}>
                            // {track.genre}
                          </span>
                          <span className="text-sm font-black text-white tracking-widest uppercase group-hover:text-fuchsia-400 transition-colors mt-1">
                            {track.title}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono tracking-wide uppercase">
                            GEN_SOURCE: {track.artist}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0 font-mono">
                        <span className="text-[10px] text-zinc-300 border border-cyan-500/40 bg-black px-1.5 py-0.5 rounded-none font-bold">
                          {track.bpm} BPM
                        </span>
                        {isCurrent && isPlaying && (
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${itemColorConfig.subtext}`}>TRANSMITTING</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. OSCILLATOR SPECTRUM MODULE */}
            <div className="bg-black/95 border-2 border-cyan-500 rounded p-5 shadow-[0_0_15px_rgba(0,240,255,0.2)] flex flex-col gap-4" id="audio-specs-card">
              <div className="flex items-center gap-2 border-b-2 border-cyan-500/40 pb-3">
                <Info size={16} className="text-cyan-400 animate-pulse" />
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">OSCILLATOR_SPECTRAL_TELEMETRY</h4>
              </div>

              <div className="flex items-center gap-4 bg-cyan-950/20 p-3 rounded-none border border-cyan-500/30" id="vinyl-container">
                {/* Visual cassette/vinyl wheel spinner */}
                <div className="relative h-14 w-14 rounded-none border-2 border-cyan-400 bg-black flex items-center justify-center shrink-0 shadow-inner group overflow-hidden">
                  <div 
                    className="absolute inset-[3px] rounded-none border-2 border-dashed border-fuchsia-500"
                    style={{
                      animation: isPlaying ? `spin ${getDiscAnimationSpeed()} linear infinite` : 'none',
                    }}
                  />
                  {/* Outer mechanical grooves */}
                  <div className="absolute inset-2 border border-fuchsia-500/20" />
                  <div className="absolute inset-4 border border-cyan-500/20" />
                  
                  {/* Center mechanical dot */}
                  <div className="h-5 w-5 bg-fuchsia-500 flex items-center justify-center rounded-none shadow-[0_0_8px_rgba(255,0,127,1)]">
                    <Disc size={10} className="text-black animate-pulse" />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 leading-tight overflow-hidden font-mono">
                  <h5 className="text-xs font-black text-white uppercase tracking-wider truncate">{activeTrack.title}</h5>
                  <p className="text-[10px] text-zinc-400 tracking-tight leading-normal uppercase">
                    REG_STAMP: <span className={isPlaying ? 'text-fuchsia-400 font-bold' : 'text-cyan-400'}>
                      {isPlaying ? 'COGNITIVE_PLAY' : 'STANDBY_MODE'}
                    </span>
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase line-clamp-2 leading-tight mt-1">
                    {activeTrack.description}
                  </p>
                </div>
              </div>

              {/* Hardware specifications details checklist */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono leading-relaxed" id="hardware-specifications">
                <div className="bg-black p-2 border border-cyan-500/30">
                  <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">// OSC_TYPE</span>
                  <span className="text-cyan-400 font-bold">
                    {currentTrackIndex === 0 ? 'PULSE_SQR_12%' : currentTrackIndex === 1 ? 'SAW_DUAL_DETUNE' : 'SINE_SWELL_AMBIENT'}
                  </span>
                </div>
                <div className="bg-black p-2 border border-cyan-500/30">
                  <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">// FILTER_UNIT</span>
                  <span className="text-cyan-400 font-bold">
                    {currentTrackIndex === 0 ? 'BANDPASS_HAT_EQ' : currentTrackIndex === 1 ? 'SWEEP_LOWPASS' : 'TAIL_FILTER_FLOAT'}
                  </span>
                </div>
                <div className="bg-black p-2 border border-fuchsia-500/30">
                  <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">// CLOCK_LOCK</span>
                  <span className="text-fuchsia-400 font-bold">
                    STEP_16 / {activeTrack.bpm} BPM
                  </span>
                </div>
                <div className="bg-black p-2 border border-fuchsia-500/30">
                  <span className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5">// MEASURED_TIME</span>
                  <span className="text-fuchsia-400 font-bold">
                    {formatTime(playbackProgress.current)} / {formatTime(playbackProgress.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* B. CENTER COLUMN: THE MAIN NEON ARCADE CORE SCREEN (5 / 12) */}
          <div className="lg:col-span-5 flex flex-col" id="col-game">
            <SnakeGame 
              currentTrackColor={activeTrack.color} 
              isMusicPlaying={isPlaying}
              beatIndex={beatIndex}
              stepIndex={stepIndex}
            />
          </div>

          {/* C. RIGHT COLUMN: MASTER SOUNDS PANELS / USER MAN (3 / 12) */}
          <div className="lg:col-span-3 flex flex-col gap-6 font-sans" id="col-manual-controls">
            
            {/* Audio Dashboard Panel with massive Cyan/Magenta style */}
            <div className="bg-black/95 border-2 border-fuchsia-500 rounded p-5 shadow-[0_0_15px_rgba(255,0,127,0.2)] flex flex-col gap-5" id="audio-dashboard-card">
              <div className="flex items-center gap-2 border-b-2 border-fuchsia-500/40 pb-3">
                <Sliders size={16} className="text-fuchsia-500 animate-pulse" />
                <h4 className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest">AMPLITUDE_MODULATION // FREQ_FADER</h4>
              </div>

              {/* Master Volume Controller */}
              <div className="flex flex-col gap-2 font-mono text-zinc-300" id="volume-fader-bar">
                <div className="flex items-center justify-between text-xs">
                  <span className="tracking-widest uppercase flex items-center gap-1.5 text-cyan-400">
                    {volume === 0 ? <VolumeX size={12} className="text-fuchsia-500 animate-bounce" /> : <Volume2 size={12} className="text-cyan-400" />} 
                    GAIN_VALUE:
                  </span>
                  <span className="text-fuchsia-500 font-extrabold text-[13px]">{Math.round(volume * 100)}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    id="mute-toggle-btn"
                    onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.5)}
                    className="p-1 px-1.5 border-2 border-fuchsia-500 bg-black text-fuchsia-400 hover:text-white hover:bg-fuchsia-950 active:scale-95 transition cursor-pointer"
                    title={volume > 0 ? 'Mute' : 'Unmute'}
                  >
                    {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>

                  <input
                    type="range"
                    id="volume-range-input"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 accent-fuchsia-500 bg-zinc-900 h-2 appearance-none cursor-pointer border-2 border-cyan-400 focus:outline-none shadow-[0_0_8px_rgba(0,240,255,0.3)]"
                  />
                </div>
              </div>

              {/* Live Reactive Visualizer */}
              <div className="flex flex-col gap-2 font-mono" id="spectrum-container">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">// SPECTRUM_ANALYSER_REALTIME_CLOCK</span>
                <AudioVisualizer isPlaying={isPlaying} themeColor={activeTrack.color} />
              </div>

              {/* Retro Tap controls for Synth Player */}
              <div className="flex flex-col gap-3" id="compact-player">
                <div className="bg-black border-2 border-cyan-500/50 p-3 text-center" id="now-playing-hud">
                  <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase block mb-1">
                    [ SPECTRAL_ENVELOPE ]
                  </span>
                  <h4 className="text-sm font-black text-cyan-400 truncate uppercase tracking-wider">{activeTrack.title}</h4>
                  <div className="w-full bg-zinc-950 h-2.5 overflow-hidden mt-3 border border-fuchsia-500/50">
                    <div 
                      className="h-full bg-fuchsia-500 transition-all duration-300 shadow-[0_0_10px_rgba(255,0,127,1)]" 
                      style={{ width: `${playbackProgress.percent * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-2">
                    <span>{formatTime(playbackProgress.current)}</span>
                    <span>{formatTime(playbackProgress.total)}</span>
                  </div>
                </div>

                {/* Playing buttons panel in striking Magenta vs Cyan styling */}
                <div className="flex items-center justify-center gap-4 py-1" id="media-controls">
                  <button
                    id="track-prev-btn"
                    onClick={handlePrevTrack}
                    className="p-3 border-2 border-cyan-400 text-cyan-400 bg-black hover:bg-cyan-950/40 hover:text-white hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] transition duration-200 cursor-pointer"
                    title="Previous Waveform"
                  >
                    <SkipBack size={16} fill="currentColor" />
                  </button>

                  <button
                    id="track-play-toggle"
                    onClick={handleTogglePlay}
                    className="p-4 border-2 border-fuchsia-500 text-fuchsia-500 bg-black rounded-none shadow-[0_0_15px_rgba(255,0,127,0.4)] hover:bg-fuchsia-500 hover:text-black hover:shadow-[0_0_20px_rgba(255,0,127,0.8)] transition duration-200 cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause size={20} fill="currentColor" className="animate-pulse" />
                    ) : (
                      <Play size={20} className="translate-x-[1.5px]" fill="currentColor" />
                    )}
                  </button>

                  <button
                    id="track-next-btn"
                    onClick={handleNextTrack}
                    className="p-3 border-2 border-cyan-400 text-cyan-400 bg-black hover:bg-cyan-950/40 hover:text-white hover:shadow-[0_0_12px_rgba(0,240,255,0.5)] transition duration-200 cursor-pointer"
                    title="Next Waveform"
                  >
                    <SkipForward size={16} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>

            {/* Instruction Manual Bento Card */}
            <div className="bg-black/95 border-2 border-cyan-500 rounded p-5 shadow-[0_0_15px_rgba(0,240,255,0.2)] flex flex-col gap-4" id="arcade-rules-card">
              <div className="flex items-center gap-2 border-b-2 border-cyan-500/40 pb-3">
                <Gamepad2 size={16} className="text-cyan-400 animate-pulse" />
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">TACTILE_TRANSMISSION // OVERRIDE_LOGS</h4>
              </div>

              {/* Instructions sheet */}
              <div className="flex flex-col gap-3 font-mono text-[11px]" id="tutorial-sheet">
                
                {/* Movement list */}
                <div className="flex flex-col gap-1 text-zinc-400 leading-none">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase mb-1">// COGNITION INTERFACE</span>
                  <div className="flex justify-between border-b border-zinc-900 py-1">
                    <span>UP / NORTH_VEC</span>
                    <span className="text-cyan-400 px-1.5 py-0.5 bg-black border border-cyan-500/50">W / ↑</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 py-1">
                    <span>DOWN / SOUTH_VEC</span>
                    <span className="text-cyan-400 px-1.5 py-0.5 bg-black border border-cyan-500/50">S / ↓</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 py-1">
                    <span>LEFT / WEST_VEC</span>
                    <span className="text-cyan-400 px-1.5 py-0.5 bg-black border border-cyan-500/50">A / ←</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 py-1">
                    <span>RIGHT / EAST_VEC</span>
                    <span className="text-cyan-400 px-1.5 py-0.5 bg-black border border-cyan-500/50">D / →</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-900 py-1">
                    <span>SUSPEND / REBOOT</span>
                    <span className="text-fuchsia-400 px-1.5 py-0.5 bg-black border border-fuchsia-500/50">SPACEBAR</span>
                  </div>
                </div>

                {/* Food list map */}
                <div className="flex flex-col gap-2 mt-2 leading-tight">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase mb-1">// DUMMY ENERGETICS RECEPTACLES</span>
                  <div className="flex items-start gap-2 text-[10px]">
                    <div className="h-3.5 w-3.5 bg-cyan-950 border border-cyan-400 flex items-center justify-center shrink-0">
                      <div className="h-1 bg-cyan-400 w-1" />
                    </div>
                    <p className="text-zinc-450 text-zinc-400">
                      <strong className="text-cyan-400 uppercase">[ COGNITIVE COUPLER ]:</strong> +10 scale units, expands body queue structure.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-[10px]">
                    <div className="h-3.5 w-3.5 bg-fuchsia-950 border border-fuchsia-500 flex items-center justify-center shrink-0 rotate-45">
                      <div className="h-1 bg-fuchsia-500 w-1" />
                    </div>
                    <p className="text-zinc-400">
                      <strong className="text-fuchsia-500 uppercase">[ VELOCITY INJECTOR ]:</strong> Installs +30 bonus score, increases ticks to maximum velocity limit.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-[10px]">
                    <div className="h-3.5 w-3.5 bg-black border-2 border-cyan-400 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 bg-fuchsia-500 animate-ping" />
                    </div>
                    <p className="text-zinc-400">
                      <strong className="text-cyan-400 uppercase">[ OSCILLATION ACCUMULATOR ]:</strong> Recovers -40ms reaction threshold, provides +20 index points.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-[10px]">
                    <div className="h-3.5 w-3.5 bg-zinc-950 border-2 border-dashed border-fuchsia-500/80 flex items-center justify-center shrink-0">
                      <div className="h-1 bg-fuchsia-400 w-1 rounded-full animate-pulse" />
                    </div>
                    <p className="text-zinc-400">
                      <strong className="text-fuchsia-500 uppercase">[ CHASSIS_BYPASS ]:</strong> Bypasses perimeter limits completely, provides +25 credits.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </main>

      {/* 4. Cryptic Retro Footer */}
      <footer className="border-t-2 border-cyan-500 bg-black px-4 py-8 text-center text-zinc-400 font-mono text-xs uppercase relative z-10" id="arcade-footer bg-slate-950">
        <p className="tracking-widest">
          :: SENSORY COGNITION FEEDBACK DECOY v4.92_SECURED. ALL TRANSMISSIONS LOGGED VIA STANDBY FREQUENCY ENCODING ::
        </p>
        <p className="text-[10px] text-zinc-650 text-zinc-500 mt-2 tracking-widest leading-none">
          CRAFTED BY RETRO-FUTURIST OPERATIONS REPLICA FOR ANTIGRAVITY ENGINE CORP. ALL TRADEMARKS REGISTERED.
        </p>
      </footer>
    </div>
  );
}
