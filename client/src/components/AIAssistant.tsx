import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, MicOff, Sparkles, Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";

const ARA_AUTOSPEAK_KEY = "ara-autospeak";
const ARA_LAUNCHER_VARIANT_KEY = "ara-launcher-variant";
const ARA_VOICE_MODE_KEY = "ara-voice-mode";
const ARA_REQUEST_TIMEOUT_MS = 20000;
const ARA_LONG_PRESS_MS = 900;
const ARA_UNHINGED_DURATION_MS = 2200;
const ARA_LAUNCHER_PARTICLES = [
  { left: "28%", top: "24%", delay: "0s", duration: "3.9s" },
  { left: "46%", top: "62%", delay: "0.7s", duration: "4.5s" },
  { left: "69%", top: "34%", delay: "1.3s", duration: "4.2s" },
] as const;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFloatingButton?: boolean;
  initialPrompt?: string;
}

type LauncherVariant = "pill" | "circle";
type MessageSource = "text" | "voice";

type AraStatusResponse = {
  ready: boolean;
  reason: "ok" | "chat_disabled" | "missing_api_key" | "upstream_error";
  chatEnabled: boolean;
  xaiConfigured: boolean;
  model: string;
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastError: {
    status?: number;
    message: string;
    body?: string;
    at: string;
  } | null;
};

