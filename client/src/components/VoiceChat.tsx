import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, PhoneOff } from "lucide-react";
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
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  const updateState = useCallback((newState: VoiceChatState) => {
    setState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  const cleanup = useCallback(() => {
    console.log("Cleaning up voice chat...");
    
    // Stop all audio sources
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
      try { source.disconnect(); } catch (e) { /* ignore */ }
    });
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;

    // Disconnect audio processor
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) { /* ignore */ }
      processorRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) { /* ignore */ }
      wsRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      setTimeout(() => {
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
      }, 100);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      updateState("connecting");
      setError(null);

      // Request microphone
      console.log("Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        } 
      });
      console.log("✓ Microphone granted");
      mediaStreamRef.current = stream;

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Resume audio context (autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      console.log("✓ Audio context ready");

      // Connect to server WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/voice`;
      console.log("Connecting to:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log("✓ Connected");
        updateState("listening");

        // Set up microphone streaming
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = async (event) => {
        try {
          if (typeof event.data === 'string') {
            const msg = JSON.parse(event.data);
            
            if (msg.type === 'transcript') {
              const text = msg.text || '';
              if (msg.role === 'user') {
                console.log("You:", text);
                setTranscript(`You: ${text}`);
                onTranscript?.(text, "user");
              } else if (msg.role === 'assistant') {
                console.log("Orphie:", text);
                setTranscript(`Orphie: ${text}`);
                onTranscript?.(text, "assistant");
              }
            } else if (msg.type === 'ai_done') {
              setTimeout(() => {
                if (audioQueueRef.current.length === 0) {
                  updateState("listening");
                }
              }, 100);
            } else if (msg.type === 'error') {
              throw new Error(msg.message || "Server error");
            }
          } else if (event.data instanceof ArrayBuffer) {
            updateState("speaking");
            
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            
            try {
              const pcm16Data = new Int16Array(event.data);
              console.log("Received audio:", pcm16Data.length, "samples");
              
              const audioBuffer = audioContext.createBuffer(1, pcm16Data.length, 24000);
              const channelData = audioBuffer.getChannelData(0);
              
              for (let i = 0; i < pcm16Data.length; i++) {
                channelData[i] = pcm16Data[i] / (pcm16Data[i] < 0 ? 0x8000 : 0x7FFF);
              }

              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              
              const gainNode = audioContext.createGain();
              gainNode.gain.value = 1.0;
              
              source.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              const now = audioContext.currentTime;
              const startTime = Math.max(now, nextPlayTimeRef.current);
              
              source.start(startTime);
              nextPlayTimeRef.current = startTime + audioBuffer.duration;
              
              source.onended = () => {
                try {
                  source.disconnect();
                  gainNode.disconnect();
                } catch (e) { /* ignore */ }
                
                audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
                
                if (audioQueueRef.current.length === 0) {
                  setTimeout(() => {
                    if (audioQueueRef.current.length === 0) {
                      updateState("listening");
                    }
                  }, 100);
                }
              };

              audioQueueRef.current.push(source);
              console.log("✓ Audio playing");
            } catch (audioError: any) {
              console.error("Audio error:", audioError);
            }
          }
        } catch (err: any) {
          console.error("Message error:", err);
        }
      };

      ws.onerror = () => {
        setError("Connection error");
        updateState("error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (state !== "idle" && state !== "error") {
          updateState("disconnected");
        }
      };

    } catch (error: any) {
      console.error("Connect error:", error);
      let msg = "Failed to start";
      
      if (error.name === 'NotAllowedError') {
        msg = "Microphone access denied";
      } else if (error.message) {
        msg = error.message;
      }
      
      setError(msg);
      updateState("error");
      cleanup();
    }
  }, [cleanup, onTranscript, updateState, state]);

  const disconnect = useCallback(() => {
    cleanup();
    updateState("idle");
    setTranscript("");
    setError(null);
  }, [cleanup, updateState]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const isConnected = state === "connected" || state === "listening" || state === "speaking";
  const isLoading = state === "connecting";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-3 w-3 rounded-full transition-all",
            state === "idle" && "bg-gray-400",
            state === "connecting" && "bg-yellow-400 animate-pulse",
            state === "connected" && "bg-green-400",
            state === "listening" && "bg-blue-400 animate-pulse",
            state === "speaking" && "bg-purple-400 animate-pulse",
            state === "disconnected" && "bg-gray-400",
            state === "error" && "bg-red-400"
          )}
        />
        <span className="text-sm font-medium text-violet-100">
          {state === "idle" && "Ready"}
          {state === "connecting" && "Connecting..."}
          {state === "connected" && "Connected"}
          {state === "listening" && "Listening..."}
          {state === "speaking" && "Orphie speaking..."}
          {state === "disconnected" && "Disconnected"}
          {state === "error" && "Error"}
        </span>
      </div>

      {error && (
        <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {transcript && (
        <div className="w-full rounded-lg border border-violet-300/20 bg-black/35 px-4 py-3 text-sm text-violet-50">
          {transcript}
        </div>
      )}

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

      {!isConnected && !isLoading && (
        <p className="text-center text-xs text-violet-100/70">
          Click to start voice chat
        </p>
      )}
      {isConnected && (
        <p className="text-center text-xs text-violet-100/70">
          Speak naturally
        </p>
      )}
    </div>
  );
}
