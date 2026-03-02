import { useContext, useState } from "react";
import { Pencil, Trash2, LockKeyhole, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { SupabaseAuthContext } from "@/context/SupabaseAuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeGlassCard } from "@/components/ui/native-shell";
import type { BarWithUser } from "@shared/schema";

interface BarOwnerActionsProps {
  bar: BarWithUser;
  isLocked: boolean;
}

export function BarOwnerActions({ bar, isLocked }: BarOwnerActionsProps) {
  const { currentUser } = useBars();
  const { session } = useContext(SupabaseAuthContext);
  const { toast } = useToast();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const isOwner = currentUser?.id === bar.user.id;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = session?.access_token || localStorage.getItem("token") || "";
      const res = await fetch(`/api/bars/${bar.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to delete bar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bars"] });
      toast({
        title: "Bar deleted",
        description: "Your bar has been permanently deleted.",
      });
      setIsDeleteOpen(false);
      // Navigate away after deletion
      window.location.href = '/';
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const token = session?.access_token || localStorage.getItem("token") || "";
      const res = await fetch(`/api/bars/${bar.id}/lock`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to lock bar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bars"] });
      toast({
        title: "Bar locked & authenticated",
        description: "Your bar now has a permanent proof-of-origin certificate.",
      });
      setIsLockDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { content: string; explanation?: string; category?: string }) => {
      const token = session?.access_token || localStorage.getItem("token") || "";
      const res = await fetch(`/api/bars/${bar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update bar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bars"] });
      toast({
        title: "Bar updated",
        description: "Your bar has been successfully updated.",
      });
      setIsEditOpen(false);
      setEditContent("");
      setEditExplanation("");
      setEditCategory("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (editContent.trim()) {
      editMutation.mutate({
        content: editContent,
        explanation: editExplanation || undefined,
        category: editCategory || undefined,
      });
    }
  };

  if (!isOwner) return null;

  return (
    <>
      {/* Edit Dropdown Menu Item */}
      {!isLocked && (
        <DropdownMenuItem 
          onSelect={() => { 
            setEditContent(bar.content.replace(/<[^>]*>/g, "")); 
            setIsEditOpen(true); 
          }} 
          data-testid={`button-edit-${bar.id}`}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
      )}

      {/* Lock Dropdown Menu Item */}
      {!isLocked && bar.isOriginal && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={() => setIsLockDialogOpen(true)} 
            className="text-primary" 
            data-testid={`button-lock-${bar.id}`}
          >
            <LockKeyhole className="h-4 w-4 mr-2" />
            Lock & Authenticate
          </DropdownMenuItem>
        </>
      )}

      {/* Locked Status Item */}
      {isLocked && (
        <DropdownMenuItem disabled className="text-muted-foreground opacity-50">
          <Lock className="h-4 w-4 mr-2" />
          Locked (Cannot Edit)
        </DropdownMenuItem>
      )}

      {/* Delete Dropdown Menu Item */}
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onSelect={() => setIsDeleteOpen(true)} 
        className="text-destructive" 
        data-testid={`button-delete-${bar.id}`}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg glass-card">
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
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="punchline">Punchline</SelectItem>
                  <SelectItem value="wordplay">Wordplay</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="observation">Observation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={!editContent.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="glass-card">
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

      {/* Lock Alert Dialog */}
      <AlertDialog open={isLockDialogOpen} onOpenChange={setIsLockDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Lock & Authenticate This Bar?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Locking your bar will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Generate a permanent proof-of-origin certificate</strong> that can be shared and verified</li>
                <li><strong>Prevent further edits</strong> to maintain authenticity</li>
                <li><strong>Add verification badges</strong> to show it's authenticated content</li>
              </ul>
              <NativeGlassCard className="bg-amber-500/10 border-amber-500/20">
                <p className="text-xs text-amber-400">
                  <strong>Important:</strong> Once locked, the bar cannot be edited. 
                  Make sure you're happy with your bar before locking.
                </p>
              </NativeGlassCard>
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
    </>
  );
}
