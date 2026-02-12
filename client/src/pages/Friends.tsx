import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { Users, UserPlus, UserCheck, UserX, MessageCircle, Circle, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";

export default function Friends() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await fetch('/api/friends', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const res = await fetch('/api/friends/requests', { credentials: 'include' });
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await fetch(`/api/friends/accept/${friendshipId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to accept request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast({ title: "Friend request accepted!" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await fetch(`/api/friends/decline/${friendshipId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to decline request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast({ title: "Friend request declined" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove friend');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({ title: "Friend removed" });
    },
  });

  const getStatusColor = (friend: any) => {
    if (!friend.isRecentlyActive) return 'bg-gray-400';
    switch (friend.onlineStatus) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };
  
  const getStatusText = (friend: any) => {
    if (!friend.isRecentlyActive) return 'offline';
    return friend.onlineStatus || 'offline';
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">

      <main className="w-full max-w-2xl xl:max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Friends</h1>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="friends" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-3">
            {loadingFriends ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : friends.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No friends yet. Follow people and they might follow you back!</p>
                </CardContent>
              </Card>
            ) : (
              friends.map((friend: any) => (
                <Card key={friend.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Link href={`/u/${friend.username}`}>
                      <div className="relative">
                        <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                          <AvatarImage src={friend.avatarUrl || undefined} />
                          <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${getStatusColor(friend)} border-2 border-background`} />
                      </div>
                    </Link>
                    <div className="flex-1">
                      <Link href={`/u/${friend.username}`}>
                        <p className="font-bold hover:text-primary cursor-pointer transition-colors">@{friend.username}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">{getStatusText(friend)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/messages/${friend.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeMutation.mutate(friend.id)}
                        disabled={removeMutation.isPending}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-3">
            {loadingRequests ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending friend requests</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map((request: any) => (
                <Card key={request.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Link href={`/u/${request.requester.username}`}>
                      <Avatar className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                        <AvatarImage src={request.requester.avatarUrl || undefined} />
                        <AvatarFallback>{request.requester.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <Link href={`/u/${request.requester.username}`}>
                        <p className="font-bold hover:text-primary cursor-pointer transition-colors">@{request.requester.username}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">Wants to be your friend</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(request.id)}
                        disabled={acceptMutation.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => declineMutation.mutate(request.id)}
                        disabled={declineMutation.isPending}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
