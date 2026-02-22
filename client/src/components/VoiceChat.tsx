import { useState, useEffect, useCallback, useRef } from "react";
import { Room, RoomEvent, Track, RemoteTrackPublication, RemoteParticipant } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Phone, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatProps {
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  onStateChange?: (state: VoiceChatState) => void;
}

export type VoiceChatState = "idle" | "connecting" | "connected" | "speaking" | "listening" | "disconnected" | "error";

export default function VoiceChat({ onTranscript, onStateChange }: VoiceChatProps) {
  const [state, setState] = useState<VoiceChatState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  const updateState = useCallback((newState: VoiceChatState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const cleanup = useCallback(() => {
    // Clean up audio elements
    audioElementsRef.current.forEach(el => {
      el.pause();
      el.remove();
    });
    audioElementsRef.current = [];

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      updateState("connecting");
      setError(null);

      // Request microphone permission FIRST to trigger browser prompt
      let micStream: MediaStream | null = null;
      try {
        console.log("Requesting microphone permission...");
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✓ Microphone permission granted");
      } catch (micError: any) {
        console.error("Microphone permission denied:", micError);
        throw new Error("Microphone access denied. Please allow microphone access and try again.");
      }

      // Get LiveKit token from server
      const tokenRes = await fetch("/api/ai/voice/token", {
        method: "POST",
        credentials: "include",
      });

      if (!tokenRes.ok) {
        // Clean up mic stream if token fetch fails
        micStream?.getTracks().forEach(track => track.stop());
        const data = await tokenRes.json().catch(() => ({ error: "Failed to connect" }));
        throw new Error(data.error || "Failed to get voice token");
      }

      const { token, url, roomName } = await tokenRes.json();

      // Connect to LiveKit room
      const room = new Room();
      roomRef.current = room;

      await room.connect(url, token);
      console.log("✓ Connected to LiveKit room:", roomName);

      // Stop the test stream and let LiveKit manage the mic
      micStream?.getTracks().forEach(track => track.stop());
      
      // Enable microphone through LiveKit
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log("✓ Microphone enabled in LiveKit");
        updateState("listening");
      } catch (micError: any) {
        console.error("Failed to enable microphone in LiveKit:", micError);
        throw new Error("Could not enable microphone.");
      }

      // Handle incoming audio tracks from the AI agent
      room.on(RoomEvent.TrackSubscribed, (
        track: Track,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio) {
          console.log("✓ Received audio track from:", participant.identity);
          updateState("speaking");
          
          // Attach audio to play it
          const audioElement = track.attach();
          audioElementsRef.current.push(audioElement);
          audioElement.play().catch(err => {
            console.error("Failed to play audio:", err);
          });
          
          // Clean up when track ends
          track.on('ended', () => {
            audioElement.pause();
            audioElement.remove();
            audioElementsRef.current = audioElementsRef.current.filter(el => el !== audioElement);
            updateState("listening");
          });
        }
      });

      // Handle track unsubscribed
      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Audio) {
          console.log("Track ended");
          track.detach();
          updateState("listening");
        }
      });
      
      room.on(RoomEvent.Disconnected, () => {
        console.log('Room disconnected');
        updateState("disconnected");
      })
      
      cleanupRef.current = () => {
        room.disconnect();
      };

    } catch (error: any) {
      console.error("Voice chat error:", error);
      setError(error.message || "Failed to start voice chat");
      updateState("error");
      cleanup();
    }
  }, [cleanup, onTranscript, updateState]);

  const disconnect = useCallback(() => {
    cleanup();
    updateState("idle");
    setTranscript("");
    setError(null);
  }, [cleanup, updateState]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const isConnected = state === "connected" || state === "listening" || state === "speaking";
  const isLoading = state === "connecting";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Status Indicator */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-3 w-3 rounded-full transition-all",
            state === "idle" && "bg-gray-400",
            state === "connecting" && "bg-yellow-400 animate-pulse",
            state === "connected" && "bg-green-400",
            state === "listening" && "bg-blue-400 animate-pulse",
            state === "speaking" && "bg-purple-400 animate-pulse",
            state === "error" && "bg-red-400"
          )}
        />
        <span className="text-sm font-medium text-violet-100">
          {state === "idle" && "Ready to connect"}
          {state === "connecting" && "Connecting..."}
          {state === "connected" && "Connected"}
          {state === "listening" && "Listening..."}
          {state === "speaking" && "Ara speaking..."}
          {state === "disconnected" && "Disconnected"}
          {state === "error" && "Error"}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="w-full rounded-lg border border-violet-300/20 bg-black/35 px-4 py-3 text-sm text-violet-50">
          {transcript}
        </div>
      )}

      {/* Connect/Disconnect Button */}
      <Button
        onClick={isConnected ? disconnect : connect}
        disabled={isLoading}
        size="lg"
        className={cn(
          "relative h-16 w-16 rounded-full border-2 transition-all",
          isConnected
            ? "border-red-400/50 bg-red-500/20 hover:bg-red-500/30"
            : "border-green-400/50 bg-green-500/20 hover:bg-green-500/30"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-violet-100" />
        ) : isConnected ? (
          <PhoneOff className="h-6 w-6 text-red-200" />
        ) : (
          <Phone className="h-6 w-6 text-green-200" />
        )}
      </Button>

      {/* Instructions */}
      {!isConnected && !isLoading && (
        <p className="text-center text-xs text-violet-100/70">
          Click to start voice chat with Ara
        </p>
      )}
      {isConnected && (
        <p className="text-center text-xs text-violet-100/70">
          Speak naturally - Ara will respond automatically
        </p>
      )}
    </div>
  );
}
