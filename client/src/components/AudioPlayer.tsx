import { useAudioPlayerOptional } from "@/context/AudioPlayerContext";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { formatTime } from "@/lib/waveform";
import { Play, Pause, SkipBack, SkipForward, Repeat, X, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useCallback } from "react";
import { Link } from "wouter";

export function AudioPlayer() {
  const player = useAudioPlayerOptional();
  const [expanded, setExpanded] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  if (!player || !player.currentBeat) return null;

  const { currentBeat, isPlaying, currentTime, duration, volume, playbackRate, isLooping, analyserNode } = player;
  const progress = duration > 0 ? currentTime / duration : 0;
  const peaks = (currentBeat.waveformData as number[]) || [];

  const handleSeek = useCallback(
    (pct: number) => {
      player.seek(pct * duration);
    },
    [player, duration],
  );

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const nextSpeed = () => {
    const idx = speedOptions.indexOf(playbackRate);
    const next = speedOptions[(idx + 1) % speedOptions.length];
    player.setPlaybackRate(next);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1050] md:bottom-0">
      {/* Spacer so content doesn't hide behind player */}
      <div
        className={`floating-bar border-t border-border/30 transition-all duration-300 ${expanded ? "pb-4" : ""}`}
      >
        {/* Mini player (always visible) */}
        <div className="flex items-center gap-3 px-3 py-2 md:px-6">
          {/* Cover art / placeholder */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-accent/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {currentBeat.coverArtUrl ? (
              <img src={currentBeat.coverArtUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                <span className="text-xs text-accent">♫</span>
              </div>
            )}
          </div>

          {/* Beat info */}
          <div className="flex-shrink-0 min-w-0 w-24 md:w-40">
            <p className="text-sm font-medium text-foreground truncate">{currentBeat.title}</p>
            <Link
              href={`/u/${currentBeat.producer?.username}`}
              className="text-xs text-muted-foreground hover:text-accent truncate block"
            >
              {currentBeat.producer?.username}
              {currentBeat.producer?.producerVerified && (
                <span className="ml-1 text-amber-400">✓</span>
              )}
            </Link>
          </div>

          {/* Waveform (desktop) */}
          <div className="hidden md:block flex-1 mx-4">
            <WaveformVisualizer
              peaks={peaks}
              analyser={analyserNode}
              progress={progress}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              height={36}
              variant="full"
            />
          </div>

          {/* Waveform (mobile mini) */}
          <div className="flex-1 md:hidden mx-1">
            <WaveformVisualizer
              peaks={peaks}
              analyser={analyserNode}
              progress={progress}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              height={28}
              variant="mini"
            />
          </div>

          {/* Time */}
          <span className="text-xs text-muted-foreground font-mono hidden md:block w-20 text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <button
              onClick={() => player.skipBackward(15)}
              className="hidden md:flex p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipBack size={16} />
            </button>

            <button
              onClick={() => (isPlaying ? player.pause() : player.resume())}
              className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 text-accent transition-colors"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <button
              onClick={() => player.skipForward(15)}
              className="hidden md:flex p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward size={16} />
            </button>

            {/* Loop */}
            <button
              onClick={player.toggleLoop}
              className={`hidden md:flex p-1.5 rounded-full hover:bg-white/10 transition-colors ${isLooping ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Repeat size={14} />
            </button>

            {/* Speed */}
            <button
              onClick={nextSpeed}
              className="hidden md:flex px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            >
              {playbackRate}x
            </button>

            {/* Volume (desktop) */}
            <div className="hidden md:flex items-center relative">
              <button
                onClick={() => setShowVolume(!showVolume)}
                className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              {showVolume && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-surface rounded-lg p-2 border border-border/30">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => player.setVolume(Number(e.target.value))}
                    className="w-20 h-1 accent-[hsl(var(--accent-color))]"
                    style={{ writingMode: "horizontal-tb" }}
                  />
                </div>
              )}
            </div>

            {/* Expand/collapse on mobile */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-muted-foreground"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>

            {/* Close */}
            <button
              onClick={player.stop}
              className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Expanded mobile controls */}
        {expanded && (
          <div className="md:hidden px-4 pt-2 space-y-3">
            {/* Full waveform */}
            <WaveformVisualizer
              peaks={peaks}
              analyser={analyserNode}
              progress={progress}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              height={48}
              variant="full"
            />

            {/* Time */}
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Full controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={player.toggleLoop}
                className={`p-2 rounded-full ${isLooping ? "text-accent" : "text-muted-foreground"}`}
              >
                <Repeat size={18} />
              </button>
              <button onClick={() => player.skipBackward(15)} className="p-2 text-foreground">
                <SkipBack size={20} />
              </button>
              <button
                onClick={() => (isPlaying ? player.pause() : player.resume())}
                className="p-3 rounded-full bg-accent/20 text-accent"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
              </button>
              <button onClick={() => player.skipForward(15)} className="p-2 text-foreground">
                <SkipForward size={20} />
              </button>
              <button
                onClick={nextSpeed}
                className="px-2 py-1 rounded text-sm font-mono text-muted-foreground"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 px-2">
              <VolumeX size={14} className="text-muted-foreground flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => player.setVolume(Number(e.target.value))}
                className="flex-1 h-1 accent-[hsl(var(--accent-color))]"
              />
              <Volume2 size={14} className="text-muted-foreground flex-shrink-0" />
            </div>

            {/* BPM / Key info */}
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              {currentBeat.bpm && (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-border/20">
                  {currentBeat.bpm} BPM
                </span>
              )}
              {currentBeat.key && (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-border/20">
                  {currentBeat.key}
                </span>
              )}
              {currentBeat.genre && (
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-border/20">
                  {currentBeat.genre.replace("_", " ")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
