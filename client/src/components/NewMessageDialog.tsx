import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle, Loader2 } from "lucide-react";
import { useBars } from "@/context/BarContext";

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMessageDialog({ open, onOpenChange }: NewMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { currentUser } = useBars();

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['userSearch', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const res = await fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}`, { 
        credentials: 'include' 
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await fetch('/api/friends', { credentials: 'include' });
      return res.json();
    },
    staleTime: 60000,
  });

  const handleSelectUser = (userId: string) => {
    onOpenChange(false);
    setSearchQuery("");
    setLocation(`/messages/${userId}`);
  };

  const displayUsers = searchQuery.length >= 2 
    ? (Array.isArray(searchResults) ? searchResults : []) 
    : (Array.isArray(friends) ? friends : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            New Message
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
              data-testid="input-search-users"
            />
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery.length >= 2 
                  ? "No users found" 
                  : friends.length === 0 
                    ? "Search for users to message" 
                    : "Your friends"}
              </div>
            ) : (
              <div className="space-y-1">
                {searchQuery.length < 2 && friends.length > 0 && (
                  <p className="text-xs text-muted-foreground px-2 pb-2">Your friends</p>
                )}
                {displayUsers
                  .filter((user: any) => user.id !== currentUser?.id)
                  .map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                    data-testid={`button-select-user-${user.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">@{user.username}</p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <p className="text-xs text-muted-foreground text-center">
            Messages can only be sent to users who allow them
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
