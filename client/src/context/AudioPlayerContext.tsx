import { createContext, useContext, useCallback, useRef, useState, useEffect, type ReactNode } from "react";
import type { BeatWithProducer } from "@shared/schema";

interface AudioPlayerState {
  currentBeat: BeatWithProducer | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLooping: boolean;
}

interface AudioPlayerContextValue extends AudioPlayerState {
  analyserNode: AnalyserNode | null;
  playBeat: (beat: BeatWithProducer) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function useAudioPlayerOptional() {
  return useContext(AudioPlayerContext);
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AudioPlayerState>({
    currentBeat: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1,
    isLooping: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setState((s) => ({ ...s, currentTime: audio.currentTime }));
    };
    const handleLoadedMetadata = () => {
      setState((s) => ({ ...s, duration: audio.duration }));
    };
    const handleEnded = () => {
      setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));
    };
    const handlePlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const handlePause = () => setState((s) => ({ ...s, isPlaying: false }));

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(rafRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  // Connect Web Audio API nodes for analyser
  const ensureAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") return;

    const audio = audioRef.current;
    if (!audio) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;

    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    sourceRef.current = source;
    analyserRef.current = analyser;
  }, []);

  const playBeat = useCallback(
    (beat: BeatWithProducer) => {
      const audio = audioRef.current;
      if (!audio) return;

      // If same beat, just resume
      if (state.currentBeat?.id === beat.id && audio.src) {
        ensureAudioContext();
        if (audioContextRef.current?.state === "suspended") {
          audioContextRef.current.resume();
        }
        audio.play();
        // Increment play count
        fetch(`/api/beats/${beat.id}/play`, { method: "POST", credentials: "include" }).catch(() => {});
        return;
      }

      // New beat
      audio.src = beat.audioUrl;
      audio.volume = state.volume;
      audio.playbackRate = state.playbackRate;
      audio.loop = state.isLooping;

      ensureAudioContext();
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }

      audio.play().catch(() => {});

      setState((s) => ({
        ...s,
        currentBeat: beat,
        currentTime: 0,
        duration: beat.duration || 0,
        isPlaying: true,
      }));

      // Increment play count
      fetch(`/api/beats/${beat.id}/play`, { method: "POST", credentials: "include" }).catch(() => {});
    },
    [state.currentBeat?.id, state.volume, state.playbackRate, state.isLooping, ensureAudioContext],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    audioRef.current?.play();
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol));
    if (audioRef.current) audioRef.current.volume = v;
    setState((s) => ({ ...s, volume: v }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const toggleLoop = useCallback(() => {
    setState((s) => {
      const loop = !s.isLooping;
      if (audioRef.current) audioRef.current.loop = loop;
      return { ...s, isLooping: loop };
    });
  }, []);

  const skipForward = useCallback((seconds = 15) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + seconds, audioRef.current.duration);
    }
  }, []);

  const skipBackward = useCallback((seconds = 15) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - seconds, 0);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    setState((s) => ({
      ...s,
      currentBeat: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
        ...state,
        analyserNode: analyserRef.current,
        playBeat,
        pause,
        resume,
        seek,
        setVolume,
        setPlaybackRate,
        toggleLoop,
        skipForward,
        skipBackward,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}
