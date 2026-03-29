import { useRef, useEffect, useCallback, memo } from "react";

interface WaveformVisualizerProps {
  peaks?: number[];
  analyser?: AnalyserNode | null;
  progress: number; // 0-1
  isPlaying: boolean;
  onSeek?: (progress: number) => void;
  height?: number;
  variant?: "full" | "mini" | "card";
  className?: string;
}

/**
 * Canvas-based waveform visualizer with two modes:
 * 1. Static: Renders pre-computed peaks, highlights played portion
 * 2. Live: When playing, overlays real-time frequency data from AnalyserNode
 */
export const WaveformVisualizer = memo(function WaveformVisualizer({
  peaks = [],
  analyser = null,
  progress,
  isPlaying,
  onSeek,
  height = 48,
  variant = "full",
  className = "",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const frequencyDataRef = useRef<Uint8Array | null>(null);

  // Get accent color from CSS variable
  const getAccentColor = useCallback(() => {
    const root = document.documentElement;
    const accent = getComputedStyle(root).getPropertyValue("--accent-color").trim();
    if (accent) {
      return `hsl(${accent})`;
    }
    return "hsl(265 70% 60%)";
  }, []);

  const getAccentColorAlpha = useCallback(
    (alpha: number) => {
      const root = document.documentElement;
      const accent = getComputedStyle(root).getPropertyValue("--accent-color").trim();
      if (accent) {
        return `hsl(${accent} / ${alpha})`;
      }
      return `hsl(265 70% 60% / ${alpha})`;
    },
    [],
  );

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width * dpr;
    const h = rect.height * dpr;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    const accentColor = getAccentColor();
    const accentDim = getAccentColorAlpha(0.3);
    const accentGlow = getAccentColorAlpha(0.15);

    const numBars = variant === "mini" ? Math.min(peaks.length, 40) : variant === "card" ? Math.min(peaks.length, 60) : peaks.length;
    const barGap = variant === "mini" ? 1.5 * dpr : 2 * dpr;
    const barWidth = numBars > 0 ? (w - barGap * (numBars - 1)) / numBars : 2 * dpr;
    const maxBarHeight = h * 0.85;
    const centerY = h / 2;

    // Resample peaks if needed
    const displayPeaks =
      numBars !== peaks.length && peaks.length > 0
        ? Array.from({ length: numBars }, (_, i) => {
            const idx = Math.floor((i / numBars) * peaks.length);
            return peaks[idx] ?? 0;
          })
        : peaks;

    // Get live frequency data if playing and analyser exists
    let freqData: Uint8Array | null = null;
    if (isPlaying && analyser) {
      if (!frequencyDataRef.current || frequencyDataRef.current.length !== analyser.frequencyBinCount) {
        frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      analyser.getByteFrequencyData(frequencyDataRef.current);
      freqData = frequencyDataRef.current;
    }

    // Draw waveform bars
    for (let i = 0; i < numBars; i++) {
      const x = i * (barWidth + barGap);
      const peakVal = displayPeaks[i] ?? 0.05;

      // Blend static peak with live frequency data when playing
      let barVal = peakVal;
      if (freqData && freqData.length > 0) {
        const freqIdx = Math.floor((i / numBars) * freqData.length);
        const freqVal = (freqData[freqIdx] ?? 0) / 255;
        // Blend: 40% static + 60% live when playing
        barVal = peakVal * 0.4 + freqVal * 0.6;
      }

      const barHeight = Math.max(2 * dpr, barVal * maxBarHeight);
      const isPlayed = i / numBars <= progress;

      // Top half
      ctx.fillStyle = isPlayed ? accentColor : accentDim;
      ctx.beginPath();
      const radius = Math.min(barWidth / 2, 2 * dpr);
      const topY = centerY - barHeight / 2;
      const bottomY = centerY + barHeight / 2;

      ctx.roundRect(x, topY, barWidth, barHeight, radius);
      ctx.fill();

      // Glow for played bars when playing
      if (isPlayed && isPlaying) {
        ctx.fillStyle = accentGlow;
        ctx.beginPath();
        ctx.roundRect(x - dpr, topY - dpr, barWidth + 2 * dpr, barHeight + 2 * dpr, radius + dpr);
        ctx.fill();
      }
    }

    // Playhead line
    if (progress > 0 && progress < 1) {
      const playX = progress * w;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, h);
      ctx.stroke();
    }

    // Continue animation loop when playing
    if (isPlaying && analyser) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [peaks, progress, isPlaying, analyser, variant, getAccentColor, getAccentColorAlpha]);

  // Start/stop animation loop
  useEffect(() => {
    if (isPlaying && analyser) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(rafRef.current);
      draw(); // Draw static state
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, analyser, draw]);

  // Redraw on peaks/progress change
  useEffect(() => {
    if (!isPlaying || !analyser) {
      draw();
    }
  }, [peaks, progress, draw, isPlaying, analyser]);

  // Handle click-to-seek
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      onSeek(pct);
    },
    [onSeek],
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${onSeek ? "cursor-pointer" : ""} ${className}`}
      style={{ height }}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
});
