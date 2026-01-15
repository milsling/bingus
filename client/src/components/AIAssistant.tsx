import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFloatingButton?: boolean;
}

export default function AIAssistant({ open, onOpenChange, hideFloatingButton = false }: AIAssistantProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't respond. Try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!hideFloatingButton && (
        <div className="fixed bottom-20 right-4 md:bottom-6 z-50 flex flex-col gap-3">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/30"
            size="icon"
            data-testid="button-ai-assistant"
          >
            <Sparkles className="h-6 w-6" />
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Orphie
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-purple-500/50" />
                <p className="text-sm font-medium mb-2">Hey, I'm Orphie!</p>
                <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">
                  Ask me to explain bars, help you write punchlines, find rhymes, or chat about hip-hop.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn("mb-3", msg.role === "user" ? "text-right" : "text-left")}>
                <div className={cn(
                  "inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                  msg.role === "user" 
                    ? "bg-purple-600 text-white" 
                    : "bg-secondary text-foreground"
                )}>
                  {msg.content}
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Orphie anything..."
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
