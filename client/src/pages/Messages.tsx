import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation, useParams } from "wouter";
import { MessageCircle, Send, ArrowLeft, Users, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { formatTimestamp } from "@/lib/formatDate";
import { useWebSocket } from "@/hooks/useWebSocket";

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

  const { isConnected } = useWebSocket({
    onMessage: handleNewMessage,
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch('/api/messages', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
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
  const friendsNotInConversation = safeFriends.filter((f: any) => !conversationUserIds.has(f.id));

  const { data: chatMessages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/messages/${selectedUserId}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: isConnected ? false : (selectedUserId ? 10000 : false),
    staleTime: 5000,
    refetchOnWindowFocus: false,
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
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ['messages', selectedUserId] });
      const previousMessages = queryClient.getQueryData(['messages', selectedUserId]);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Messages</h1>
          <div className="flex items-center gap-1 ml-auto" title={isConnected ? "Real-time connected" : "Polling for updates"}>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)] md:h-[600px]">
          <Card className="md:col-span-1 overflow-hidden">
            <Tabs defaultValue="chats" className="h-full flex flex-col">
              <TabsList className="w-full rounded-none border-b shrink-0">
                <TabsTrigger value="chats" className="flex-1 gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chats
                </TabsTrigger>
                <TabsTrigger value="friends" className="flex-1 gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Friends
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chats" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {loadingConversations ? (
                    <p className="p-4 text-center text-muted-foreground">Loading...</p>
                  ) : safeConversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs mt-1">Start chatting with a friend!</p>
                    </div>
                  ) : (
                    safeConversations.map((conv: any) => (
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
                          <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${getStatusColor(conv.user.onlineStatus, conv.user.lastSeenAt)} border-2 border-background`} />
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
              </TabsContent>
              <TabsContent value="friends" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {loadingFriends ? (
                    <p className="p-4 text-center text-muted-foreground">Loading...</p>
                  ) : safeFriends.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <p className="text-sm">No friends yet</p>
                      <Link href="/friends">
                        <Button variant="link" size="sm" className="mt-2">
                          Find friends
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    friends.map((friend: any) => (
                      <button
                        key={friend.id}
                        className={`w-full p-3 flex items-center gap-3 hover:bg-accent transition-colors text-left border-b ${selectedUserId === friend.id ? 'bg-accent' : ''}`}
                        onClick={() => setLocation(`/messages/${friend.id}`)}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatarUrl || undefined} />
                            <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${friend.isRecentlyActive ? getStatusColor(friend.onlineStatus, friend.lastSeenAt) : 'bg-gray-400'} border-2 border-background`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">@{friend.username}</p>
                          <p className="text-xs text-muted-foreground capitalize">{friend.isRecentlyActive ? (friend.onlineStatus || 'offline') : 'offline'}</p>
                        </div>
                        {conversationUserIds.has(friend.id) && (
                          <Badge variant="secondary" className="text-[10px] px-1.5">Chat</Badge>
                        )}
                      </button>
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedUserId && (loadingUser || loadingConversations) ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
                  <p>Loading conversation...</p>
                </div>
              </div>
            ) : selectedUserId && selectedUser ? (
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
                      <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${getStatusColor(selectedUser.onlineStatus, selectedUser.lastSeenAt)} border border-background`} />
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
                      reversedMessages.map((msg: any) => {
                        const isSending = typeof msg.id === 'string' && msg.id.startsWith('temp-');
                        const isMyMessage = msg.senderId === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${isMyMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary'} ${isSending ? 'opacity-70' : ''}`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isMyMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {isSending ? 'Sending...' : formatTimestamp(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
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
