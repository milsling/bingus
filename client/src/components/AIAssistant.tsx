import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Mic, MicOff, Send, Sparkles, Edit3, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
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

export default function AIAssistant({ open: externalOpen, onOpenChange, hideFloatingButton: propHideFloatingButton, initialPrompt }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(externalOpen || false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [hideFloatingButton, setHideFloatingButton] = useState(propHideFloatingButton || false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [hasProcessedInitialPrompt, setHasProcessedInitialPrompt] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const { currentUser } = useBars();
  const { toast } = useToast();
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use voice input",
          variant: "destructive",
        });
      }
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
  }, [toast]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollYRef.current;
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Determine scroll direction and update visibility
      if (deltaY > 5) {
        // Scrolling down
        setIsScrollingDown(true);
        setHideFloatingButton(true);
      } else if (deltaY < -5) {
        // Scrolling up
        setIsScrollingDown(false);
        setHideFloatingButton(false);
      }

      // Update last scroll position
      lastScrollYRef.current = currentScrollY;

      // Set timeout to show button again after scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        setHideFloatingButton(false);
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
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

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditContent(messages[index].content);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditContent("");
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const updatedMessages = [...messages];
    updatedMessages[editingIndex] = {
      ...updatedMessages[editingIndex],
      content: editContent
    };
    setMessages(updatedMessages);
    
    toast({
      title: "Message updated",
      description: "AI assistant message has been edited",
    });
    
    cancelEdit();
  };

  return (
    <>
      {!hideFloatingButton && (
        <div className={cn(
          "fixed bottom-20 right-4 md:bottom-6 z-50 transition-all duration-300 ease-in-out",
          isScrollingDown ? "translate-y-16 opacity-0" : "translate-y-0 opacity-100"
        )}>
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
        <DialogContent className="glass-surface-strong border border-white/[0.1] bg-background/95 w-[95vw] h-[95vh] md:max-w-[min(95vw,48rem)] md:h-[85vh] lg:max-w-[min(90vw,64rem)] xl:max-w-[min(85vw,80rem)] lg:h-[90vh] overflow-hidden p-0">
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
            <div className="p-3 md:p-4 md:p-6 max-w-none">
              {messages.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">How can I help you?</p>
                  <p className="mt-1 max-w-[300px] md:max-w-[400px] text-xs text-muted-foreground">
                    Ask for punchline rewrites, rhyme chains, bar breakdowns, and strategy.
                  </p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div key={i} className={cn("mb-4", msg.role === "user" ? "text-right" : "text-left")}>
                  <div className={cn(
                      "inline-flex max-w-[95%] md:max-w-[85%] lg:max-w-[80%] items-start gap-2",
                      msg.role === "user" && "flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap relative group",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {editingIndex === i && msg.role === "assistant" ? (
                        <div className="min-w-[200px]">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[60px] resize-none bg-background border-border text-foreground"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              className="h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              className="h-7 px-2 text-xs border-border/60 hover:bg-muted"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content}
                          {msg.role === "assistant" && currentUser?.isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(i)}
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
                              data-testid={`button-edit-message-${i}`}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
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

          <div className="border-t border-white/[0.08] bg-background/50 p-3 md:p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              {isVoiceSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleDictation}
                  disabled={isLoading}
                  className={cn(
                    "h-10 w-10 md:h-12 md:w-12 rounded-xl border border-white/[0.1] bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1]",
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
                className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.05] placeholder:text-muted-foreground/50 text-base md:text-lg px-4 py-3"
                data-testid="input-ai-chat"
              />
              
              <Button
                type="button"
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || isDictating}
                size="icon"
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