export default function AIAssistant({ open, onOpenChange, hideFloatingButton = false, initialPrompt }: AIAssistantProps) {
  const { currentUser } = useBars();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasProcessedInitialPrompt, setHasProcessedInitialPrompt] = useState(false);
  const [isUnhinged, setIsUnhinged] = useState(false);
  const [launcherVariant, setLauncherVariant] = useState<LauncherVariant>(() => {
    if (typeof window === "undefined") return "pill";
    const stored = localStorage.getItem(ARA_LAUNCHER_VARIANT_KEY);
    return stored === "circle" ? "circle" : "pill";
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendMessageRef = useRef<(content: string, source?: MessageSource) => void>(() => {});
  const longPressTimeoutRef = useRef<number | null>(null);
  const unhingedTimeoutRef = useRef<number | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ARA_VOICE_MODE_KEY) === "true";
  });
  const [isVoiceTurnPending, setIsVoiceTurnPending] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(ARA_AUTOSPEAK_KEY);
    return stored === null ? true : stored === "true";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const canViewAraStatus = Boolean(currentUser?.isAdmin || currentUser?.isAdminPlus || currentUser?.isOwner);
  const [araStatus, setAraStatus] = useState<AraStatusResponse | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
      if (unhingedTimeoutRef.current !== null) {
        window.clearTimeout(unhingedTimeoutRef.current);
      }
    };
  }, []);

  const speakTTS = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev;
      localStorage.setItem(ARA_AUTOSPEAK_KEY, String(next));
      return next;
    });
  }, []);

  const toggleLauncherVariant = useCallback(() => {
    setLauncherVariant((prev) => {
      const next: LauncherVariant = prev === "pill" ? "circle" : "pill";
      localStorage.setItem(ARA_LAUNCHER_VARIANT_KEY, next);
      return next;
    });
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setVoiceModeEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(ARA_VOICE_MODE_KEY, String(next));
      if (next && !autoSpeak) {
        localStorage.setItem(ARA_AUTOSPEAK_KEY, "true");
        setAutoSpeak(true);
      }
      return next;
    });
  }, [autoSpeak]);

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setIsRecording(false);
      return;
    }
    try {
      recognition.stop();
    } finally {
      setIsRecording(false);
    }
  }, []);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecognition();
      return;
    }
    startRecognition();
  }, [isRecording, startRecognition, stopRecognition]);

  useEffect(() => {
    if (!isOpen) {
      setIsVoiceTurnPending(false);
      stopRecognition();
      stopTTS();
    }
  }, [isOpen, stopRecognition, stopTTS]);

  useEffect(() => {
    if (!voiceModeEnabled && isVoiceTurnPending) {
      setIsVoiceTurnPending(false);
    }
  }, [voiceModeEnabled, isVoiceTurnPending]);

  useEffect(() => {
    if (!isVoiceSupported && voiceModeEnabled) {
      localStorage.setItem(ARA_VOICE_MODE_KEY, "false");
      setVoiceModeEnabled(false);
    }
  }, [isVoiceSupported, voiceModeEnabled]);

  useEffect(() => {
    if (!ttsSupported && voiceModeEnabled) {
      localStorage.setItem(ARA_VOICE_MODE_KEY, "false");
      setVoiceModeEnabled(false);
    }
  }, [ttsSupported, voiceModeEnabled]);

  useEffect(() => {
    if (!isOpen || !isVoiceSupported) {
      if (isRecording) stopRecognition();
      return;
    }

    const shouldAutoListen =
      voiceModeEnabled &&
      !isLoading &&
      !isSpeaking &&
      !isVoiceTurnPending;

    if (shouldAutoListen && !isRecording) {
      startRecognition();
      return;
    }

    if (!shouldAutoListen && isRecording) {
      stopRecognition();
    }
  }, [
    isLoading,
    isOpen,
    isRecording,
    isSpeaking,
    isVoiceSupported,
    isVoiceTurnPending,
    startRecognition,
    stopRecognition,
    voiceModeEnabled,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    setIsVoiceSupported(supported);
    if (!supported) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript;
      if (typeof transcript === "string" && transcript.trim()) {
        const text = transcript.trim();
        setInput("");
        setIsVoiceTurnPending(true);
        sendMessageRef.current(text, "voice");
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        localStorage.setItem(ARA_VOICE_MODE_KEY, "false");
        setVoiceModeEnabled(false);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (isOpen && initialPrompt && !hasProcessedInitialPrompt && !isLoading) {
      setHasProcessedInitialPrompt(true);
      sendMessageWithContent(initialPrompt);
    }
  }, [isOpen, initialPrompt, hasProcessedInitialPrompt, isLoading]);

  useEffect(() => {
    if (!isOpen) {
      setHasProcessedInitialPrompt(false);
    }
  }, [isOpen]);

  const fetchAraStatus = useCallback(async () => {
    if (!canViewAraStatus) return;
    setIsStatusLoading(true);

    try {
      const res = await fetch("/api/ai/status", { credentials: "include" });
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const message = payload?.error || payload?.message || "Unable to load AI status.";
        throw new Error(message);
      }

      setAraStatus(payload as AraStatusResponse);
      setStatusError(null);
    } catch (error: any) {
      setStatusError(error?.message || "Unable to load AI status.");
    } finally {
      setIsStatusLoading(false);
    }
  }, [canViewAraStatus]);

  useEffect(() => {
    if (isOpen && canViewAraStatus) {
      void fetchAraStatus();
    }
  }, [isOpen, canViewAraStatus, fetchAraStatus]);

  const araStatusLabel = (() => {
    if (!canViewAraStatus) return "";
    if (isStatusLoading && !araStatus) return "Checking xAI...";
    if (statusError) return "Status unavailable";
    if (!araStatus) return "Status unknown";
    if (araStatus.ready) return "xAI OK";
    if (araStatus.reason === "chat_disabled") return "Chat disabled";
    if (araStatus.reason === "missing_api_key") return "API key missing";
    if (araStatus.lastError?.status === 429) return "Rate limited";
    if (araStatus.lastError?.status === 408) return "xAI timeout";
    return "xAI upstream error";
  })();

  const araStatusHint = (() => {
    if (!canViewAraStatus) return "";
    if (statusError) return statusError;
    if (!araStatus) return "";
    if (araStatus.reason === "missing_api_key") {
      return "Server has no XAI_API_KEY, so requests never reach xAI.";
    }
    if (araStatus.reason === "chat_disabled") {
      return "Ara chat is toggled off in AI settings.";
    }
    if (araStatus.lastError?.message) {
      const statusPrefix = araStatus.lastError.status ? `HTTP ${araStatus.lastError.status}: ` : "";
      const bodySnippet = araStatus.lastError.body
        ? ` ${araStatus.lastError.body}`.slice(0, 360)
        : "";
      return `${statusPrefix}${araStatus.lastError.message}${bodySnippet}`;
    }
    if (araStatus.lastSuccessAt) {
      return `Last xAI success: ${new Date(araStatus.lastSuccessAt).toLocaleString()}`;
    }
    return "";
  })();

  const sendMessageWithContent = useCallback(async (content: string, source: MessageSource = "text") => {
    if (!content.trim() || isLoading) return;
    
    const userMessage = content.trim();
    if (source === "voice") {
      setIsVoiceTurnPending(true);
    }
    if (isRecording) {
      stopRecognition();
    }
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ARA_REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessage }),
        signal: controller.signal,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const errorText =
          data?.response ||
          data?.message ||
          data?.error ||
          "Ara is unavailable right now. Please try again.";
        throw new Error(errorText);
      }

      const responseText =
        data?.response ||
        data?.message ||
        "Sorry, I couldn't respond.";
      setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
      if (autoSpeak && window.speechSynthesis) {
        speakTTS(responseText);
      }
    } catch (error: any) {
      const fallback =
        error?.name === "AbortError"
          ? "Ara took too long to respond. Please try again."
          : error?.message || "Sorry, I couldn't respond. Try again.";
      setMessages(prev => [...prev, { role: "assistant", content: fallback }]);
      if (autoSpeak && window.speechSynthesis) {
        speakTTS(fallback);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (source === "voice") {
        setIsVoiceTurnPending(false);
      }
      setIsLoading(false);
      if (canViewAraStatus) {
        void fetchAraStatus();
      }
    }
  }, [autoSpeak, canViewAraStatus, fetchAraStatus, isLoading, isRecording, speakTTS, stopRecognition]);

  useEffect(() => {
    sendMessageRef.current = (content: string, source: MessageSource = "text") => {
      void sendMessageWithContent(content, source);
    };
  }, [sendMessageWithContent]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    setInput("");
    await sendMessageWithContent(input, "text");
  };

  const clearLauncherLongPressTimer = useCallback(() => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const triggerUnhingedMode = useCallback(() => {
    setIsUnhinged(true);
    if (unhingedTimeoutRef.current !== null) {
      window.clearTimeout(unhingedTimeoutRef.current);
    }
    unhingedTimeoutRef.current = window.setTimeout(() => {
      setIsUnhinged(false);
      unhingedTimeoutRef.current = null;
    }, ARA_UNHINGED_DURATION_MS);
  }, []);

  const startLauncherLongPress = useCallback(() => {
    clearLauncherLongPressTimer();
    longPressTimeoutRef.current = window.setTimeout(() => {
      triggerUnhingedMode();
      longPressTimeoutRef.current = null;
    }, ARA_LONG_PRESS_MS);
  }, [clearLauncherLongPressTimer, triggerUnhingedMode]);

  const launcherMode: "idle" | "listening" | "thinking" = isRecording
    ? "listening"
    : isLoading
      ? "thinking"
      : "idle";
  const launcherStatusLabel =
    launcherMode === "listening"
      ? "Listening"
      : launcherMode === "thinking"
        ? "Thinking"
        : "Standby";
  const launcherHint =
    launcherMode === "listening"
      ? "Ara is listening for voice input."
      : launcherMode === "thinking"
        ? "Ara is processing your request."
        : "Activate Ara voice/text assistant";
  const isCircleLauncher = launcherVariant === "circle";
  const modeBadgeClass = cn(
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
    launcherMode === "idle" && "border-violet-300/35 bg-violet-400/10 text-violet-100",
    launcherMode === "listening" && "ara-chat-status-pulse border-cyan-300/50 bg-cyan-300/10 text-cyan-100",
    launcherMode === "thinking" && "ara-chat-status-pulse border-violet-300/55 bg-violet-500/15 text-violet-100"
  );
  const modeLabel =
    launcherMode === "listening" ? "Listening" : launcherMode === "thinking" ? "Thinking" : "Standby";

  return (
    <>
      {!hideFloatingButton && (
        <div className="fixed bottom-20 right-4 md:bottom-6 z-50">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(true)}
            onDoubleClick={toggleLauncherVariant}
            onPointerDown={startLauncherLongPress}
            onPointerUp={clearLauncherLongPressTimer}
            onPointerLeave={clearLauncherLongPressTimer}
            onPointerCancel={clearLauncherLongPressTimer}
            className={cn(
              "group relative isolate overflow-hidden border border-violet-300/30 bg-[#06070f]/90 shadow-[0_16px_38px_rgba(4,6,16,0.62),0_0_0_1px_rgba(168,85,247,0.18)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-300/45 hover:shadow-[0_18px_42px_rgba(4,6,16,0.72),0_0_30px_rgba(168,85,247,0.28)] active:translate-y-0 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050509]",
              isCircleLauncher ? "h-14 w-14 rounded-full p-0" : "h-14 w-[168px] rounded-[18px] px-2",
              launcherMode === "idle" && "ara-launcher-breath",
              launcherMode === "listening" &&
                "border-cyan-300/55 shadow-[0_18px_42px_rgba(3,12,28,0.72),0_0_30px_rgba(34,211,238,0.32)]",
              launcherMode === "thinking" &&
                "border-violet-300/50 shadow-[0_18px_42px_rgba(7,8,28,0.72),0_0_32px_rgba(139,92,246,0.34)]",
              isUnhinged && "ring-1 ring-cyan-300/60"
            )}
            data-testid="button-ai-assistant"
            aria-label={launcherHint}
            title={`${launcherHint} Double-click to switch launcher shape.`}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_15%,rgba(56,189,248,0.24),transparent_48%),radial-gradient(ellipse_at_85%_85%,rgba(168,85,247,0.28),transparent_52%),linear-gradient(135deg,rgba(10,10,19,0.94),rgba(20,12,34,0.96)_58%,rgba(9,9,20,0.92))]",
                isCircleLauncher ? "rounded-full" : "rounded-[18px]"
              )}
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-[linear-gradient(112deg,rgba(34,211,238,0.16),transparent_34%,rgba(168,85,247,0.3)_72%,transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100",
                isCircleLauncher ? "rounded-full" : "rounded-[18px]"
              )}
            />
            <span
              aria-hidden
              className={cn(
                "ara-launcher-arc pointer-events-none absolute top-0.5 h-6 rounded-full border-t border-cyan-300/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100",
                isCircleLauncher ? "inset-x-2" : "inset-x-1"
              )}
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 border opacity-0",
                isCircleLauncher ? "rounded-full" : "rounded-[18px]",
                launcherMode !== "idle" &&
                  "ara-launcher-ripple opacity-100",
                launcherMode === "listening" ? "border-cyan-300/50" : "border-violet-300/45"
              )}
            />

            {ARA_LAUNCHER_PARTICLES.map((particle, index) => (
              <span
                key={`ara-particle-${index}`}
                aria-hidden
                className={cn(
                  "ara-launcher-particle pointer-events-none absolute h-1 w-1 rounded-full bg-violet-100/80 shadow-[0_0_10px_rgba(167,139,250,0.7)]",
                  launcherMode === "listening" &&
                    "bg-cyan-200/90 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                )}
                style={{
                  left: particle.left,
                  top: particle.top,
                  animationDelay: particle.delay,
                  animationDuration: particle.duration,
                }}
              />
            ))}

            {isCircleLauncher ? (
              <span className="relative z-10 flex h-full w-full items-center justify-center">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/30 bg-black/35 backdrop-blur-sm",
                    launcherMode === "listening" && "border-cyan-300/60 bg-cyan-400/10",
                    launcherMode === "thinking" && "border-violet-300/60 bg-violet-500/15"
                  )}
                >
                  {launcherMode === "thinking" ? (
                    <Sparkles className="ara-launcher-swirl h-4 w-4 text-violet-100" strokeWidth={1.8} />
                  ) : launcherMode === "listening" ? (
                    <span className="flex h-4 items-end gap-0.5" aria-hidden>
                      {Array.from({ length: 4 }).map((_, waveIndex) => (
                        <span
                          key={`ara-circle-wave-${waveIndex}`}
                          className="ara-launcher-wave block w-[2px] rounded-full bg-gradient-to-t from-cyan-200/80 to-violet-200"
                          style={{
                            height: `${7 + (waveIndex % 2 === 0 ? 5 : 9)}px`,
                            animationDelay: `${waveIndex * 0.08}s`,
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    <Mic className="h-[16px] w-[16px] text-violet-50" strokeWidth={1.8} />
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
                    launcherMode === "idle" && "bg-violet-200/70",
                    launcherMode === "listening" && "bg-cyan-300",
                    launcherMode === "thinking" && "bg-violet-300"
                  )}
                />
              </span>
            ) : (
              <span className="relative z-10 flex w-full items-center">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-violet-200/25 bg-black/35 backdrop-blur-sm",
                    launcherMode === "listening" && "border-cyan-300/60 bg-cyan-400/10",
                    launcherMode === "thinking" && "border-violet-300/60 bg-violet-500/15"
                  )}
                >
                  {launcherMode === "thinking" ? (
                    <Sparkles className="ara-launcher-swirl h-4 w-4 text-violet-100" strokeWidth={1.8} />
                  ) : launcherMode === "listening" ? (
                    <span className="flex h-4 items-end gap-0.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, waveIndex) => (
                        <span
                          key={`ara-wave-${waveIndex}`}
                          className="ara-launcher-wave block w-[2.5px] rounded-full bg-gradient-to-t from-cyan-200/80 to-violet-200"
                          style={{
                            height: `${8 + (waveIndex % 2 === 0 ? 6 : 10)}px`,
                            animationDelay: `${waveIndex * 0.08}s`,
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    <Mic className="h-[17px] w-[17px] text-violet-50" strokeWidth={1.8} />
                  )}
                </span>
                <span className="ml-3 flex min-w-0 flex-1 flex-col items-start pr-1 text-left">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-violet-200/75">xAI</span>
                  <span className={cn("text-sm font-semibold leading-none text-white", isUnhinged && "ara-launcher-unhinged text-cyan-100")}>
                    Ara
                  </span>
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]",
                    launcherMode === "idle" && "border-violet-300/45 bg-violet-500/10 text-violet-100",
                    launcherMode === "listening" && "border-cyan-300/50 bg-cyan-400/10 text-cyan-100",
                    launcherMode === "thinking" && "border-violet-300/55 bg-violet-500/15 text-violet-100"
                  )}
                >
                  {launcherStatusLabel}
                </span>
              </span>
            )}

            {isUnhinged && (
              <span
                aria-hidden
                className={cn(
                  "ara-launcher-unhinged pointer-events-none absolute inset-x-0 z-20 text-center font-mono uppercase tracking-[0.2em] text-cyan-200",
                  isCircleLauncher ? "bottom-0.5 text-[7px]" : "bottom-1 text-[8px]"
                )}
              >
                |=| rotor balanced // unhinged
              </span>
            )}
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="h-[76vh] max-w-[min(94vw,30rem)] overflow-hidden border border-violet-300/25 bg-[#070913]/95 p-0 gap-0 shadow-[0_26px_68px_rgba(2,4,14,0.8),0_0_42px_rgba(168,85,247,0.24)]">
          <DialogHeader className="relative overflow-hidden border-b border-violet-300/20 px-4 py-3">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.14),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.24),transparent_58%),linear-gradient(180deg,rgba(7,10,22,0.98),rgba(7,9,19,0.9))]"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <DialogTitle className="flex items-center gap-2 text-base text-white">
                  <Sparkles className="h-4 w-4 text-violet-300" />
                  Ara
                </DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={modeBadgeClass}>{modeLabel}</span>
                  {voiceModeEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/45 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                      Voice mode
                    </span>
                  )}
                  {canViewAraStatus && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        araStatus?.ready
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-500/45 bg-amber-500/10 text-amber-200"
                      )}
                    >
                      {araStatusLabel}
                    </span>
                  )}
                  {canViewAraStatus && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 rounded-full border border-violet-300/25 bg-violet-500/5 px-2 text-[10px] text-violet-100 hover:bg-violet-500/15"
                      onClick={() => void fetchAraStatus()}
                      disabled={isStatusLoading}
                    >
                      {isStatusLoading ? "..." : "refresh"}
                    </Button>
                  )}
                </div>
                {canViewAraStatus && araStatusHint && (
                  <p className="mt-1 max-w-[280px] text-[10px] leading-tight text-violet-100/70 break-words">
                    {araStatusHint}
                  </p>
                )}
              </div>
              <div className="relative z-10 flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleLauncherVariant}
                  className="h-9 rounded-full border border-violet-300/25 bg-black/35 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-100 hover:bg-violet-500/15"
                  title={`Switch launcher to ${isCircleLauncher ? "pill" : "circle"} shape`}
                  data-testid="button-ara-launcher-variant"
                >
                  {isCircleLauncher ? "Pill" : "Circle"}
                </Button>
                {isVoiceSupported && ttsSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoiceMode}
                    className={cn(
                      "h-9 w-9 rounded-full border border-violet-300/25 bg-black/35 text-violet-100 hover:bg-violet-500/15",
                      voiceModeEnabled && "border-cyan-300/50 bg-cyan-400/10 text-cyan-100"
                    )}
                    title={voiceModeEnabled ? "Disable conversational voice mode" : "Enable conversational voice mode"}
                    data-testid="button-ara-voice-mode"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
                {ttsSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleAutoSpeak}
                    disabled={voiceModeEnabled}
                    className={cn(
                      "h-9 w-9 rounded-full border border-violet-300/25 bg-black/35 text-violet-100 hover:bg-violet-500/15",
                      autoSpeak && "border-violet-300/45 bg-violet-500/15 text-violet-100"
                    )}
                    title={
                      voiceModeEnabled
                        ? "Autospeak is required while voice mode is active"
                        : autoSpeak
                          ? "Ara speaks responses (click to turn off)"
                          : "Ara speaks responses (click to turn on)"
                    }
                    data-testid="button-ara-autospeak"
                  >
                    {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="relative flex-1">
            <div className="relative min-h-full px-4 py-4">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_8%,rgba(56,189,248,0.08),transparent_38%),radial-gradient(circle_at_82%_95%,rgba(168,85,247,0.16),transparent_45%),linear-gradient(180deg,#060811,#08091a)]"
              />
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-violet-300/35 bg-violet-500/10">
                    <Sparkles className="h-5 w-5 text-violet-200" />
                  </div>
                  <p className="text-sm font-semibold text-white">Ara is online.</p>
                  <p className="mt-1 max-w-[260px] text-xs text-violet-100/70">
                    Ask for punchline rewrites, rhyme chains, bar breakdowns, and strategy. Enable voice mode for real-time back-and-forth.
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("mb-3", msg.role === "user" ? "text-right" : "text-left")}>
                  <div
                    className={cn(
                      "inline-flex max-w-[88%] items-end gap-2",
                      msg.role === "user" && "ml-auto flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_8px_18px_rgba(139,92,246,0.35)]"
                          : "border border-violet-300/20 bg-black/35 text-violet-50"
                      )}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "assistant" && ttsSupported && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full border border-violet-300/20 bg-black/30 text-violet-100 hover:bg-violet-500/15"
                        onClick={() => (isSpeaking ? stopTTS() : speakTTS(msg.content))}
                        title={isSpeaking ? "Stop speaking" : "Speak this response"}
                        data-testid={`button-speak-msg-${i}`}
                      >
                        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-3 text-left">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/25 bg-black/40 px-3 py-2 text-xs text-violet-100/85">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ara is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-violet-300/20 bg-[#070b18]/90 p-3">
            {voiceModeEnabled && isVoiceSupported && (
              <p className="mb-2 text-[11px] font-medium text-cyan-100/85">
                {isRecording
                  ? "Voice mode live - listening now."
                  : isLoading || isSpeaking || isVoiceTurnPending
                    ? "Voice mode live - waiting for Ara response."
                    : "Voice mode live - preparing microphone."}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (voiceModeEnabled) {
                    toggleVoiceMode();
                    return;
                  }
                  toggleRecording();
                }}
                disabled={isLoading || !isVoiceSupported}
                className={cn(
                  "h-11 w-11 rounded-2xl border border-violet-300/25 bg-black/35 text-violet-100 hover:bg-violet-500/15",
                  isRecording && "border-cyan-300/55 bg-cyan-400/10 text-cyan-100"
                )}
                title={
                  !isVoiceSupported
                    ? "Voice input not supported"
                    : voiceModeEnabled
                      ? "Disable conversational voice mode"
                      : isRecording
                        ? "Stop recording"
                        : "Voice input"
                }
                data-testid="button-ai-voice"
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  voiceModeEnabled
                    ? "Voice mode is active. You can still type here..."
                    : isVoiceSupported
                      ? "Ask Ara anything (or use the mic)..."
                      : "Ask Ara anything..."
                }
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={isLoading}
                className="h-11 rounded-2xl border-violet-300/30 bg-black/35 text-violet-50 placeholder:text-violet-100/50"
                data-testid="input-ai-chat"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-11 w-11 rounded-2xl border border-violet-300/35 bg-violet-500/20 text-violet-50 hover:bg-violet-500/30 disabled:opacity-50"
                data-testid="button-ai-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
