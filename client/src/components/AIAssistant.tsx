import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, Send, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBars } from "@/context/BarContext";

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

export default function AIAssistant({ open, onOpenChange, hideFloatingButton = false, initialPrompt }: AIAssistantProps) {
  const { currentUser } = useBars();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasProcessedInitialPrompt, setHasProcessedInitialPrompt] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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
        setInput(text);
        setIsDictating(false);
        setIsRecording(false);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialPrompt && !hasProcessedInitialPrompt && !isLoading) {
      setHasProcessedInitialPrompt(true);
      sendMessageWithContent(initialPrompt);
    }
  }, [isOpen, initialPrompt, hasProcessedInitialPrompt, isLoading]);

  useEffect(() => {
    if (!isOpen) {
      setHasProcessedInitialPrompt(false);
      if (isRecording) {
        stopDictation();
      }
    }
  }, [isOpen]);

  const startDictation = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    
    try {
      setIsRecording(true);
      setIsDictating(true);
      recognition.start();
    } catch {
      setIsRecording(false);
      setIsDictating(false);
    }
  }, []);

  const stopDictation = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    
    try {
      recognition.stop();
    } finally {
      setIsRecording(false);
      setIsDictating(false);
    }
  }, []);

  const toggleDictation = useCallback(() => {
    if (isRecording) {
      stopDictation();
    } else {
      startDictation();
    }
  }, [isRecording, startDictation, stopDictation]);

  const sendMessageWithContent = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    const userMessage = content.trim();
    if (isRecording) {
      stopDictation();
    }
    
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessage }),
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
          "AI is unavailable right now. Please try again.";
        throw new Error(errorText);
      }

      const responseText =
        data?.response ||
        data?.message ||
        "Sorry, I couldn't respond.";
      
      setMessages(prev => [...prev, { role: "assistant", content: responseText }]);
    } catch (error: any) {
      const fallback =
        error?.message || "Sorry, I couldn't respond. Try again.";
      setMessages(prev => [...prev, { role: "assistant", content: fallback }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isRecording, stopDictation]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await sendMessageWithContent(message);
  };

  return (
    <>
      {!hideFloatingButton && (
        <div className="fixed bottom-20 right-4 md:bottom-6 z-50">
          <Button
            type="button"
            onClick={() => setIsOpen(true)}
            className="glass-surface-strong rounded-2xl border border-white/[0.1] bg-white/[0.05] p-3 shadow-lg hover:bg-white/[0.1] transition-all hover:scale-105"
            data-testid="button-ai-assistant"
            aria-label="Open AI Assistant"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-surface-strong border border-white/[0.1] bg-background/95 max-w-[min(95vw,32rem)] h-[80vh] overflow-hidden p-0">
          <DialogHeader className="border-b border-white/[0.08] bg-background/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold">AI Assistant</DialogTitle>
                <p className="text-xs text-muted-foreground">Ask for help with bars, rhymes, and more</p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {messages.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">How can I help you?</p>
                  <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                    Ask for punchline rewrites, rhyme chains, bar breakdowns, and strategy.
                  </p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={cn("mb-4", msg.role === "user" ? "text-right" : "text-left")}>
                  <div
                    className={cn(
                      "inline-flex max-w-[85%] items-start gap-2",
                      msg.role === "user" && "flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="mb-4 text-left">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-white/[0.08] bg-background/50 p-4">
            <div className="flex items-center gap-2">
              {isVoiceSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleDictation}
                  disabled={isLoading}
                  className={cn(
                    "h-10 w-10 rounded-xl border border-white/[0.1] bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1]",
                    isRecording && "bg-red-500/10 border-red-500/30 text-red-500"
                  )}
                  title={isRecording ? "Stop dictation" : "Start voice dictation"}
                  data-testid="button-ai-voice"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isDictating 
                    ? "Listening..." 
                    : isVoiceSupported
                      ? "Type your message or use voice dictation..."
                      : "Type your message..."
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isLoading || isDictating}
                className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.05] placeholder:text-muted-foreground/50"
                data-testid="input-ai-chat"
              />
              
              <Button
                type="button"
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || isDictating}
                size="icon"
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                data-testid="button-ai-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {isVoiceSupported && (
              <p className="mt-2 text-xs text-muted-foreground">
                {isDictating 
                  ? "🎤 Listening... Speak clearly and tap the mic button when done."
                  : "💬 Tap the mic button to use voice dictation."
                }
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
