import { useState } from "react";
import type { BarWithUser } from "@shared/schema";
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Send, X, Bookmark, MessageSquarePlus, Shield, Users, Lock, Copy, QrCode, FileCheck, Image, ThumbsDown, Search, AlertTriangle, CheckCircle, ExternalLink, Music, Flag, Info, LockKeyhole, Star, Crown, Sparkles } from "lucide-react";
import AIAssistant from "@/components/AIAssistant";
import { BarMediaPlayer } from "@/components/BarMediaPlayer";
import { UserProfileBadges } from "@/components/UserProfileBadges";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { shareContent, getBarShareData } from "@/lib/share";
import ProofScreenshot from "@/components/ProofScreenshot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { formatTimestamp } from "@/lib/formatDate";
import { useBars } from "@/context/BarContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BarCardProps {
  bar: BarWithUser;
}

type BarType = "single_bar" | "snippet" | "half_verse";

const LINE_BREAK_LIMITS: Record<BarType, number> = {
  single_bar: 1,
  snippet: 4,
  half_verse: 8,
};

const BAR_TYPE_INFO: Record<BarType, { label: string; detail: string }> = {
  single_bar: { label: "Single Bar", detail: "A single punchy line, punchline, or one-liner. 1 line max." },
  snippet: { label: "Snippet", detail: "A short flow or a few connected bars. Up to 4 lines." },
  half_verse: { label: "Half Verse", detail: "A longer section of a verse. Up to 8 lines." },
};

function getAnimationClasses(animation: string | undefined): string {
  switch (animation) {
    case 'pulse':
      return 'animate-pulse';
    case 'glow':
      return 'shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/70';
    case 'bounce':
      return 'hover:animate-bounce';
    case 'shimmer':
      return 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-[shimmer_2s_infinite]';
    case 'sparkle':
      return 'animate-pulse hover:brightness-125';
    case 'gradient':
      return 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:from-red-500 hover:via-pink-500 hover:to-purple-500 transition-all duration-500';
    default:
      return '';
  }
}

function StyledTag({ tag, barId, customTags }: { tag: string; barId: number | string; customTags: any[] }) {
  const normalizedTag = tag.toLowerCase().trim();
  const customTag = customTags.find(ct => ct.name === normalizedTag);
  
  const animationClass = getAnimationClasses(customTag?.animation);
  
  if (customTag?.imageUrl) {
    return (
      <Link href={`/?tag=${encodeURIComponent(tag)}`}>
        <img 
          src={customTag.imageUrl} 
          alt={`#${tag}`} 
          className={`h-5 w-auto object-contain rounded cursor-pointer hover:scale-110 transition-transform ${animationClass}`}
          data-testid={`badge-tag-${tag}-${barId}`}
        />
      </Link>
    );
  }
  
  const style = customTag ? {
    color: customTag.color || undefined,
    backgroundColor: customTag.animation === 'gradient' ? undefined : (customTag.backgroundColor || undefined),
  } : {};
  
  const displayName = customTag?.displayName || tag;
  
  return (
    <Link href={`/?tag=${encodeURIComponent(tag)}`}>
      <Badge 
        variant="secondary" 
        className={`text-xs hover:bg-primary/20 hover:text-primary cursor-pointer transition-all ${animationClass} ${customTag ? '' : 'text-muted-foreground'}`}
        style={style}
        data-testid={`badge-tag-${tag}-${barId}`}
      >
        #{displayName}
      </Badge>
    </Link>
  );
}

