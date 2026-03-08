import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation, useParams } from "wouter";
import {
  MessageCircle, Send, Users, Search,
  MoreHorizontal, Smile, ChevronLeft,
  Pencil, WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { formatTimestamp } from "@/lib/formatDate";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────── helpers ── */

function getStatusColor(status?: string, lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return "bg-gray-400";
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const isRecent = new Date(lastSeenAt).getTime() > fiveMinutesAgo;
  if (status === "offline" || !isRecent) return "bg-gray-400";
  if (status === "online") return "bg-green-500";
  if (status === "busy") return "bg-amber-500";
  return "bg-gray-400";
}

function checkOnline(status?: string, lastSeenAt?: string | Date | null) {
  if (!lastSeenAt) return false;
  return (
    status === "online" &&
    new Date(lastSeenAt).getTime() > Date.now() - 5 * 60 * 1000
  );
}

/** Show timestamp divider when > 2 min gap or sender changes */
function shouldShowTimestamp(messages: any[], index: number) {
  if (index === 0) return true;
  const prev = messages[index - 1];
  const curr = messages[index];
  if (prev.senderId !== curr.senderId) return true;
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return Math.abs(diff) > 2 * 60 * 1000;
}

function shouldShowAvatar(messages: any[], index: number) {
  if (index === messages.length - 1) return true;
  return messages[index + 1]?.senderId !== messages[index].senderId;
}

/* ─────────────────────────────── main component ── */

export default function Messages() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const selectedUserId = params.id;
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeListTab, setActiveListTab] = useState<"chats" | "friends">("chats");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── websocket ── */
  const handleNewMessage = useCallback(
    (wsMessage: any) => {
      if (wsMessage.type === "newMessage" || wsMessage.type === "batchMessages") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (selectedUserId) {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedUserId] });
        }
      }
    },
    [queryClient, selectedUserId],
  );

  const { isConnected, connectionHealth, forceReconnect } = useWebSocket({
    onMessage: handleNewMessage,
  });

  /* ── queries ── */
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages", { credentials: "include" });
      return res.json();
    },
    staleTime: 5000,
    refetchInterval: connectionHealth === "healthy" ? 10000 : 3000,
    refetchOnWindowFocus: true,
  });

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends", { credentials: "include" });
      return res.json();
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const safeConversations: any[] = Array.isArray(conversations) ? conversations : [];
  const safeFriends: any[] = Array.isArray(friends) ? friends : [];
  const conversationUserIds = new Set(safeConversations.map((c: any) => c.user?.id).filter(Boolean));

  const { data: chatMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await fetch(`/api/messages/${selectedUserId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: selectedUserId ? (connectionHealth === "healthy" ? 8000 : 2000) : false,
    staleTime: 2000,
    refetchOnWindowFocus: true,
  });

  const conversationUser = selectedUserId
    ? safeConversations.find((c: any) => c.user?.id === selectedUserId)?.user
    : null;

  const { data: fetchedUser, isLoading: loadingUser } = useQuery({
    queryKey: ["user", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/users/by-id/${selectedUserId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedUserId && !conversationUser,
    staleTime: 60000,
  });

  const friendUser = selectedUserId ? safeFriends.find((f: any) => f.id === selectedUserId) : null;
  const selectedUser = conversationUser || fetchedUser || friendUser;

  /* ── send mutation (optimistic) ── */
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/messages/${selectedUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send message");
      }
      return res.json();
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["messages", selectedUserId] });
      const previousMessages = queryClient.getQueryData(["messages", selectedUserId]);
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        senderId: currentUser?.id,
        receiverId: selectedUserId,
        content,
        createdAt: new Date().toISOString(),
        read: false,
      };
      queryClient.setQueryData(["messages", selectedUserId], (old: any[] = []) => [optimisticMessage, ...old]);
      setMessage("");
      return { previousMessages, tempId };
    },
    onSuccess: (newMessage: any, _content, context) => {
      queryClient.setQueryData(["messages", selectedUserId], (old: any[] = []) => {
        const filtered = old.filter((msg) => msg.id !== context?.tempId);
        return [newMessage, ...filtered];
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: any, _content, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", selectedUserId], context.previousMessages);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  /* ── effects ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (selectedUserId && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (!currentUser) setLocation("/auth");
  }, [currentUser, setLocation]);

  if (!currentUser) return null;

  const reversedMessages = [...chatMessages].reverse();

  const handleSend = () => {
    if (message.trim() && selectedUserId) {
      sendMutation.mutate(message.trim());
    }
  };

  /* ── filtered lists ── */
  const filteredConversations = searchQuery
    ? safeConversations.filter((c: any) =>
        c.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : safeConversations;

  const filteredFriends = searchQuery
    ? safeFriends.filter((f: any) =>
        f.username?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : safeFriends;

  /* ━━━━━━━━━━ CONVERSATION SIDEBAR ━━━━━━━━━━━━━━━━━━━━━ */
  const ConversationSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn("flex flex-col h-full glass-panel", isMobile && "!rounded-none !border-0")}> 
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 pt-3 pb-2", isMobile && "pt-2")}> 
        <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight">Chats</h1>
        <div className="flex items-center gap-1">
          {!isConnected && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-amber-500" onClick={forceReconnect}>
              <WifiOff className="h-4 w-4" />
            </Button>
          )}
          <Link href="/friends">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setLocation("/friends")}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 h-10 rounded-full border-0 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary/45"
          />
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 px-4 pb-2">
        <button
          onClick={() => setActiveListTab("chats")}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all glass-button",
            activeListTab === "chats"
              ? "border border-white/25 text-foreground"
              : "border border-white/12 text-muted-foreground hover:border-white/20",
          )}
        >
          Inbox
        </button>
        <button
          onClick={() => setActiveListTab("friends")}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all glass-button",
            activeListTab === "friends"
              ? "border border-white/25 text-foreground"
              : "border border-white/12 text-muted-foreground hover:border-white/20",
          )}
        >
          Friends
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait">
          {activeListTab === "chats" ? (
            <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {loadingConversations ? (
                <ConversationSkeletons />
              ) : filteredConversations.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title={searchQuery ? "No results" : "No conversations yet"}
                  subtitle={searchQuery ? "Try a different search" : "Message a friend to get started"}
                />
              ) : (
                <div className="px-2">
                  {filteredConversations.map((conv: any) => (
                    <ConversationRow
                      key={conv.user.id}
                      user={conv.user}
                      lastMessage={conv.lastMessage}
                      unreadCount={conv.unreadCount}
                      isSelected={selectedUserId === conv.user.id}
                      currentUserId={currentUser.id}
                      onClick={() => setLocation(`/messages/${conv.user.id}`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {loadingFriends ? (
                <ConversationSkeletons />
              ) : filteredFriends.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={searchQuery ? "No results" : "No friends yet"}
                  subtitle="Find people to connect with"
                  action={
                    <Link href="/friends">
                      <Button size="sm" className="mt-3 rounded-full px-5 h-8 text-xs">Find Friends</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="px-2">
                  {filteredFriends.map((friend: any) => (
                    <FriendRow
                      key={friend.id}
                      friend={friend}
                      hasConvo={conversationUserIds.has(friend.id)}
                      isSelected={selectedUserId === friend.id}
                      onClick={() => setLocation(`/messages/${friend.id}`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  /* ━━━━━━━━━━ CHAT VIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const ChatView = () => {
    if (!selectedUser) return null;

    return (
      <div className="flex-1 min-w-0 flex flex-col h-full glass-panel">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-2 sm:px-4 h-14 sm:h-16 border-b border-white/12 glass-surface shrink-0">
          {/* Back — mobile only */}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0 md:hidden" onClick={() => setLocation("/messages")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Link href={`/u/${selectedUser.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-background">
                <AvatarImage src={selectedUser.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {selectedUser.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {checkOnline(selectedUser.onlineStatus, selectedUser.lastSeenAt) && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{selectedUser.displayName || selectedUser.username}</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {checkOnline(selectedUser.onlineStatus, selectedUser.lastSeenAt)
                  ? "Active now"
                  : selectedUser.lastSeenAt
                    ? `Active ${formatTimestamp(selectedUser.lastSeenAt)}`
                    : "Offline"}
              </p>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link href={`/u/${selectedUser.username}`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 sm:px-4 py-4 flex flex-col justify-end min-h-full">
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-bounce [animation-delay:0ms]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-bounce [animation-delay:150ms]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            ) : reversedMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-12">
                  <div className="relative inline-block mb-4">
                    <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                      <AvatarImage src={selectedUser.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                        {selectedUser.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="font-semibold text-base">{selectedUser.displayName || selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground mt-1">@{selectedUser.username}</p>
                  <p className="text-sm text-muted-foreground mt-3 max-w-[220px] mx-auto">
                    Say hi and start the conversation!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-full px-5 text-xs"
                    onClick={() => {
                      setMessage("Hey! 👋");
                      inputRef.current?.focus();
                    }}
                  >
                    👋 Wave
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {reversedMessages.map((msg: any, idx: number) => {
                  const isSending = typeof msg.id === "string" && msg.id.startsWith("temp-");
                  const isMyMessage = msg.senderId === currentUser.id;
                  const showTime = shouldShowTimestamp(reversedMessages, idx);
                  const showAvatar = !isMyMessage && shouldShowAvatar(reversedMessages, idx);
                  const isLastInGroup =
                    idx === reversedMessages.length - 1 ||
                    reversedMessages[idx + 1]?.senderId !== msg.senderId;
                  const isFirstInGroup =
                    idx === 0 || reversedMessages[idx - 1]?.senderId !== msg.senderId;

                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <p className="text-[10px] text-muted-foreground/60 text-center my-3 font-medium select-none">
                          {formatTimestamp(msg.createdAt)}
                        </p>
                      )}

                      <motion.div
                        initial={isSending ? { opacity: 0, scale: 0.95, y: 8 } : false}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          "flex items-end gap-1.5",
                          isMyMessage ? "justify-end" : "justify-start",
                          !isLastInGroup ? "mb-[2px]" : "mb-2",
                        )}
                      >
                        {/* Other user avatar — last msg in group only */}
                        {!isMyMessage && (
                          <div className="w-7 shrink-0">
                            {showAvatar ? (
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={selectedUser.avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {selectedUser.username[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[70%] sm:max-w-[65%] px-3.5 py-2 text-[14px] leading-[1.4] break-words",
                            isMyMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-white/10 text-foreground",
                            /* Messenger-style connected bubble shapes */
                            isMyMessage
                              ? cn(
                                  isFirstInGroup && isLastInGroup && "rounded-[20px] rounded-br-[6px]",
                                  isFirstInGroup && !isLastInGroup && "rounded-[20px] rounded-br-[6px]",
                                  !isFirstInGroup && isLastInGroup && "rounded-[20px] rounded-tr-[6px]",
                                  !isFirstInGroup && !isLastInGroup && "rounded-[20px] rounded-tr-[6px] rounded-br-[6px]",
                                )
                              : cn(
                                  isFirstInGroup && isLastInGroup && "rounded-[20px] rounded-bl-[6px]",
                                  isFirstInGroup && !isLastInGroup && "rounded-[20px] rounded-bl-[6px]",
                                  !isFirstInGroup && isLastInGroup && "rounded-[20px] rounded-tl-[6px]",
                                  !isFirstInGroup && !isLastInGroup && "rounded-[20px] rounded-tl-[6px] rounded-bl-[6px]",
                                ),
                            isSending && "opacity-60",
                          )}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-2 sm:px-3 py-2 sm:py-2.5 glass-surface border-t border-white/12">
          <div className="flex items-end gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                placeholder="Aa"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="glass-field h-10 sm:h-11 rounded-full pl-4 pr-10 border-0 text-sm placeholder:text-muted-foreground/55 focus-visible:ring-1 focus-visible:ring-primary/40"
                data-testid="input-message"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                onClick={() => inputRef.current?.focus()}
                tabIndex={-1}
                type="button"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {message.trim() ? (
                <motion.div key="send" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Button
                    onClick={handleSend}
                    disabled={sendMutation.isPending}
                    size="icon"
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0"
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="like" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Button
                    onClick={() => {
                      if (selectedUserId) {
                        sendMutation.mutate("👍");
                      }
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full text-xl shrink-0"
                  >
                    👍
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  /* ━━━━━━━━━━━━━━ LAYOUT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const showChatOnMobile = !!selectedUserId && !!selectedUser;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background/30">
      {/* Top spacer for global nav */}
      <div className="h-14 md:h-0 shrink-0" />

      <div className="flex-1 flex min-h-0 md:pt-[72px] md:pb-5 md:px-6">
        <div className="flex-1 flex min-h-0 overflow-hidden md:mx-auto md:max-w-[1500px] xl:max-w-[1700px] md:rounded-3xl md:shadow-xl md:glass-panel md:border-0">
          {/* ── Desktop sidebar ── */}
          <div className="hidden md:flex w-[360px] lg:w-[400px] shrink-0 flex-col border-r border-white/12 glass-surface">
            <ConversationSidebar />
          </div>

          {/* ── Mobile: list OR chat ── */}
          <div className="flex-1 min-w-0 flex flex-col md:hidden">
            <AnimatePresence mode="wait" initial={false}>
              {showChatOnMobile ? (
                <motion.div
                  key="chat"
                  initial={{ x: "30%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "30%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <ChatView />
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ x: "-20%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-20%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <ConversationSidebar isMobile />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Desktop chat area ── */}
          <div className="hidden md:flex flex-1 min-w-0 flex-col glass-surface">
            {selectedUserId && (loadingUser || loadingConversations) ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-bounce [animation-delay:0ms]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-bounce [animation-delay:150ms]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            ) : selectedUserId && selectedUser ? (
              <ChatView />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-lg font-semibold text-foreground/80">Your messages</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
                    Select a conversation or start a new chat with a friend
                  </p>
                  <Link href="/friends">
                    <Button size="sm" className="mt-5 rounded-full px-6 h-9 text-sm">
                      New Message
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom safe area — mobile list only */}
      {!showChatOnMobile && <div className="h-20 md:h-0 shrink-0" />}
    </div>
  );
}

/* ━━━━━━━━━━━━ SUB-COMPONENTS ━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ConversationRow({
  user,
  lastMessage,
  unreadCount,
  isSelected,
  currentUserId,
  onClick,
}: {
  user: any;
  lastMessage: any;
  unreadCount: number;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const online = checkOnline(user.onlineStatus, user.lastSeenAt);

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all text-left active:scale-[0.98]",
        isSelected ? "bg-primary/10" : "hover:bg-foreground/[0.04]",
      )}
      onClick={onClick}
      data-testid={`conversation-${user.id}`}
    >
      <div className="relative shrink-0">
        <Avatar className={cn("h-[52px] w-[52px]", unreadCount > 0 && "ring-2 ring-primary/30")}>
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
            {user.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {online && (
          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px] border-background bg-green-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground/90",
          )}>
            {user.displayName || user.username}
          </p>
          <span className={cn(
            "text-[10px] shrink-0",
            unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground/60",
          )}>
            {lastMessage?.createdAt ? formatTimestamp(lastMessage.createdAt) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-xs truncate",
            unreadCount > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground/70",
          )}>
            {lastMessage?.senderId === currentUserId ? "You: " : ""}
            {lastMessage?.content?.slice(0, 40) || ""}
          </p>
          {unreadCount > 0 && (
            <div className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
              {unreadCount}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function FriendRow({
  friend,
  hasConvo,
  isSelected,
  onClick,
}: {
  friend: any;
  hasConvo: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const online = checkOnline(friend.onlineStatus, friend.lastSeenAt);

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all text-left active:scale-[0.98]",
        isSelected ? "bg-primary/10" : "hover:bg-foreground/[0.04]",
      )}
      onClick={onClick}
      data-testid={`friend-${friend.id}`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {friend.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {online && (
          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{friend.displayName || friend.username}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          {online ? "Active now" : "Offline"}
        </p>
      </div>
      {hasConvo && (
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">Chat</Badge>
      )}
    </button>
  );
}

function ConversationSkeletons() {
  return (
    <div className="px-3 space-y-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
          <div className="h-[52px] w-[52px] rounded-full bg-foreground/[0.06] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-24 bg-foreground/[0.06] rounded-full" />
            <div className="h-3 w-36 bg-foreground/[0.04] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: any;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-foreground/[0.06] flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">{subtitle}</p>
      {action}
    </div>
  );
}
