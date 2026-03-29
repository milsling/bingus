import { memo, useCallback } from "react";
import { Play, Pause, Heart, Music, Clock } from "lucide-react";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { useAudioPlayer } from "@/context/AudioPlayerContext";
import { formatTime } from "@/lib/waveform";
import { Link } from "wouter";
import type { BeatWithProducer } from "@shared/schema";

interface BeatCardProps {
  beat: BeatWithProducer;
  onFavorite?: (beatId: string) => void;
  onUseInSongBuilder?: (beat: BeatWithProducer) => void;
  showActions?: boolean;
}

export const BeatCard = memo(function BeatCard({
  beat,
  onFavorite,
  onUseInSongBuilder,
  showActions = true,
}: BeatCardProps) {
  const player = useAudioPlayer();
  const isCurrentBeat = player.currentBeat?.id === beat.id;
  const isPlaying = isCurrentBeat && player.isPlaying;
  const peaks = (beat.waveformData as number[]) || [];

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.playBeat(beat);
    }
  }, [isPlaying, player, beat]);

  return (
    <div className="glass-card rounded-2xl border border-border/30 overflow-hidden group hover:border-accent/30 transition-all duration-200">
      {/* Waveform area */}
      <div className="relative h-24 bg-black/20 cursor-pointer" onClick={handlePlay}>
        <div className="absolute inset-0 p-3">
          <WaveformVisualizer
            peaks={peaks}
            analyser={isCurrentBeat ? player.analyserNode : null}
            progress={isCurrentBeat ? (player.duration > 0 ? player.currentTime / player.duration : 0) : 0}
            isPlaying={isPlaying}
            height={72}
            variant="card"
          />
        </div>

        {/* Play overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center shadow-lg">
            {isPlaying ? (
              <Pause size={20} className="text-white" />
            ) : (
              <Play size={20} className="text-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Duration badge */}
        {beat.duration && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-xs text-white/80">
            <Clock size={10} />
            {formatTime(beat.duration)}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-3 space-y-2">
        {/* Title + Producer */}
        <div>
          <h3 className="text-sm font-semibold text-foreground truncate">{beat.title}</h3>
          <Link
            href={`/u/${beat.producer?.username}`}
            className="text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            {beat.producer?.username}
            {beat.producer?.producerVerified && (
              <span className="ml-1 text-amber-400">✓</span>
            )}
          </Link>
        </div>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {beat.bpm && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-border/20 text-[10px] font-mono text-muted-foreground">
              {beat.bpm} BPM
            </span>
          )}
          {beat.key && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-border/20 text-[10px] text-muted-foreground">
              {beat.key}
            </span>
          )}
          {beat.genre && (
            <span className="px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] text-accent">
              {beat.genre.replace("_", " ")}
            </span>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handlePlay}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs transition-colors"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? "Pause" : "Play"}
            </button>

            {onFavorite && (
              <button
                onClick={() => onFavorite(beat.id)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                  beat.isFavorited ? "text-red-400" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart size={14} fill={beat.isFavorited ? "currentColor" : "none"} />
              </button>
            )}

            {onUseInSongBuilder && (
              <button
                onClick={() => onUseInSongBuilder(beat)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                title="Use in Song Builder"
              >
                <Music size={14} />
              </button>
            )}

            {/* Play count */}
            <span className="ml-auto text-[10px] text-muted-foreground">
              {beat.plays > 0 ? `${beat.plays} plays` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
