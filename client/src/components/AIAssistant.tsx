import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, MicOff, Sparkles, Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";

const ARA_AUTOSPEAK_KEY = "ara-autospeak";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendMessageRef = useRef<(content: string) => void>(() => {});
  const longPressTimeoutRef = useRef<number | null>(null);
  const unhingedTimeoutRef = useRef<number | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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

  useEffect(() => {
    if (!isOpen) stopTTS();
  }, [isOpen, stopTTS]);

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
        sendMessageRef.current(text);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
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

  const sendMessageWithContent = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    const userMessage = content.trim();
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
      setIsLoading(false);
      if (canViewAraStatus) {
        void fetchAraStatus();
      }
    }
  }, [autoSpeak, canViewAraStatus, fetchAraStatus, isLoading, speakTTS]);

  useEffect(() => {
    sendMessageRef.current = (content: string) => {
      void sendMessageWithContent(content);
    };
  }, [sendMessageWithContent]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    setInput("");
    await sendMessageWithContent(input);
  };

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isRecording) {
      try {
        recognition.stop();
      } finally {
        setIsRecording(false);
      }
      return;
    }

    try {
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
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

  return (
    <>
      {!hideFloatingButton && (
        <div className="fixed bottom-20 right-4 md:bottom-6 z-50">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(true)}
            onPointerDown={startLauncherLongPress}
            onPointerUp={clearLauncherLongPressTimer}
            onPointerLeave={clearLauncherLongPressTimer}
            onPointerCancel={clearLauncherLongPressTimer}
            className={cn(
              "group relative isolate h-14 w-[168px] overflow-hidden rounded-[18px] border border-violet-300/30 bg-[#06070f]/90 px-2 shadow-[0_16px_38px_rgba(4,6,16,0.62),0_0_0_1px_rgba(168,85,247,0.18)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-300/45 hover:shadow-[0_18px_42px_rgba(4,6,16,0.72),0_0_30px_rgba(168,85,247,0.28)] active:translate-y-0 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050509]",
              launcherMode === "idle" && "ara-launcher-breath",
              launcherMode === "listening" &&
                "border-cyan-300/55 shadow-[0_18px_42px_rgba(3,12,28,0.72),0_0_30px_rgba(34,211,238,0.32)]",
              launcherMode === "thinking" &&
                "border-violet-300/50 shadow-[0_18px_42px_rgba(7,8,28,0.72),0_0_32px_rgba(139,92,246,0.34)]",
              isUnhinged && "ring-1 ring-cyan-300/60"
            )}
            data-testid="button-ai-assistant"
            aria-label={launcherHint}
            title={launcherHint}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(ellipse_at_18%_15%,rgba(56,189,248,0.24),transparent_48%),radial-gradient(ellipse_at_85%_85%,rgba(168,85,247,0.28),transparent_52%),linear-gradient(135deg,rgba(10,10,19,0.94),rgba(20,12,34,0.96)_58%,rgba(9,9,20,0.92))]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[18px] bg-[linear-gradient(112deg,rgba(34,211,238,0.16),transparent_34%,rgba(168,85,247,0.3)_72%,transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span
              aria-hidden
              className="ara-launcher-arc pointer-events-none absolute inset-x-1 top-0.5 h-6 rounded-full border-t border-cyan-300/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[18px] border opacity-0",
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

            {isUnhinged && (
              <span
                aria-hidden
                className="ara-launcher-unhinged pointer-events-none absolute inset-x-0 bottom-1 z-20 text-center text-[8px] font-mono uppercase tracking-[0.2em] text-cyan-200"
              >
                |=| rotor balanced // unhinged
              </span>
            )}
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Ara
              </DialogTitle>
              {canViewAraStatus && (
                <div className="mt-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        araStatus?.ready
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      )}
                    >
                      {araStatusLabel}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-[10px]"
                      onClick={() => void fetchAraStatus()}
                      disabled={isStatusLoading}
                    >
                      {isStatusLoading ? "..." : "refresh"}
                    </Button>
                  </div>
                  {araStatusHint && (
                    <p className="text-[10px] text-muted-foreground break-words leading-tight">
                      {araStatusHint}
                    </p>
                  )}
                </div>
              )}
            </div>
            {ttsSupported && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleAutoSpeak}
                className={cn(
                  "shrink-0",
                  autoSpeak && "text-primary bg-primary/10"
                )}
                title={autoSpeak ? "Ara speaks responses (click to turn off)" : "Ara speaks responses (click to turn on)"}
                data-testid="button-ara-autospeak"
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-purple-500/50" />
                <p className="text-sm font-medium mb-2">Hey, I'm Ara!</p>
                <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
                  Ask me to explain bars, help you write punchlines, find rhymes, or chat about hip-hop.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn("mb-3", msg.role === "user" ? "text-right" : "text-left")}>
                <div className={cn(
                  "inline-flex items-end gap-2 max-w-[85%]",
                  msg.role === "user" && "flex-row-reverse ml-auto"
                )}>
                  <div className={cn(
                    "inline-block px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                    msg.role === "user" 
                      ? "bg-purple-600 text-white" 
                      : "bg-secondary text-foreground"
                  )}>
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && ttsSupported && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
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
              <div className="text-left mb-3">
                <div className="inline-block bg-secondary px-3 py-2 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="p-4 border-t flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              disabled={isLoading || !isVoiceSupported}
              title={isVoiceSupported ? (isRecording ? "Stop recording" : "Voice input") : "Voice input not supported"}
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
              placeholder={isVoiceSupported ? "Ask Ara anything (or use the mic)..." : "Ask Ara anything..."}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isLoading}
              data-testid="input-ai-chat"
            />
            <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" data-testid="button-ai-send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
