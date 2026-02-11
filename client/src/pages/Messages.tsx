import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation, useParams } from "wouter";
import { MessageCircle, Send, ArrowLeft, Users, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { formatTimestamp } from "@/lib/formatDate";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Messages() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const selectedUserId = params.id;
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const handleNewMessage = useCallback((wsMessage: any) => {
    if (wsMessage.type === "newMessage" || wsMessage.type === "batchMessages") {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] });
      }
    }
  }, [queryClient, selectedUserId]);

  const { isConnected, connectionHealth, forceReconnect } = useWebSocket({
    onMessage: handleNewMessage,
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages', { credentials: 'include' });
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: connectionHealth === 'healthy' ? 10000 : 3000,
    refetchOnWindowFocus: true,
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await fetch('/api/friends', { credentials: 'include' });
      return res.json();
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const safeFriends = Array.isArray(friends) ? friends : [];
  const conversationUserIds = new Set(safeConversations.map((c: any) => c.user?.id).filter(Boolean));

  const { data: chatMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/messages/${selectedUserId}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: selectedUserId ? (connectionHealth === 'healthy' ? 8000 : 2000) : false,
    staleTime: 2000,
    refetchOnWindowFocus: true,
  });

  const conversationUser = selectedUserId
    ? safeConversations.find((c: any) => c.user?.id === selectedUserId)?.user
    : null;

  const { data: fetchedUser, isLoading: loadingUser } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/users/by-id/${selectedUserId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedUserId && !conversationUser,
    staleTime: 60000,
  });

  const friendUser = selectedUserId ? safeFriends.find((f: any) => f.id === selectedUserId) : null;
  const selectedUser = conversationUser || fetchedUser || friendUser;

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/messages/${selectedUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to send message');
      }
      return res.json();
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['messages', selectedUserId] });
      const previousMessages = queryClient.getQueryData(['messages', selectedUserId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        senderId: currentUser?.id,
        receiverId: selectedUserId,
        content,
        createdAt: new Date().toISOString(),
        read: false,
      };
      queryClient.setQueryData(['messages', selectedUserId], (old: any[] = []) => [optimisticMessage, ...old]);
      setMessage("");
      return { previousMessages, tempId };
    },
    onSuccess: (newMessage: any, _content, context) => {
      queryClient.setQueryData(['messages', selectedUserId], (old: any[] = []) => {
        const filtered = old.filter(msg => msg.id !== context?.tempId);
        return [newMessage, ...filtered];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: any, _content, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', selectedUserId], context.previousMessages);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getStatusColor = (status?: string, lastSeenAt?: string | Date | null) => {
    if (!lastSeenAt) return 'bg-gray-400';
    
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const lastSeen = new Date(lastSeenAt).getTime();
    const isRecentlyActive = lastSeen > fiveMinutesAgo;
    
    if (status === 'offline') return 'bg-gray-400';
    if (!isRecentlyActive) return 'bg-gray-400';
    
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

  useEffect(() => {
    if (!currentUser) {
      setLocation("/auth");
    }
  }, [currentUser, setLocation]);

  if (!currentUser) {
    return null;
  }

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="chats" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none bg-transparent border-b border-border/40 shrink-0">
          <TabsTrigger value="chats" className="flex-1 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <MessageCircle className="h-3.5 w-3.5" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex-1 gap-1.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Users className="h-3.5 w-3.5" />
            Friends
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chats" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loadingConversations ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-3 w-32 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : safeConversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1 opacity-70">Start chatting with a friend!</p>
              </div>
            ) : (
              <div className="py-1">
                {safeConversations.map((conv: any) => (
                  <button
                    key={conv.user.id}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 transition-all text-left",
                      "hover:bg-accent/50",
                      selectedUserId === conv.user.id && "bg-accent"
                    )}
                    onClick={() => setLocation(`/messages/${conv.user.id}`)}
                    data-testid={`conversation-${conv.user.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-11 w-11 ring-2 ring-background">
                        <AvatarImage src={conv.user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {conv.user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        getStatusColor(conv.user.onlineStatus, conv.user.lastSeenAt)
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">@{conv.user.username}</p>
                        {conv.unreadCount > 0 && (
                          <Badge className="h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}
                        {conv.lastMessage.content.slice(0, 30)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        <TabsContent value="friends" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loadingFriends ? (
              <div className="p-6 text-center text-muted-foreground">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : safeFriends.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No friends yet</p>
                <Link href="/friends">
                  <Button variant="link" size="sm" className="mt-2">
                    Find friends
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-1">
                {friends.map((friend: any) => (
                  <button
                    key={friend.id}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 transition-all text-left",
                      "hover:bg-accent/50",
                      selectedUserId === friend.id && "bg-accent"
                    )}
                    onClick={() => setLocation(`/messages/${friend.id}`)}
                    data-testid={`friend-${friend.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-11 w-11 ring-2 ring-background">
                        <AvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {friend.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        friend.isRecentlyActive ? getStatusColor(friend.onlineStatus, friend.lastSeenAt) : 'bg-gray-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">@{friend.username}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {friend.isRecentlyActive ? (friend.onlineStatus || 'offline') : 'offline'}
                      </p>
                    </div>
                    {conversationUserIds.has(friend.id) && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">Chat</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-4 md:pt-24">

      <main className="max-w-5xl mx-auto h-[calc(100vh-80px)] md:h-[calc(100vh-64px)] md:p-4">
        <div className="h-full md:rounded-2xl glass-panel overflow-hidden flex">
          
          <div className="hidden md:flex w-80 border-r border-border/40 flex-col">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h1 className="font-display font-bold text-lg text-foreground">Messages</h1>
              </div>
              <button
                onClick={() => !isConnected && forceReconnect()}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                title={
                  connectionHealth === 'healthy' ? "Real-time connected" :
                  connectionHealth === 'degraded' ? "Checking connection..." :
                  "Disconnected - click to reconnect"
                }
                data-testid="button-connection-status"
              >
                {connectionHealth === 'healthy' ? (
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                ) : connectionHealth === 'degraded' ? (
                  <RefreshCw className="h-3.5 w-3.5 text-yellow-500 animate-spin" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
            <ConversationList />
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="md:hidden flex items-center gap-3 p-3 border-b border-border/40 glass-nav">
              {selectedUserId && selectedUser ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setLocation('/messages')}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Link href={`/u/${selectedUser.username}`} className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={selectedUser.avatarUrl || undefined} />
                        <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                        getStatusColor(selectedUser.onlineStatus, selectedUser.lastSeenAt)
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">@{selectedUser.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedUser.onlineStatus || 'offline'}</p>
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <h1 className="font-display font-bold">Messages</h1>
                  <button
                    onClick={() => !isConnected && forceReconnect()}
                    className="ml-auto flex items-center gap-1"
                    title={connectionHealth === 'healthy' ? "Connected" : "Click to reconnect"}
                  >
                    {connectionHealth === 'healthy' ? (
                      <Wifi className="h-3.5 w-3.5 text-green-500" />
                    ) : connectionHealth === 'degraded' ? (
                      <RefreshCw className="h-3.5 w-3.5 text-yellow-500 animate-spin" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </>
              )}
            </div>

            {selectedUserId && (loadingUser || loadingConversations) ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
                  <p className="text-sm">Loading conversation...</p>
                </div>
              </div>
            ) : selectedUserId && selectedUser ? (
              <>
                <div className="hidden md:flex p-3 border-b border-border/50 items-center gap-3 bg-background/30">
                  <Link href={`/u/${selectedUser.username}`} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                        <AvatarImage src={selectedUser.avatarUrl || undefined} />
                        <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                        getStatusColor(selectedUser.onlineStatus, selectedUser.lastSeenAt)
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-sm hover:text-primary cursor-pointer transition-colors">@{selectedUser.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedUser.onlineStatus || 'offline'}</p>
                    </div>
                  </Link>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2 min-h-full flex flex-col justify-end">
                    {loadingMessages ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-center text-muted-foreground">Loading...</p>
                      </div>
                    ) : reversedMessages.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground py-8">
                          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No messages yet</p>
                          <p className="text-xs mt-1 opacity-70">Say hi!</p>
                        </div>
                      </div>
                    ) : (
                      reversedMessages.map((msg: any) => {
                        const isSending = typeof msg.id === 'string' && msg.id.startsWith('temp-');
                        const isMyMessage = msg.senderId === currentUser.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("flex", isMyMessage ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] px-4 py-2.5 rounded-2xl",
                                isMyMessage
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md",
                                isSending && "opacity-70"
                              )}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              <p className={cn(
                                "text-[10px] mt-1",
                                isMyMessage ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {isSending ? 'Sending...' : formatTimestamp(msg.createdAt)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                  <div className="flex gap-2 items-end">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      className="flex-1 rounded-full px-4 bg-muted/50 border-0 focus-visible:ring-1"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || sendMutation.isPending}
                      size="icon"
                      className="h-10 w-10 rounded-full shrink-0"
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="md:hidden flex-1">
                  <ConversationList />
                </div>
                <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm mt-1 opacity-70">Choose a chat from the list to start messaging</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
