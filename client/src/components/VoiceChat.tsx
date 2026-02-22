import { useState, useEffect, useCallback, useRef } from "react";
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
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const updateState = useCallback((newState: VoiceChatState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const cleanup = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Clean up audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      updateState("connecting");
      setError(null);

      // Request microphone permission
      console.log("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      console.log("✓ Microphone permission granted");
      mediaStreamRef.current = stream;

      // Get xAI API key from server (securely)
      const tokenRes = await fetch("/api/ai/voice/token", {
        method: "POST",
        credentials: "include",
      });

      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({ error: "Failed to connect" }));
        throw new Error(data.error || "Failed to get voice token");
      }

      const { apiKey } = await tokenRes.json();

      // Connect to xAI WebSocket
      const ws = new WebSocket("wss://api.x.ai/v1/realtime?model=grok-2-vision-1212");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✓ WebSocket connected");
        
        // Authenticate
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "ara",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }));

        // Send authorization
        ws.send(JSON.stringify({
          type: "session.update",
          session: {
            api_key: apiKey
          }
        }));

        updateState("listening");
        console.log("✓ Ready to listen");
      };

      // Set up audio playback
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElementRef.current = audioElement;

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Received:", data.type);

        if (data.type === "response.audio.delta") {
          // Play audio chunk
          updateState("speaking");
          const audioData = Uint8Array.from(atob(data.delta), c => c.charCodeAt(0));
          const audioBuffer = audioContext.createBuffer(1, audioData.length / 2, 24000);
          const channelData = audioBuffer.getChannelData(0);
          
          for (let i = 0; i < channelData.length; i++) {
            const int16 = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
            channelData[i] = int16 / 32768.0;
          }

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.start();
        } else if (data.type === "response.audio.done") {
          updateState("listening");
        } else if (data.type === "input_audio_buffer.speech_started") {
          console.log("Speech detected");
        } else if (data.type === "conversation.item.input_audio_transcription.completed") {
          console.log("User said:", data.transcript);
          setTranscript(`You: ${data.transcript}`);
          onTranscript?.(data.transcript, "user");
        } else if (data.type === "response.text.delta") {
          // Handle transcript from Ara
          console.log("Ara:", data.delta);
        } else if (data.type === "error") {
          console.error("xAI error:", data.error);
          throw new Error(data.error.message || "Voice API error");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error");
        updateState("error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        updateState("disconnected");
      };

      // Stream microphone audio to WebSocket
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }

          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
          ws.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

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
