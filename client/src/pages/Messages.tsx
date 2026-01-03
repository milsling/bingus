import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, useLocation, useParams } from "wouter";
import { MessageCircle, Send, ArrowLeft, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { formatTimestamp } from "@/lib/formatDate";

export default function Messages() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const selectedUserId = params.id;
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: chatMessages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/messages/${selectedUserId}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: selectedUserId ? 5000 : false,
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  const selectedUser = selectedUserId
    ? conversations.find((c: any) => c.user.id === selectedUserId)?.user
    : null;

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/messages/${selectedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  const handleSend = () => {
    if (message.trim() && selectedUserId) {
      sendMutation.mutate(message.trim());
    }
  };

  const reversedMessages = [...chatMessages].reverse();

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Messages</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)] md:h-[600px]">
          <Card className="md:col-span-1 overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="h-full">
                {loadingConversations ? (
                  <p className="p-4 text-center text-muted-foreground">Loading...</p>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p className="text-sm">No conversations yet</p>
                    <Link href="/friends">
                      <Button variant="link" size="sm" className="mt-2">
                        Find friends to chat with
                      </Button>
                    </Link>
                  </div>
                ) : (
                  conversations.map((conv: any) => (
                    <button
                      key={conv.user.id}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-accent transition-colors text-left border-b ${selectedUserId === conv.user.id ? 'bg-accent' : ''}`}
                      onClick={() => setLocation(`/messages/${conv.user.id}`)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.user.avatarUrl || undefined} />
                          <AvatarFallback>{conv.user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${getStatusColor(conv.user.onlineStatus)} border-2 border-background`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">@{conv.user.username}</p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                          {conv.lastMessage.content.slice(0, 30)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedUserId && selectedUser ? (
              <>
                <div className="p-3 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setLocation('/messages')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Link href={`/u/${selectedUser.username}`}>
                    <div className="relative">
                      <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                        <AvatarImage src={selectedUser.avatarUrl || undefined} />
                        <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${getStatusColor(selectedUser.onlineStatus)} border border-background`} />
                    </div>
                  </Link>
                  <div>
                    <Link href={`/u/${selectedUser.username}`}>
                      <p className="font-medium text-sm hover:text-primary cursor-pointer transition-colors">@{selectedUser.username}</p>
                    </Link>
                    <p className="text-xs text-muted-foreground capitalize">{selectedUser.onlineStatus || 'offline'}</p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {loadingMessages ? (
                      <p className="text-center text-muted-foreground">Loading...</p>
                    ) : reversedMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No messages yet. Say hi!</p>
                    ) : (
                      reversedMessages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              msg.senderId === currentUser.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${msg.senderId === currentUser.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatTimestamp(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-3 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1"
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
