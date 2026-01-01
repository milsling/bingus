import { useState } from "react";
import type { BarWithUser } from "@shared/schema";
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Send, X } from "lucide-react";
import { shareContent, getBarShareData } from "@/lib/share";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const CATEGORIES = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"];

export default function BarCard({ bar }: BarCardProps) {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editContent, setEditContent] = useState(bar.content);
  const [editExplanation, setEditExplanation] = useState(bar.explanation || "");
  const [editCategory, setEditCategory] = useState(bar.category);
  const [editTags, setEditTags] = useState(bar.tags?.join(", ") || "");

  const isOwner = currentUser?.id === bar.user.id;

  const { data: likesData } = useQuery({
    queryKey: ['likes', bar.id],
    queryFn: () => api.getLikes(bar.id),
  });

  const { data: commentsData = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', bar.id],
    queryFn: () => api.getComments(bar.id),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.toggleLike(bar.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', bar.id] });
    },
    onError: (error: any) => {
      if (error.message.includes("Not authenticated")) {
        toast({ title: "Login required", description: "You need to be logged in to like posts", variant: "destructive" });
      }
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
      toast({ title: "Bar deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 transition-colors duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={bar.user.avatarUrl || undefined} alt={bar.user.username} />
                <AvatarFallback>{bar.user.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm hover:text-primary cursor-pointer" data-testid={`text-author-${bar.id}`}>
                    @{bar.user.username}
                  </span>
                  {bar.user.membershipTier !== "free" && (
                    <span className="text-[10px] text-primary">✓</span>
                  )}
                  {bar.user.username.toLowerCase() === "milsling" && (
                    <Badge className="ml-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] px-1.5 py-0 h-4">
                      Creator
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${bar.id}`}>
                  {formatTimestamp(bar.createdAt)}
                </span>
              </div>
            </div>
            {isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-more-${bar.id}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)} data-testid={`button-edit-${bar.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteOpen(true)} className="text-destructive" data-testid={`button-delete-${bar.id}`}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-more-${bar.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="relative pl-4 border-l-2 border-primary/50 py-1">
              <p 
                className="font-display text-lg md:text-xl leading-relaxed whitespace-pre-wrap text-foreground/90 [&>b]:text-primary [&>b]:font-black [&>i]:text-primary/80 [&>u]:decoration-primary [&>u]:decoration-2 [&>u]:underline-offset-4"
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

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="border-primary/20 text-primary/80 hover:bg-primary/10" data-testid={`badge-category-${bar.id}`}>
                {bar.category}
              </Badge>
              {bar.tags && bar.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs text-muted-foreground" data-testid={`badge-tag-${tag}-${bar.id}`}>
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>

          <CardFooter className="border-t border-white/5 py-3 flex-col">
            <div className="flex w-full items-center justify-between text-muted-foreground">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`gap-2 transition-colors ${likesData?.liked ? 'text-red-500' : 'hover:text-red-500 hover:bg-red-500/10'}`}
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
                className={`gap-2 transition-colors ${showComments ? 'text-blue-400' : 'hover:text-blue-400 hover:bg-blue-400/10'}`}
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comment-${bar.id}`}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{commentsData.length || 0}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 hover:text-primary hover:bg-primary/10 transition-colors" 
                onClick={handleShare}
                data-testid={`button-share-${bar.id}`}
              >
                <Share2 className="h-4 w-4" />
                <span className="text-xs">Share</span>
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
                          <div key={comment.id} className="flex gap-2 p-2 bg-secondary/20 rounded-md">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={comment.user?.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">{comment.user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold">@{comment.user?.username}</span>
                                <span className="text-[10px] text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
                              </div>
                              <p className="text-sm text-foreground/80">{comment.content}</p>
                            </div>
                            {currentUser?.id === comment.userId && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => updateMutation.mutate()} 
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
    </>
  );
}
