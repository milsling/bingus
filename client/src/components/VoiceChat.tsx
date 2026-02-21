import { useState, useEffect, useCallback, useRef } from "react";
import { Room, RoomEvent } from "livekit-client";
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
  const wsRef = useRef<WebSocket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const updateState = useCallback((newState: VoiceChatState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
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

      // Get LiveKit token from server
      const tokenRes = await fetch("/api/ai/voice/token", {
        method: "POST",
        credentials: "include",
      });

      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({ error: "Failed to connect" }));
        throw new Error(data.error || "Failed to get voice token");
      }

      const { token, url, roomName } = await tokenRes.json();

      // Connect to LiveKit room
      const room = new Room();
      roomRef.current = room;

      await room.connect(url, token);
      console.log("✓ Connected to LiveKit room:", roomName);

      // Connect to xAI Voice Agent API
      const xaiApiKey = process.env.XAI_API_KEY;
      if (!xaiApiKey) {
        throw new Error("XAI_API_KEY not configured");
      }

      const ws = new WebSocket("wss://api.x.ai/v1/realtime", {
        headers: {
          Authorization: `Bearer ${xaiApiKey}`,
        },
      });

      // Note: Browser WebSocket doesn't support headers, 
      // so in production you'd need a server-side proxy or ephemeral tokens
      // For now, we'll use the direct LiveKit approach with xAI plugin

      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✓ Connected to xAI Voice API");
        updateState("connected");

        // Configure session
        const config = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "Ara",
            instructions: "You are Ara, a hip-hop focused AI assistant for orphanbars.space. Help users with rap bars, wordplay, rhymes, and lyrical analysis. Be conversational and encouraging.",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        };
        ws.send(JSON.stringify(config));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "session.created") {
          console.log("✓ xAI session created");
        } else if (data.type === "conversation.item.input_audio_transcription.completed") {
          const userText = data.transcript;
          setTranscript(userText);
          onTranscript?.(userText, "user");
          updateState("speaking");
        } else if (data.type === "response.audio_transcript.delta") {
          setTranscript((prev) => prev + data.delta);
        } else if (data.type === "response.audio_transcript.done") {
          onTranscript?.(data.transcript, "assistant");
          updateState("listening");
        } else if (data.type === "error") {
          console.error("xAI error:", data.error);
          setError(data.error.message || "Voice error occurred");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error");
        updateState("error");
      };

      ws.onclose = () => {
        console.log("xAI connection closed");
        updateState("disconnected");
      };

      cleanupRef.current = () => {
        ws.close();
        room.disconnect();
      };

      // Start with listening state
      updateState("listening");

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
