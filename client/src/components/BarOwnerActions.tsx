import { useState } from "react";
import { Pencil, Trash2, LockKeyhole, Lock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
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
  onEditComplete?: () => void;
  onDeleteComplete?: () => void;
  onLockComplete?: () => void;
}

export function BarOwnerActions({ 
  bar, 
  isLocked, 
  onEditComplete,
  onDeleteComplete,
  onLockComplete 
}: BarOwnerActionsProps) {
  const { user: currentUser } = useAuth();
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
      const res = await apiRequest("DELETE", `/api/bars/${bar.id}`);
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
      onDeleteComplete?.();
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
      const res = await apiRequest("POST", `/api/bars/${bar.id}/lock`);
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
      onLockComplete?.();
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
      const res = await apiRequest("PATCH", `/api/bars/${bar.id}`, data);
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
      onEditComplete?.();
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
          onClick={() => { 
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
            onClick={() => setIsLockDialogOpen(true)} 
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
        onClick={() => setIsDeleteOpen(true)} 
        className="text-destructive" 
        data-testid={`button-delete-${bar.id}`}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>

      {/* Edit Dialog */}
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={!editContent.trim() || editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
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

      {/* Lock Alert Dialog */}
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
