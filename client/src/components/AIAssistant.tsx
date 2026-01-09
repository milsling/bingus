import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Send, Loader2, MessageCircle, Lightbulb, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BarExplanation {
  explanation: string;
  wordplay: string[];
  references: string[];
  difficulty: string;
}

interface BarSuggestion {
  suggestions: string[];
  rhymes: string[];
  tips: string;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [explainInput, setExplainInput] = useState("");
  const [explanation, setExplanation] = useState<BarExplanation | null>(null);
  const [suggestInput, setSuggestInput] = useState("");
  const [suggestion, setSuggestion] = useState<BarSuggestion | null>(null);
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

  const explainBar = async () => {
    if (!explainInput.trim() || isLoading) return;
    setIsLoading(true);
    setExplanation(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: explainInput }),
      });
      const data = await res.json();
      setExplanation(data);
    } catch {
      setExplanation({ explanation: "Sorry, I couldn't analyze this bar.", wordplay: [], references: [], difficulty: "unknown" });
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestions = async () => {
    if (!suggestInput.trim() || isLoading) return;
    setIsLoading(true);
    setSuggestion(null);

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: suggestInput }),
      });
      const data = await res.json();
      setSuggestion(data);
    } catch {
      setSuggestion({ suggestions: [], rhymes: [], tips: "Sorry, I couldn't generate suggestions." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/30 z-50"
        size="icon"
        data-testid="button-ai-assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Orphie
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 mx-4 mt-2">
              <TabsTrigger value="chat" className="text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="explain" className="text-xs">
                <HelpCircle className="h-3 w-3 mr-1" />
                Explain
              </TabsTrigger>
              <TabsTrigger value="write" className="text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />
                Write
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500/50" />
                    <p className="text-sm">I'm Orphie! Ask me anything about bars, lyrics, or hip-hop.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("mb-3", msg.role === "user" ? "text-right" : "text-left")}>
                    <div className={cn(
                      "inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm",
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
                  placeholder="Ask me anything..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  disabled={isLoading}
                  data-testid="input-ai-chat"
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" data-testid="button-ai-send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="explain" className="flex-1 flex flex-col overflow-hidden m-0 p-4">
              <p className="text-sm text-muted-foreground mb-3">Paste a bar and I'll break it down for you.</p>
              <textarea
                value={explainInput}
                onChange={(e) => setExplainInput(e.target.value)}
                placeholder="Paste the bar here..."
                className="flex-shrink-0 w-full p-3 rounded-md border bg-background resize-none h-24 text-sm"
                data-testid="input-explain-bar"
              />
              <Button onClick={explainBar} disabled={isLoading || !explainInput.trim()} className="mt-2" data-testid="button-explain">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Explain This Bar
              </Button>
              
              {explanation && (
                <ScrollArea className="flex-1 mt-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Meaning</h4>
                      <p className="text-sm text-muted-foreground">{explanation.explanation}</p>
                    </div>
                    {explanation.wordplay.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Wordplay</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {explanation.wordplay.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    {explanation.references.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">References</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                          {explanation.references.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Complexity: <span className="capitalize">{explanation.difficulty}</span>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="write" className="flex-1 flex flex-col overflow-hidden m-0 p-4">
              <p className="text-sm text-muted-foreground mb-3">Tell me what you want to write about.</p>
              <Input
                value={suggestInput}
                onChange={(e) => setSuggestInput(e.target.value)}
                placeholder="e.g. flexing on haters, being underrated..."
                onKeyDown={(e) => e.key === "Enter" && getSuggestions()}
                data-testid="input-write-topic"
              />
              <Button onClick={getSuggestions} disabled={isLoading || !suggestInput.trim()} className="mt-2" data-testid="button-suggest">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Get Ideas
              </Button>
              
              {suggestion && (
                <ScrollArea className="flex-1 mt-4">
                  <div className="space-y-3">
                    {suggestion.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Example Bars</h4>
                        <ul className="space-y-2">
                          {suggestion.suggestions.map((s, i) => (
                            <li key={i} className="text-sm bg-secondary/50 p-2 rounded italic">"{s}"</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {suggestion.rhymes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Useful Rhymes</h4>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.rhymes.map((r, i) => (
                            <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestion.tips && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Tip</h4>
                        <p className="text-sm text-muted-foreground">{suggestion.tips}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