function CollapsibleTags({ tags, barId, customTags }: { tags: string[]; barId: number | string; customTags: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE = 2;
  
  if (tags.length <= MAX_VISIBLE) {
    return (
      <>
        {tags.map(tag => (
          <StyledTag key={tag} tag={tag} barId={barId} customTags={customTags} />
        ))}
      </>
    );
  }

  const visibleTags = expanded ? tags : tags.slice(0, MAX_VISIBLE);
  const hiddenCount = tags.length - MAX_VISIBLE;

  return (
    <>
      {visibleTags.map(tag => (
        <StyledTag key={tag} tag={tag} barId={barId} customTags={customTags} />
      ))}
      <Badge 
        variant="outline" 
        className="text-xs text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
        data-testid={`button-expand-tags-${barId}`}
      >
        {expanded ? "Show less" : `+${hiddenCount} more`}
      </Badge>
    </>
  );
}

const countLineBreaks = (html: string): number => {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  text = text.replace(/\n+/g, '\n').trim();
  return (text.match(/\n/g) || []).length;
};

interface CommentItemProps {
  comment: any;
  currentUserId?: string;
  onDelete: () => void;
}

function CommentItem({ comment, currentUserId, onDelete }: CommentItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: likeData } = useQuery({
    queryKey: ['commentLikes', comment.id],
    queryFn: async () => {
      const res = await fetch(`/api/comments/${comment.id}/likes`, { credentials: 'include' });
      return res.json();
    },
    initialData: { count: comment.likeCount || 0, liked: false },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: dislikeData } = useQuery({
    queryKey: ['commentDislikes', comment.id],
    queryFn: async () => {
      const res = await fetch(`/api/comments/${comment.id}/dislikes`, { credentials: 'include' });
      return res.json();
    },
    initialData: { count: 0, disliked: false },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  
  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/comments/${comment.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to like comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentLikes', comment.id] });
      queryClient.invalidateQueries({ queryKey: ['commentDislikes', comment.id] });
    },
    onError: () => {
      toast({ title: "Login required", description: "You need to be logged in to like comments", variant: "destructive" });
    },
  });

  const dislikeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/comments/${comment.id}/dislike`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to dislike comment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commentDislikes', comment.id] });
      queryClient.invalidateQueries({ queryKey: ['commentLikes', comment.id] });
    },
    onError: () => {
      toast({ title: "Login required", description: "You need to be logged in to dislike comments", variant: "destructive" });
    },
  });
  
  return (
    <div className="flex gap-2 p-2 bg-secondary/20 rounded-md">
      <Avatar className="h-6 w-6">
        <AvatarImage src={comment.user?.avatarUrl || undefined} />
        <AvatarFallback className="text-xs">{comment.user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">@{comment.user?.username}</span>
          {comment.user?.id && <UserProfileBadges userId={comment.user.id} size="xs" maxBadges={2} />}
          <span className="text-[10px] text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground/80">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => currentUserId ? likeMutation.mutate() : toast({ title: "Login required", description: "You need to be logged in to like comments", variant: "destructive" })}
            className={`flex items-center gap-1 text-[10px] transition-colors ${likeData?.liked ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'}`}
            disabled={likeMutation.isPending}
            data-testid={`button-like-comment-${comment.id}`}
          >
            <Heart className={`h-3 w-3 ${likeData?.liked ? 'fill-current' : ''}`} />
            <span>{likeData?.count || 0}</span>
          </button>
          <button
            onClick={() => currentUserId ? dislikeMutation.mutate() : toast({ title: "Login required", description: "You need to be logged in to dislike comments", variant: "destructive" })}
            className={`flex items-center gap-1 text-[10px] transition-colors ${dislikeData?.disliked ? 'text-orange-400' : 'text-muted-foreground hover:text-orange-400'}`}
            disabled={dislikeMutation.isPending}
            data-testid={`button-dislike-comment-${comment.id}`}
          >
            <ThumbsDown className={`h-3 w-3 ${dislikeData?.disliked ? 'fill-current' : ''}`} />
            <span>{dislikeData?.count || 0}</span>
          </button>
        </div>
      </div>
      {currentUserId === comment.userId && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

const CATEGORIES = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"];

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function BarCard({ bar }: BarCardProps) {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: customTags = [] } = useQuery({
    queryKey: ['customTags'],
    queryFn: async () => {
      const res = await fetch('/api/tags/custom', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editContent, setEditContent] = useState(bar.content);
  const [editExplanation, setEditExplanation] = useState(bar.explanation || "");
  const [editCategory, setEditCategory] = useState(bar.category);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [editTags, setEditTags] = useState(bar.tags?.join(", ") || "");
  const [editBarType, setEditBarType] = useState((bar as any).barType || "single_bar");
  const [editFullRapLink, setEditFullRapLink] = useState((bar as any).fullRapLink || "");
  const [showProofScreenshot, setShowProofScreenshot] = useState(false);
  const [showOriginalityReport, setShowOriginalityReport] = useState(false);
  const [originalityData, setOriginalityData] = useState<Array<{ id: string; proofBarId: string; similarity: number; username?: string }>>([]);
  const [isCheckingOriginality, setIsCheckingOriginality] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [isAraOpen, setIsAraOpen] = useState(false);

  const isOwner = currentUser?.id === bar.user.id;
  const isLocked = (bar as any).isLocked;

  // Use pre-fetched like data from bar if available, otherwise fetch
  const hasPreFetchedLikes = 'liked' in bar && 'likeCount' in bar;
  
  const { data: likesData } = useQuery({
    queryKey: ['likes', bar.id],
    queryFn: () => api.getLikes(bar.id),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled: !hasPreFetchedLikes, // Skip fetch if we already have the data
    initialData: hasPreFetchedLikes ? { count: (bar as any).likeCount, liked: (bar as any).liked } : undefined,
  });

  const { data: bookmarkData } = useQuery({
    queryKey: ['bookmark', bar.id],
    queryFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/bookmark`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!currentUser,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: commentsData = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', bar.id],
    queryFn: () => api.getComments(bar.id),
    enabled: showComments,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.toggleLike(bar.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['likes', bar.id] });
      const previousLikes = queryClient.getQueryData<{ count: number; liked: boolean }>(['likes', bar.id]);
      const newLiked = !previousLikes?.liked;
      const newCount = (previousLikes?.count || 0) + (newLiked ? 1 : -1);
      queryClient.setQueryData(['likes', bar.id], { count: Math.max(0, newCount), liked: newLiked });
      if (newLiked) {
        const previousDislikes = queryClient.getQueryData<{ count: number; disliked: boolean }>(['dislikes', bar.id]);
        if (previousDislikes?.disliked) {
          queryClient.setQueryData(['dislikes', bar.id], { count: Math.max(0, previousDislikes.count - 1), disliked: false });
        }
      }
      return { previousLikes };
    },
    onSuccess: (data) => {
      console.log('[LIKE SUCCESS]', data);
      queryClient.setQueryData(['likes', bar.id], { count: data.count, liked: data.liked });
    },
    onError: (error: any, _, context) => {
      if (context?.previousLikes) {
        queryClient.setQueryData(['likes', bar.id], context.previousLikes);
      }
      console.error('[LIKE ERROR]', error.message);
      if (error.message.includes("Not authenticated")) {
        toast({ title: "Login required", description: "You need to be logged in to like posts", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save like. Please try again.", variant: "destructive" });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', bar.id] });
      queryClient.invalidateQueries({ queryKey: ['dislikes', bar.id] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      queryClient.invalidateQueries({ queryKey: ['bars-featured'] });
      queryClient.invalidateQueries({ queryKey: ['bars-top'] });
      queryClient.invalidateQueries({ queryKey: ['bars-trending'] });
    },
  });

  // Use pre-fetched dislike data from bar if available, otherwise fetch
  const hasPreFetchedDislikes = 'disliked' in bar && 'dislikeCount' in bar;
  
  const { data: dislikesData } = useQuery({
    queryKey: ['dislikes', bar.id],
    queryFn: () => api.getDislikes(bar.id),
    staleTime: 30000,
    refetchOnWindowFocus: false,
    enabled: !hasPreFetchedDislikes,
    initialData: hasPreFetchedDislikes ? { count: (bar as any).dislikeCount, disliked: (bar as any).disliked } : undefined,
  });

  const dislikeMutation = useMutation({
    mutationFn: () => api.toggleDislike(bar.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['dislikes', bar.id] });
      const previousDislikes = queryClient.getQueryData<{ count: number; disliked: boolean }>(['dislikes', bar.id]);
      const newDisliked = !previousDislikes?.disliked;
      const newCount = (previousDislikes?.count || 0) + (newDisliked ? 1 : -1);
      queryClient.setQueryData(['dislikes', bar.id], { count: Math.max(0, newCount), disliked: newDisliked });
      if (newDisliked) {
        const previousLikes = queryClient.getQueryData<{ count: number; liked: boolean }>(['likes', bar.id]);
        if (previousLikes?.liked) {
          queryClient.setQueryData(['likes', bar.id], { count: Math.max(0, previousLikes.count - 1), liked: false });
        }
      }
      return { previousDislikes };
    },
    onError: (error: any, _, context) => {
      if (context?.previousDislikes) {
        queryClient.setQueryData(['dislikes', bar.id], context.previousDislikes);
      }
      if (error.message.includes("Not authenticated")) {
        toast({ title: "Login required", description: "You need to be logged in to dislike posts", variant: "destructive" });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dislikes', bar.id] });
      queryClient.invalidateQueries({ queryKey: ['likes', bar.id] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      queryClient.invalidateQueries({ queryKey: ['bars-featured'] });
      queryClient.invalidateQueries({ queryKey: ['bars-top'] });
      queryClient.invalidateQueries({ queryKey: ['bars-trending'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => api.createComment(bar.id, content),
    onSuccess: () => {
      setNewComment("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['comments', bar.id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: () => {
      refetchComments();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateBar(bar.id, {
      content: editContent,
      explanation: editExplanation || undefined,
      category: editCategory,
      tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      barType: editBarType,
      fullRapLink: editFullRapLink.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      toast({ title: "Bar updated" });
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteBar(bar.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      toast({ title: "Bar deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          barId: bar.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Thank you for helping keep the community safe." });
      setIsReportOpen(false);
      setReportReason("");
      setReportDetails("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/bookmark`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookmark', bar.id] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      toast({ title: data.bookmarked ? "Saved!" : "Removed from saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to bookmark", variant: "destructive" });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bars/${bar.id}/lock`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      queryClient.invalidateQueries({ queryKey: ['bars-featured'] });
      queryClient.invalidateQueries({ queryKey: ['bars-trending'] });
      setIsLockDialogOpen(false);
      toast({ 
        title: "Bar Locked & Authenticated!", 
        description: "Your bar now has a permanent proof-of-origin certificate and cannot be edited." 
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { offset, handlers: swipeHandlers } = useSwipeGesture({
    onSwipeRight: () => {
      if (currentUser && !likesData?.liked) {
        likeMutation.mutate();
      }
    },
    onSwipeLeft: () => {
      if (currentUser) {
        bookmarkMutation.mutate();
      }
    },
    threshold: 80,
    enabled: !!currentUser,
  });

  const handleBookmark = () => {
    if (!currentUser) {
      toast({ title: "Login required", description: "You need to be logged in to save bars", variant: "destructive" });
      return;
    }
    bookmarkMutation.mutate();
  };

  const createMarkup = (html: string) => {
    return { __html: html };
  };

  const handleLike = () => {
    if (!currentUser) {
      toast({ title: "Login required", description: "You need to be logged in to like posts", variant: "destructive" });
      return;
    }
    likeMutation.mutate();
  };

  const handleDislike = () => {
    if (!currentUser) {
      toast({ title: "Login required", description: "You need to be logged in to dislike posts", variant: "destructive" });
      return;
    }
    dislikeMutation.mutate();
  };

  const handleComment = () => {
    if (!currentUser) {
      toast({ title: "Login required", description: "You need to be logged in to comment", variant: "destructive" });
      return;
    }
    if (newComment.trim()) {
      commentMutation.mutate(newComment.trim());
    }
  };

  const handleShare = async () => {
    const result = await shareContent(getBarShareData(bar));
    if (result.success) {
      toast({
        title: result.method === "clipboard" ? "Link copied!" : "Shared!",
        description: result.method === "clipboard" 
          ? "Bar link copied to clipboard" 
          : "Bar shared successfully",
      });
    } else {
      toast({
        title: "Share failed",
        description: "Unable to share. Please try copying the link manually.",
        variant: "destructive",
      });
    }
  };

  const handleCheckOriginality = async () => {
    setIsCheckingOriginality(true);
    try {
      const similar = await api.checkSimilarBars(bar.content);
      const filteredSimilar = similar.filter(s => s.id !== bar.id);
      setOriginalityData(filteredSimilar);
      setShowOriginalityReport(true);
    } catch (error) {
      toast({
        title: "Check failed",
        description: "Could not check originality. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOriginality(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...swipeHandlers}
        style={{ 
          transform: `translateX(${offset}px)`,
          transition: offset === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        className="relative"
      >
        {offset > 40 && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-red-500">
            <Heart className="h-8 w-8 fill-current" />
          </div>
        )}
        {offset < -40 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-primary">
            <Bookmark className="h-8 w-8 fill-current" />
          </div>
        )}
        <Card className="glass-card border-white/[0.08] overflow-hidden hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <Link href={`/u/${bar.user.username}`}>
                <Avatar className="h-10 w-10 border border-white/10 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  <AvatarImage src={bar.user.avatarUrl || undefined} alt={bar.user.username} />
                  <AvatarFallback>{bar.user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <Link href={`/u/${bar.user.username}`}>
                    <span className="font-bold text-sm hover:text-primary cursor-pointer transition-colors" data-testid={`text-author-${bar.id}`}>
                      @{bar.user.username}
                    </span>
                  </Link>
                  {(bar.user.level ?? 1) > 1 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-purple-400" title={`Level ${bar.user.level}`}>
                      {(bar.user.level ?? 1) >= 10 ? (
                        <Crown className="h-3 w-3 text-amber-400" />
                      ) : (
                        <Star className="h-3 w-3" />
                      )}
                      <span className="font-medium">{bar.user.level}</span>
                    </span>
                  )}
                  {bar.user.membershipTier !== "free" && (
                    <span className="text-[10px] text-primary">✓</span>
                  )}
                  {bar.user.username.toLowerCase() === "milsling" && (
                    <Badge className="ml-1 badge-founder-electric text-white text-[9px] px-1.5 py-0 h-4">
                      OB FOUNDER
                    </Badge>
                  )}
                  {(bar.user as any).isAdminPlus && (
                    <Badge className="ml-1 bg-red-600/90 text-white text-[9px] px-1.5 py-0 h-4 shadow-[0_0_10px_rgba(255,0,0,0.6)] animate-pulse">
                      Admin+
                    </Badge>
                  )}
                  {(bar.user as any).isAdmin && !(bar.user as any).isAdminPlus && !(bar.user as any).isOwner && (
                    <Badge className="ml-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0 h-4">
                      Admin
                    </Badge>
                  )}
                  <UserProfileBadges userId={bar.user.id} size="xs" maxBadges={3} />
                </div>
                <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${bar.id}`}>
                  {formatTimestamp(bar.createdAt)}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-more-${bar.id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCheckOriginality} disabled={isCheckingOriginality} data-testid={`button-originality-${bar.id}`}>
                  <Search className="h-4 w-4 mr-2" />
                  {isCheckingOriginality ? "Checking..." : "Originality Check"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAraOpen(true)} data-testid={`button-ara-${bar.id}`}>
                  <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                  Break It Down
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    {!isLocked && (
                      <DropdownMenuItem onClick={() => { setEditContent(stripHtml(bar.content)); setIsEditOpen(true); }} data-testid={`button-edit-${bar.id}`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {!isLocked && bar.isOriginal && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsLockDialogOpen(true)} className="text-primary" data-testid={`button-lock-${bar.id}`}>
                          <LockKeyhole className="h-4 w-4 mr-2" />
                          Lock & Authenticate
                        </DropdownMenuItem>
                      </>
                    )}
                    {isLocked && (
                      <DropdownMenuItem disabled className="text-muted-foreground opacity-50">
                        <Lock className="h-4 w-4 mr-2" />
                        Locked (Cannot Edit)
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive" data-testid={`button-delete-${bar.id}`}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwner && currentUser && (
                  <DropdownMenuItem onClick={() => setIsReportOpen(true)} className="text-orange-500" data-testid={`button-report-${bar.id}`}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="relative pl-4 border-l-2 border-primary/50 py-1">
              <p 
                className="font-display text-lg md:text-xl leading-relaxed whitespace-pre-wrap text-foreground/90 [&>b]:text-primary [&>b]:font-black [&>i]:text-primary/80 [&>u]:decoration-primary [&>u]:decoration-2 [&>u]:underline-offset-4 [&_*]:!text-inherit"
                style={{ color: 'inherit' }}
                data-testid={`text-content-${bar.id}`}
                dangerouslySetInnerHTML={createMarkup(bar.content)}
              />
            </div>
            
            {bar.explanation && (
              <div className="bg-secondary/30 p-3 rounded-md text-sm text-muted-foreground italic" data-testid={`text-explanation-${bar.id}`}>
                <span className="font-bold text-primary/80 not-italic mr-2">Breakdown:</span>
                {bar.explanation}
              </div>
            )}

            {(bar as any).fullRapLink && (
              <a
                href={(bar as any).fullRapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                data-testid={`link-full-rap-${bar.id}`}
              >
                <Music className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                  {(bar as any).isRecorded ? "Listen to full track" : "Check out full rap"}
                </span>
                <ExternalLink className="h-3 w-3 text-purple-400/60 group-hover:text-purple-300 transition-colors ml-auto" />
              </a>
            )}

            {(bar as any).beatLink && (
              <BarMediaPlayer beatLink={(bar as any).beatLink} compact />
            )}

            {bar.proofBarId && isLocked && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-3 space-y-2" data-testid={`proof-section-${bar.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-mono font-bold text-primary" data-testid={`text-proof-id-${bar.id}`}>
                      {bar.proofBarId}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(bar.proofBarId || '');
                        toast({ title: "Copied!", description: "Proof ID copied to clipboard" });
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Copy Proof ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {bar.permissionStatus === "share_only" && (
                      <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/30 text-blue-400" data-testid={`badge-permission-${bar.id}`}>
                        <Share2 className="h-3 w-3" />
                        Share Only
                      </Badge>
                    )}
                    {bar.permissionStatus === "open_adopt" && (
                      <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-400" data-testid={`badge-permission-${bar.id}`}>
                        <Users className="h-3 w-3" />
                        Open Adopt
                      </Badge>
                    )}
                    {bar.permissionStatus === "private" && (
                      <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30 text-amber-400" data-testid={`badge-permission-${bar.id}`}>
                        <Lock className="h-3 w-3" />
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
                {bar.proofHash && (
                  <div className="text-[10px] font-mono text-muted-foreground/60 truncate" title={bar.proofHash}>
                    SHA256: {bar.proofHash.substring(0, 16)}...{bar.proofHash.substring(bar.proofHash.length - 8)}
                  </div>
                )}
                <button
                  onClick={() => setShowProofScreenshot(true)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors mt-2"
                  data-testid={`button-proof-screenshot-${bar.id}`}
                >
                  <Image className="h-3 w-3" />
                  <span>Generate Proof Screenshot</span>
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {bar.isOriginal && (
                <Badge className="bg-primary/20 text-primary text-xs font-bold" data-testid={`badge-original-${bar.id}`}>
                  OC
                </Badge>
              )}
              {bar.feedbackWanted && (
                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs gap-1" data-testid={`badge-feedback-${bar.id}`}>
                  <MessageSquarePlus className="h-3 w-3" />
                  Breakdown Requested
                </Badge>
              )}
              {(bar as any).barType && (bar as any).barType !== "single_bar" && (
                <Badge variant="outline" className={`text-[10px] gap-1 ${(bar as any).barType === "snippet" ? "border-violet-500/30 text-violet-400" : "border-fuchsia-500/30 text-fuchsia-400"}`} data-testid={`badge-type-${bar.id}`}>
                  {(bar as any).barType === "snippet" ? "Snippet" : "Half Verse"}
                </Badge>
              )}
              <Badge variant="outline" className="border-primary/20 text-primary/80 hover:bg-primary/10" data-testid={`badge-category-${bar.id}`}>
                {bar.category}
              </Badge>
              {bar.tags && bar.tags.length > 0 && (
                <CollapsibleTags tags={bar.tags} barId={bar.id} customTags={customTags} />
              )}
            </div>
          </CardContent>

          <CardFooter className="border-t border-white/5 py-3 flex-col px-2 sm:px-4">
            <div className="flex w-full items-center justify-center gap-1 sm:gap-2 text-muted-foreground">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-1 sm:gap-2 px-2 sm:px-3 transition-colors ${likesData?.liked ? 'text-red-500' : 'hover:text-red-500 hover:bg-red-500/10'}`}
                onClick={handleLike}
                disabled={likeMutation.isPending}
                data-testid={`button-like-${bar.id}`}
              >
                <Heart className={`h-4 w-4 ${likesData?.liked ? 'fill-current' : ''}`} />
                <span className="text-xs">{likesData?.count || 0}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-1 px-2 sm:px-3 transition-colors ${dislikesData?.disliked ? 'text-orange-500' : 'hover:text-orange-500 hover:bg-orange-500/10'}`}
                onClick={handleDislike}
                disabled={dislikeMutation.isPending}
                data-testid={`button-dislike-${bar.id}`}
              >
                <ThumbsDown className={`h-4 w-4 ${dislikesData?.disliked ? 'fill-current' : ''}`} />
                <span className="text-xs">{dislikesData?.count || 0}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-1 sm:gap-2 px-2 sm:px-3 transition-colors ${showComments ? 'text-blue-400' : 'hover:text-blue-400 hover:bg-blue-400/10'}`}
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comment-${bar.id}`}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{showComments ? commentsData.length : (bar as any).commentCount || 0}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 sm:gap-2 px-2 sm:px-3 hover:text-primary hover:bg-primary/10 transition-colors" 
                onClick={handleShare}
                data-testid={`button-share-${bar.id}`}
              >
                <Share2 className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Share</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-1 sm:gap-2 px-2 sm:px-3 transition-colors ${bookmarkData?.bookmarked ? 'text-primary' : 'hover:text-primary hover:bg-primary/10'}`}
                onClick={handleBookmark}
                disabled={bookmarkMutation.isPending}
                data-testid={`button-bookmark-${bar.id}`}
              >
                <Bookmark className={`h-4 w-4 ${bookmarkData?.bookmarked ? 'fill-current' : ''}`} />
                <span className="text-xs hidden sm:inline">Save</span>
              </Button>
            </div>

            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full mt-4 overflow-hidden"
                >
                  <div className="space-y-3">
                    {currentUser && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                          className="flex-1 bg-secondary/30"
                          data-testid={`input-comment-${bar.id}`}
                        />
                        <Button 
                          size="icon" 
                          onClick={handleComment}
                          disabled={!newComment.trim() || commentMutation.isPending}
                          data-testid={`button-send-comment-${bar.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {commentsData.map((comment: any) => (
                          <CommentItem
                            key={comment.id}
                            comment={comment}
                            currentUserId={currentUser?.id}
                            onDelete={() => deleteCommentMutation.mutate(comment.id)}
                          />
                        ))}
                        {commentsData.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Bar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-content">Your Bar</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] font-mono"
                data-testid="input-edit-content"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-explanation">Explanation (optional)</Label>
              <Textarea
                id="edit-explanation"
                value={editExplanation}
                onChange={(e) => setEditExplanation(e.target.value)}
                placeholder="Explain the wordplay or meaning..."
                data-testid="input-edit-explanation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="hiphop, bars, fire"
                data-testid="input-edit-tags"
              />
            </div>
            <div className="space-y-2">
              <Label>Bar Type</Label>
              <div className="flex gap-2">
                {[
                  { value: "single_bar", label: "Single" },
                  { value: "snippet", label: "Snippet" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setEditBarType(type.value)}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm transition-all ${
                      editBarType === type.value 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border/50 bg-secondary/30 hover:border-border text-muted-foreground'
                    }`}
                    data-testid={`button-edit-type-${type.value}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {BAR_TYPE_INFO[editBarType as BarType]?.detail}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-link">Full Rap Link (optional)</Label>
              <Input
                id="edit-link"
                type="url"
                value={editFullRapLink}
                onChange={(e) => setEditFullRapLink(e.target.value)}
                placeholder="https://soundcloud.com/..."
                data-testid="input-edit-link"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                const lineBreaks = countLineBreaks(editContent);
                const maxLines = LINE_BREAK_LIMITS[editBarType as BarType];
                if (lineBreaks > maxLines) {
                  toast({
                    title: "Too many lines",
                    description: `${BAR_TYPE_INFO[editBarType as BarType].label} allows max ${maxLines} line break${maxLines === 1 ? '' : 's'}. You have ${lineBreaks}.`,
                    variant: "destructive",
                  });
                  return;
                }
                updateMutation.mutate();
              }} 
              disabled={updateMutation.isPending || !editContent.trim()}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bar?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your bar will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Lock & Authenticate This Bar?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Locking your bar will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Generate a permanent proof-of-origin certificate</strong> that can be shared and verified</li>
                <li><strong>Make the bar uneditable</strong> - you won't be able to change the content after locking</li>
                <li><strong>Protect your authorship</strong> - the certificate proves you created this bar at this time</li>
              </ul>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200">
                  <strong>This action cannot be undone.</strong> Once locked, you cannot edit the bar content. 
                  Make sure you're happy with your bar before locking.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => lockMutation.mutate()}
              disabled={lockMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-confirm-lock"
            >
              {lockMutation.isPending ? "Locking..." : "Lock & Authenticate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-orange-500" />
              Report this bar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="illegal_content">Illegal Content (CSAM, exploitation)</SelectItem>
                  <SelectItem value="harassment">Harassment / Threats</SelectItem>
                  <SelectItem value="hate_speech">Hate Speech</SelectItem>
                  <SelectItem value="self_harm">Self-Harm / Violence</SelectItem>
                  <SelectItem value="spam">Spam / Scam</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional details (optional)</Label>
              <Textarea
                placeholder="Provide any additional context..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                data-testid="input-report-details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => reportMutation.mutate()} 
              disabled={!reportReason || reportMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProofScreenshot
        bar={bar}
        open={showProofScreenshot}
        onOpenChange={setShowProofScreenshot}
      />

      <Dialog open={showOriginalityReport} onOpenChange={setShowOriginalityReport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {originalityData.length > 0 ? (
                <><AlertTriangle className="h-5 w-5 text-orange-500" /> Originality Report</>
              ) : (
                <><CheckCircle className="h-5 w-5 text-green-500" /> Originality Report</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${originalityData.length > 0 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
              {originalityData.length > 0 ? (
                <p className="text-sm text-orange-500">
                  Found {originalityData.length} similar bar{originalityData.length > 1 ? 's' : ''} on Orphan Bars
                </p>
              ) : (
                <p className="text-sm text-green-500 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  No similar content found - this appears to be original!
                </p>
              )}
            </div>

            {originalityData.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {originalityData.map((match) => (
                  <div key={match.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg border border-border/50">
                    <div>
                      <span className="text-sm font-mono text-primary">{match.proofBarId}</span>
                      <p className="text-xs text-muted-foreground">by @{match.username || 'Unknown'}</p>
                    </div>
                    <span className="text-sm font-bold text-orange-500">{match.similarity}% match</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOriginalityReport(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIAssistant 
        open={isAraOpen} 
        onOpenChange={setIsAraOpen}
        hideFloatingButton
        initialPrompt={isAraOpen ? `Break down this bar for me and explain the wordplay, punchlines, and meaning:\n\n"${stripHtml(bar.content)}"` : undefined}
      />
    </>
  );
}
