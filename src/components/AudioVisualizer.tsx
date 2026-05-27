/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { musicEngine } from '../audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  themeColor: string; // 'emerald' | 'magenta' | 'cyan'
}

export function AudioVisualizer({ isPlaying, themeColor }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Get color codes mapping the theme
    const getColorTheme = () => {
      switch (themeColor) {
        case 'magenta':
          return {
            primary: '#ff007f', // hot pink
            secondary: '#d946ef', // fuchsia
            glow: 'rgba(217, 70, 239, 0.4)',
            bg: 'rgba(217, 70, 239, 0.05)'
          };
        case 'cyan':
          return {
            primary: '#00f0ff', // bright cyan
            secondary: '#22d3ee', // light cyan
            glow: 'rgba(34, 211, 238, 0.4)',
            bg: 'rgba(34, 211, 238, 0.05)'
          };
        case 'emerald':
        default:
          return {
            primary: '#00f0ff', // bright cyan
            secondary: '#ff007f', // fuchsia magenta
            glow: 'rgba(0, 240, 255, 0.4)',
            bg: 'rgba(0, 240, 255, 0.05)'
          };
      }
    };

    const bufferLength = 64; // analyzer has fftSize = 128 (so 64 frequency bars)
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      // Clear the canvas
      ctx.clearRect(0, 0, w, h);

      const theme = getColorTheme();
      const analyser = musicEngine.getAnalyserNode();

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (w / bufferLength) * 1.4;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          // Normalize bar height
          const rawVal = dataArray[i];
          const percent = rawVal / 255;
          
          // Boost intermediate ranges slightly for a more full visual look
          const boostedPercent = Math.min(1.0, percent * 1.25);
          const barHeight = Math.max(2, boostedPercent * h * 0.88);

          // Glowing neon bar styling
          ctx.shadowBlur = 10;
          ctx.shadowColor = theme.primary;
          
          // Gradient fill
          const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
          gradient.addColorStop(0, theme.secondary);
          gradient.addColorStop(1, theme.primary);
          ctx.fillStyle = gradient;

          // Draw rounded topped rects
          const rx = x;
          const ry = h - barHeight;
          const rWidth = barWidth - 1.5;
          const rHeight = barHeight;

          // Drawing a rounded bar path
          ctx.beginPath();
          ctx.roundRect(rx, ry, rWidth, rHeight, [2, 2, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Draw idle sine-wave placeholder if paused
        ctx.shadowBlur = 0;
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        const time = Date.now() * 0.004;
        for (let x = 0; x < w; x++) {
          // Idle ambient sine wave
          const y = h / 2 + Math.sin(x * 0.03 + time) * 6;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, themeColor]);

  return (
    <div className="relative w-full h-16 rounded-none border-2 border-cyan-500/50 bg-black overflow-hidden shadow-[0_0_8px_rgba(0,240,255,0.2)]" id="audio-visualizer-container">
      <canvas
        ref={canvasRef}
        id="audio-visualizer-canvas"
        className="w-full h-full block"
      />
    </div>
  );
}
