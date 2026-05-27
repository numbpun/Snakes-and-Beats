/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SnakeGameState, Position, Direction } from '../types';
import { Play, Pause, RotateCcw, Trophy, Sparkles, Volume2, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Target } from 'lucide-react';

interface SnakeGameProps {
  currentTrackColor: string; // 'emerald' | 'magenta' | 'cyan'
  isMusicPlaying: boolean;
  beatIndex: number;
  stepIndex: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
}

export function SnakeGame({ currentTrackColor, isMusicPlaying, beatIndex, stepIndex }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // High scores from LocalStorage
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('neon_snake_highscore');
    return saved ? parseInt(saved, 10) : 100;
  });

  const GRID_SIZE = 20; // 20x20 segments
  
  // Game states
  const [gameState, setGameState] = useState<SnakeGameState>({
    segments: [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ],
    direction: 'UP',
    nextDirection: 'UP',
    food: { x: 5, y: 5 },
    specialFood: null,
    specialFoodTimeLeft: 0,
    foodType: 'normal',
    score: 0,
    highScore: highScore,
    isGameOver: false,
    isPaused: true,
    speed: 130, // Default ms tick rate
    gridSize: GRID_SIZE,
    scoreMultipler: 1,
  });

  // Controls & Options
  const [beatSyncEnabled, setBeatSyncEnabled] = useState(false);
  const [infiniteMode, setInfiniteMode] = useState(false);
  const [hyperSpeed, setHyperSpeed] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastStepCount = useRef<number>(-1);
  const gameIntervalRef = useRef<number | null>(null);

  // Theme configuration
  const getThemeColors = useCallback(() => {
    switch (currentTrackColor) {
      case 'magenta':
        return {
          primary: '#ff007f', // hot pink
          secondary: '#d946ef', // fuchsia
          accent: '#00f0ff', // cyan for secondary
          snakeHead: '#ffffff',
          snakeBody: '#ff007f',
          gridLine: 'rgba(217, 70, 239, 0.06)',
          glowColor: 'rgba(255, 0, 127, 0.6)'
        };
      case 'cyan':
        return {
          primary: '#00f0ff', // cyan
          secondary: '#06b6d4', // dark cyan
          accent: '#ff007f', // hot pink accent
          snakeHead: '#ffffff',
          snakeBody: '#00f0ff',
          gridLine: 'rgba(6, 182, 212, 0.06)',
          glowColor: 'rgba(0, 240, 255, 0.6)'
        };
      case 'emerald':
      default:
        return {
          primary: '#00f0ff', // cyan
          secondary: '#ff007f', // hot pink magenta secondary/accent
          accent: '#ff007f', // fuchsia/magenta
          snakeHead: '#ffffff',
          snakeBody: '#00f0ff',
          gridLine: 'rgba(0, 240, 255, 0.08)',
          glowColor: 'rgba(0, 240, 255, 0.6)'
        };
    }
  }, [currentTrackColor]);

  // Generate a random coordinate not occupied by the snake
  const getRandomPosition = useCallback((segments: Position[]): Position => {
    let attempts = 0;
    while (attempts < 500) {
      const pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const hitSnake = segments.some(seg => seg.x === pos.x && seg.y === pos.y);
      if (!hitSnake) return pos;
      attempts++;
    }
    return { x: 1, y: 1 };
  }, []);

  // Spawn visual particles on food eat
  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const px = x * 20 + 10; // Center in scale 20
    const py = y * 20 + 10;
    const newParticles: Particle[] = [];
    const count = 12;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      newParticles.push({
        id: Date.now() + i + Math.random(),
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        alpha: 1.0,
        life: 1.0,
      });
    }

    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Set direction safely avoiding 180-deg instant turns
  const handleDirectionChange = useCallback((newDir: Direction) => {
    setGameState(prev => {
      if (prev.isPaused || prev.isGameOver) return prev;
      
      const currentDir = prev.direction;
      let isValidChange = false;

      if (newDir === 'UP' && currentDir !== 'DOWN') isValidChange = true;
      if (newDir === 'DOWN' && currentDir !== 'UP') isValidChange = true;
      if (newDir === 'LEFT' && currentDir !== 'RIGHT') isValidChange = true;
      if (newDir === 'RIGHT' && currentDir !== 'LEFT') isValidChange = true;

      if (isValidChange) {
        return { ...prev, nextDirection: newDir };
      }
      return prev;
    });
  }, []);

  // Reset core game state
  const handleReset = useCallback(() => {
    setGameState(prev => {
      const freshSnake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 },
      ];
      return {
        ...prev,
        segments: freshSnake,
        direction: 'UP',
        nextDirection: 'UP',
        food: getRandomPosition(freshSnake),
        specialFood: null,
        specialFoodTimeLeft: 0,
        foodType: 'normal',
        score: 0,
        isGameOver: false,
        isPaused: false,
        speed: hyperSpeed ? 75 : 130,
        scoreMultipler: 1,
      };
    });
  }, [getRandomPosition, hyperSpeed]);

  // Main game logic step runner
  const performGameStep = useCallback(() => {
    setGameState(prev => {
      if (prev.isPaused || prev.isGameOver) return prev;

      // Unify nextDirection into direction for this frame
      const currentDir = prev.nextDirection;
      const head = prev.segments[0];
      let newHead: Position = { x: head.x, y: head.y };

      switch (currentDir) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Check collision with outer boundaries (Self-wrapping enabled or rigid collision depending on powerup)
      const hasWallShield = prev.foodType === 'shield';
      let targetHead = { ...newHead };

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        if (hasWallShield || infiniteMode) {
          // Wrapped around safely
          targetHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
          targetHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;
        } else {
          // Dead on crash
          return { ...prev, isGameOver: true, isPaused: true };
        }
      }

      // Self collision check
      const selfCollision = prev.segments.some((seg, idx) => {
        // Skull protection check: shield also protects from biting body at first segment
        if (idx === 0) return false;
        return seg.x === targetHead.x && seg.y === targetHead.y;
      });

      if (selfCollision && !hasWallShield) {
        return { ...prev, isGameOver: true, isPaused: true };
      }

      // Build updated body segment queue
      const updatedSegments = [targetHead, ...prev.segments];
      
      // Determine if food is eaten
      let isEaten = false;
      let isSpecialEaten = false;
      let nextFood = prev.food;
      let nextSpecial = prev.specialFood;
      let nextSpecialTime = prev.specialFoodTimeLeft;
      let nextFoodType = prev.foodType;
      let nextScore = prev.score;
      let nextSpeed = prev.speed;
      let scoreToAdd = 0;

      // Normal Food
      if (targetHead.x === prev.food.x && targetHead.y === prev.food.y) {
        isEaten = true;
        scoreToAdd = 10 * prev.scoreMultipler;
        nextFood = getRandomPosition(updatedSegments);
      } 
      // Special Food
      else if (prev.specialFood && targetHead.x === prev.specialFood.x && targetHead.y === prev.specialFood.y) {
        isSpecialEaten = true;
        
        switch (prev.foodType) {
          case 'speed':
            scoreToAdd = 30;
            nextSpeed = Math.max(70, prev.speed - 30); // Faster speed boost
            break;
          case 'slow':
            scoreToAdd = 20;
            nextSpeed = Math.min(220, prev.speed + 30); // Mellow slow-down
            break;
          case 'shield':
            scoreToAdd = 25;
            break;
          default:
            scoreToAdd = 15;
        }
        
        nextSpecial = null;
        nextSpecialTime = 0;
      }

      // Tick down special food timer
      if (nextSpecial && nextSpecialTime > 0) {
        nextSpecialTime -= 1;
        if (nextSpecialTime === 0) {
          nextSpecial = null;
          nextFoodType = 'normal';
        }
      }

      // If nothing has been eaten, remove tail segment. Else, grow snake size!
      if (isEndingFoodEaten(isEaten, isSpecialEaten)) {
        // Increase score and trigger animations
        nextScore += scoreToAdd;
        const theme = getThemeColors();
        const triggerX = isEaten ? prev.food.x : (prev.specialFood?.x || 0);
        const triggerY = isEaten ? prev.food.y : (prev.specialFood?.y || 0);
        spawnParticles(triggerX, triggerY, theme.secondary);

        // Periodically spawn a flash special power food
        if (Math.random() > 0.60 && !nextSpecial) {
          const types: ('speed' | 'slow' | 'shield')[] = ['speed', 'slow', 'shield'];
          nextFoodType = types[Math.floor(Math.random() * types.length)];
          nextSpecial = getRandomPosition(updatedSegments);
          nextSpecialTime = 30; // Lasts 30 clock ticks
        }
      } else {
        updatedSegments.pop();
      }

      // Highscore update on threshold crossing
      let nextHighScore = prev.highScore;
      if (nextScore > prev.highScore) {
        nextHighScore = nextScore;
        localStorage.setItem('neon_snake_highscore', nextHighScore.toString());
      }

      return {
        ...prev,
        segments: updatedSegments,
        direction: currentDir,
        food: nextFood,
        specialFood: nextSpecial,
        specialFoodTimeLeft: nextSpecialTime,
        foodType: nextSpecial ? nextFoodType : 'normal',
        score: nextScore,
        highScore: nextHighScore,
        speed: nextSpeed,
      };
    });
  }, [getRandomPosition, spawnParticles, getThemeColors, infiniteMode]);

  const isEndingFoodEaten = (a: boolean, b: boolean) => a || b;

  // React on keystrokes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        handleDirectionChange('UP');
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        handleDirectionChange('DOWN');
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault();
        handleDirectionChange('LEFT');
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault();
        handleDirectionChange('RIGHT');
      } else if (key === ' ' || key === 'p' || key === 'P') {
        e.preventDefault();
        setGameState(prev => {
          if (prev.isGameOver) {
            handleReset();
            return prev;
          }
          return { ...prev, isPaused: !prev.isPaused };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDirectionChange, handleReset]);

  // Game internal timer: runs only if NOT syncing to music beats
  useEffect(() => {
    if (gameState.isPaused || gameState.isGameOver || beatSyncEnabled) {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
      return;
    }

    gameIntervalRef.current = window.setInterval(() => {
      performGameStep();
    }, gameState.speed);

    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    };
  }, [gameState.isPaused, gameState.isGameOver, gameState.speed, beatSyncEnabled, performGameStep]);

  // Synchronize tick step rate specifically to background music beats!
  useEffect(() => {
    if (!beatSyncEnabled || !isMusicPlaying || gameState.isPaused || gameState.isGameOver) return;

    // Trigger step only when the music step index progresses
    const curIndex = stepIndex;
    if (curIndex !== lastStepCount.current) {
      lastStepCount.current = curIndex;
      
      // Step game every 2 steps of chiptune / outrun rhythm
      if (curIndex % 2 === 0) {
        performGameStep();
      }
    }
  }, [beatSyncEnabled, isMusicPlaying, stepIndex, gameState.isPaused, gameState.isGameOver, performGameStep]);

  // HTML5 Screen drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400; // Fixed inside logical sizing
    canvas.width = size;
    canvas.height = size;

    const cell = size / GRID_SIZE;
    const theme = getThemeColors();

    const drawGrid = () => {
      // Clear with dark tech radial color
      ctx.fillStyle = '#030712'; // deep slate space black
      ctx.fillRect(0, 0, size, size);

      // Grid vertical bars
      ctx.strokeStyle = theme.gridLine;
      ctx.lineWidth = 1;
      for (let i = 0; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size, i * cell);
        ctx.stroke();
      }
    };

    const drawSnake = () => {
      ctx.save();
      
      gameState.segments.forEach((seg, idx) => {
        const isHead = idx === 0;
        
        ctx.shadowBlur = isHead ? 15 : 8;
        ctx.shadowColor = theme.primary;
        
        // Draw segment rounded square
        ctx.fillStyle = isHead ? theme.snakeHead : theme.snakeBody;
        
        // Slightly smaller body parts for visual flow
        const padding = isHead ? 1 : 2;
        const rSize = cell - padding * 2;
        const rx = seg.x * cell + padding;
        const ry = seg.y * cell + padding;

        ctx.beginPath();
        ctx.roundRect(rx, ry, rSize, rSize, isHead ? 5 : 3);
        ctx.fill();

        // Draw cute little glowing eyes on the snake head
        if (isHead) {
          ctx.fillStyle = '#000000';
          ctx.shadowBlur = 0;
          
          let ex1 = 0, ey1 = 0, ex2 = 0, ey2 = 0;
          const eDiff = cell * 0.25;

          switch (gameState.direction) {
            case 'UP':
              ex1 = rx + cell * 0.25; ey1 = ry + cell * 0.25;
              ex2 = rx + cell * 0.65; ey2 = ry + cell * 0.25;
              break;
            case 'DOWN':
              ex1 = rx + cell * 0.25; ey1 = ry + cell * 0.65;
              ex2 = rx + cell * 0.65; ey2 = ry + cell * 0.65;
              break;
            case 'LEFT':
              ex1 = rx + cell * 0.25; ey1 = ry + cell * 0.25;
              ex2 = rx + cell * 0.25; ey2 = ry + cell * 0.65;
              break;
            case 'RIGHT':
              ex1 = rx + cell * 0.65; ey1 = ry + cell * 0.25;
              ex2 = rx + cell * 0.65; ey2 = ry + cell * 0.65;
              break;
          }

          ctx.beginPath();
          ctx.arc(ex1, ey1, 2, 0, Math.PI * 2);
          ctx.arc(ex2, ey2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    };

    const drawFood = () => {
      ctx.save();
      
      const { food, specialFood, foodType } = gameState;

      // 1. Draw Normal Food (Green glowing orb)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22c55e';
      ctx.fillStyle = '#4ade80';

      ctx.beginPath();
      ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell / 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Golden inner core
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell / 6, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Special Bonus Power Food if active
      if (specialFood) {
        let fColor = '#eab308'; // Default yellow
        let glowColor = 'rgba(234, 179, 8, 0.8)';
        
        if (foodType === 'slow') {
          fColor = '#3b82f6'; // Cyan blue slow
          glowColor = 'rgba(59, 130, 246, 0.8)';
        } else if (foodType === 'shield') {
          fColor = '#a855f7'; // Purple wraparound shield
          glowColor = 'rgba(168, 85, 247, 0.8)';
        }

        // Flashing animation pace
        const speedWave = Math.sin(Date.now() * 0.01) * 3;
        ctx.shadowBlur = 15 + speedWave;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = fColor;

        // Draw diamond-star shape for special food
        const cx = specialFood.x * cell + cell / 2;
        const cy = specialFood.y * cell + cell / 2;
        const r = cell / 2.3;

        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();

        // Inner glowing white star
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, r / 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Show progress ring for special food time
        ctx.strokeStyle = fColor;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        const percentLeft = gameState.specialFoodTimeLeft / 30;
        ctx.arc(cx, cy, r * 1.2, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2) * percentLeft);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Particles animator engine inside game grid loop
    const updateAndDrawParticles = () => {
      if (particles.length === 0) return;

      ctx.save();
      const nextParticles: Particle[] = [];

      particles.forEach(p => {
        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96; // drag friction
        p.vy *= 0.96;
        p.life -= 0.03; // fading life
        p.alpha = Math.max(0, p.life);

        if (p.life > 0) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;

          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();

          nextParticles.push(p);
        }
      });

      ctx.restore();
      
      // Update asynchronously using state triggers
      if (nextParticles.length !== particles.length) {
        setParticles(nextParticles);
      }
    };

    drawGrid();
    drawFood();
    drawSnake();
    updateAndDrawParticles();

  }, [gameState, getThemeColors, particles, currentTrackColor]);

  return (
    <div className="flex flex-col items-center justify-between h-full w-full bg-black border-2 border-fuchsia-500 rounded overflow-hidden shadow-[0_0_25px_rgba(255,0,127,0.3)] p-4 lg:p-6" id="snake-game-card">
      
      {/* Game Head Metrics bar with raw cyberpunk fonts */}
      <div className="w-full flex items-center justify-between mb-4 bg-black px-4 py-2.5 border-2 border-cyan-500/60 rounded-none shadow-[0_0_10px_rgba(0,240,255,0.15)]" id="snake-game-metrics">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest font-bold uppercase">// BIT_MARK_SCALE</span>
            <span className="text-3xl md:text-4xl font-black font-digital glitch-text tracking-widest select-none text-cyan-400 drop-shadow-[0_0_10px_rgba(0,240,255,0.7)]">
              {String(gameState.score).padStart(4, '0')}
            </span>
          </div>
          {gameState.foodType !== 'normal' && (
            <span className="text-[9px] font-mono font-black px-2 py-0.5 border uppercase self-center animate-pulse flex items-center gap-1 bg-fuchsia-950 text-fuchsia-400 border-fuchsia-500">
              <Zap size={8} /> {gameState.foodType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* Highscore details */}
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest font-bold flex items-center gap-1 uppercase">
              <Trophy size={10} className="text-fuchsia-500" /> // ARCHIVE_MAX
            </span>
            <span className="text-2xl font-black font-digital text-fuchsia-400 tracking-widest drop-shadow-[0_0_8px_rgba(255,0,127,0.6)] select-none">
              {String(gameState.highScore).padStart(4, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Terminal screen with animated vignette glitch shader overlays */}
      <div className="relative aspect-square w-full max-w-[340px] md:max-w-[370px] border-2 border-cyan-500 rounded bg-black overflow-hidden group shadow-[0_0_15px_rgba(1,240,255,0.2)]" id="game-monitor-container">
        {/* Glow overlay grid lines */}
        <div className="absolute inset-0 pointer-events-none border border-fuchsia-500/15 mix-blend-screen bg-radial-vignette opacity-30 z-20" />

        <canvas
          ref={canvasRef}
          id="snake-canvas"
          className="w-full h-full block"
          onClick={() => {
            if (gameState.isGameOver) handleReset();
            else if (gameState.isPaused) setGameState(p => ({ ...p, isPaused: false }));
          }}
        />

        {/* 1. Pause Screen State with Glitch aesthetic */}
        {gameState.isPaused && !gameState.isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 text-center z-20 animate-fade-in" id="paused-overlay">
            <div className="p-4 bg-fuchsia-500/10 border-2 border-fuchsia-500 animate-pulse mb-3 shadow-[0_0_15px_rgba(255,0,127,0.5)]">
              <Gamepad2 className="text-fuchsia-500 w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-fuchsia-400 mb-2 font-mono tracking-widest uppercase glitch-text">
              GRID_MATRIX_HALTED
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-5 font-mono leading-tight">
              SENSORY GRID DISENGAGED. MANIPULATE VECTORS USING ARROWS OR WASD COMPLIANT KEYS. ACCUMULATE CYBERNETIC EMISSIONS FOR CORE HEALING.
            </p>
            <button
              id="start-button-overlay"
              onClick={() => setGameState(p => ({ ...p, isPaused: false }))}
              className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 border-2 border-fuchsia-500 font-mono text-xs font-black uppercase tracking-widest text-black transition duration-150 shadow-[0_4px_12px_rgba(0,240,255,0.5)] cursor-pointer active:translate-y-0.5"
            >
              <Play size={12} fill="currentColor" className="mr-1 inline" /> INIT_VECTOR_GRID
            </button>
          </div>
        )}

        {/* 2. Game Over Screen State with Glitch Art specs */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 text-center z-20" id="gameover-overlay">
            <div className="w-12 h-12 border-2 border-fuchsia-500 bg-fuchsia-950 flex items-center justify-center text-fuchsia-400 animate-bounce mb-3 shadow-[0_0_15px_rgba(255,0,127,0.8)]">
              <Sparkles size={20} />
            </div>
            <h3 className="text-2xl font-black font-mono tracking-widest text-fuchsia-500 uppercase glitch-text">
              CORE_CRASH_REPORTED
            </h3>
            <p className="text-xs font-mono text-cyan-400 mb-4 uppercase">
              // REASON: COLLISION_OUT_OF_SPECS
            </p>
            <div className="bg-black border-2 border-cyan-400 p-3 mb-5 w-48 font-mono">
              <div className="text-[10px] text-zinc-400 text-left flex justify-between">
                <span>GRID SCORE:</span>
                <span className="text-cyan-400 font-black">{gameState.score}</span>
              </div>
              <div className="text-[10px] text-zinc-400 text-left flex justify-between mt-1">
                <span>HISTORIC MAX:</span>
                <span className="text-fuchsia-400 font-black">{gameState.highScore}</span>
              </div>
            </div>
            <button
              id="retry-button-overlay"
              onClick={handleReset}
              className="px-6 py-2.5 font-mono text-xs uppercase font-black tracking-widest text-black bg-fuchsia-500 hover:bg-fuchsia-400 border-2 border-cyan-400 transition cursor-pointer shadow-[0_0_15px_rgba(255,0,127,0.8)] flex items-center gap-2"
            >
              <RotateCcw size={13} /> RE-INJECT_COMMANDS
            </button>
          </div>
        )}
      </div>

      {/* Sync Toggle & Control switches using rough cyberpunk aesthetics */}
      <div className="w-full flex flex-col gap-3 mt-4" id="game-controls-panel">
        <div className="flex items-center justify-between text-xs bg-black p-2.5 border border-cyan-500/40 hover:border-cyan-400 transition-colors">
          <div className="flex gap-2 items-center">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-none opacity-75 ${
                beatSyncEnabled && isMusicPlaying ? 'bg-fuchsia-400' : 'bg-zinc-800'
              }`}></span>
              <span className={`relative inline-flex rounded-none h-2 w-2 ${
                beatSyncEnabled && isMusicPlaying ? 'bg-fuchsia-500' : 'bg-zinc-700'
              }`}></span>
            </span>
            <span className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest">BPM STEP SYNC INTERFERENCE</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="beat-sync-checkbox"
              checked={beatSyncEnabled}
              onChange={(e) => setBeatSyncEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-900 border border-cyan-500/40 rounded-none peer peer-checked:bg-fuchsia-500 relative after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-cyan-400 after:w-3.5 after:h-3.5 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-black" />
          </label>
        </div>

        {/* Dynamic Game Modes Options Row */}
        <div className="grid grid-cols-2 gap-2" id="snake-additional-modes">
          {/* Infinite wrapping mode switch */}
          <div className="flex items-center justify-between text-xs bg-black p-2 border border-fuchsia-500/40 hover:border-fuchsia-400 transition-colors">
            <div className="flex gap-2 items-center">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-none opacity-75 ${
                  infiniteMode ? 'bg-cyan-400' : 'bg-zinc-800'
                }`}></span>
                <span className={`relative inline-flex rounded-none h-2 w-2 ${
                  infiniteMode ? 'bg-cyan-400' : 'bg-zinc-700'
                }`}></span>
              </span>
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">LOOP_BYPASS</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="infinite-mode-checkbox"
                checked={infiniteMode}
                onChange={(e) => setInfiniteMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-zinc-900 border border-fuchsia-500/40 rounded-none peer peer-checked:bg-cyan-400 relative after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-fuchsia-500 after:w-2.5 after:h-2.5 after:transition-all peer-checked:after:translate-x-3.5 peer-checked:after:bg-black" />
            </label>
          </div>

          {/* Hyper drive starts speed mode */}
          <div className="flex items-center justify-between text-xs bg-black p-2 border border-fuchsia-500/40 hover:border-fuchsia-400 transition-colors">
            <div className="flex gap-2 items-center">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-none opacity-75 ${
                  hyperSpeed ? 'bg-fuchsia-400' : 'bg-zinc-800'
                }`}></span>
                <span className={`relative inline-flex rounded-none h-2 w-2 ${
                  hyperSpeed ? 'bg-fuchsia-450' : 'bg-zinc-700'
                }`}></span>
              </span>
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">HYPER_CLOCK</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="hyper-speed-checkbox"
                checked={hyperSpeed}
                onChange={(e) => {
                  setHyperSpeed(e.target.checked);
                  if (gameState.isPaused && !gameState.isGameOver) {
                    setGameState(prev => ({
                      ...prev,
                      speed: e.target.checked ? 75 : 130
                    }));
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-zinc-900 border border-fuchsia-500/40 rounded-none peer peer-checked:bg-fuchsia-550 relative after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-cyan-500 after:w-2.5 after:h-2.5 after:transition-all peer-checked:after:translate-x-3.5 peer-checked:after:bg-black" />
            </label>
          </div>
        </div>

        {beatSyncEnabled && !isMusicPlaying && (
          <p className="text-[9px] text-center text-fuchsia-400 font-mono animate-pulse uppercase tracking-widest">
            * TRIGGER COGNITIVE AUDIO HARMONICS TO SYNCHRONIZE MATRIX STEP VECTORS
          </p>
        )}

        {/* Directional Touch Keypad for Desktop-Iframe & Mobile Players */}
        <div className="grid grid-cols-3 gap-1 mx-auto w-36 mt-2" id="touch-controls-keypad">
          <div></div>
          <button
            id="touch-up"
            onClick={() => handleDirectionChange('UP')}
            className="flex items-center justify-center p-2.5 bg-black hover:bg-cyan-950/40 border-2 border-cyan-400 text-cyan-400 hover:text-white rounded-none active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.3)] transition"
            title="Move Up"
          >
            <ArrowUp size={16} />
          </button>
          <div></div>

          <button
            id="touch-left"
            onClick={() => handleDirectionChange('LEFT')}
            className="flex items-center justify-center p-2.5 bg-black hover:bg-cyan-950/40 border-2 border-cyan-400 text-cyan-400 hover:text-white rounded-none active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.3)] transition"
            title="Move Left"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center justify-center text-[10px] font-mono text-zinc-600 tracking-wider">GRID</div>
          <button
            id="touch-right"
            onClick={() => handleDirectionChange('RIGHT')}
            className="flex items-center justify-center p-2.5 bg-black hover:bg-cyan-950/40 border-2 border-cyan-400 text-cyan-400 hover:text-white rounded-none active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.3)] transition"
            title="Move Right"
          >
            <ArrowRight size={16} />
          </button>

          <div></div>
          <button
            id="touch-down"
            onClick={() => handleDirectionChange('DOWN')}
            className="flex items-center justify-center p-2.5 bg-black hover:bg-cyan-950/40 border-2 border-cyan-400 text-cyan-400 hover:text-white rounded-none active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.3)] transition"
            title="Move Down"
          >
            <ArrowDown size={16} />
          </button>
          <div></div>
        </div>
      </div>
    </div>
  );
}
