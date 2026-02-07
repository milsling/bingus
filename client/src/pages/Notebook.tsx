import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useBars } from "@/context/BarContext";
import { useLocation } from "wouter";
import { BookOpen, Plus, Trash2, Save, ArrowLeft, FileText, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Navigation from "@/components/Navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Notebook {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotebookPage() {
  const { currentUser: user } = useBars();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const { data: notebooks = [], isLoading } = useQuery<Notebook[]>({
    queryKey: ['notebooks'],
    queryFn: async () => {
      const res = await fetch('/api/notebooks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notebooks');
      return res.json();
    },
    enabled: !!user,
  });

  const selectedNotebook = notebooks.find(n => n.id === selectedId);

  useEffect(() => {
    if (selectedNotebook) {
      setTitle(selectedNotebook.title);
      setContent(selectedNotebook.content);
      setHasChanges(false);
    }
  }, [selectedNotebook]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: 'Untitled', content: '' }),
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      return res.json();
    },
    onSuccess: (notebook) => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      setSelectedId(notebook.id);
      toast({ title: "New notebook created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error('Failed to save notebook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      setHasChanges(false);
      toast({ title: "Saved" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete notebook');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      setSelectedId(null);
      setTitle("");
      setContent("");
      toast({ title: "Notebook deleted" });
    },
  });

  const handleSave = useCallback(() => {
    if (selectedId && hasChanges) {
      updateMutation.mutate({ id: selectedId, title, content });
    }
  }, [selectedId, title, content, hasChanges, updateMutation]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
    
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (selectedId) {
        updateMutation.mutate({ id: selectedId, title, content: newContent });
      }
    }, 2000);
    
    setAutoSaveTimeout(timeout);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-14 pb-20 md:pb-4 md:pt-24">
        <Navigation />
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Please log in to use the notebook</p>
            <Button onClick={() => navigate('/auth')}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <Navigation />
      <div className="container max-w-6xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/apps')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <BookOpen className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-logo)' }}>Notebook</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Your Documents</CardTitle>
                  <Button 
                    size="sm" 
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                    data-testid="button-new-notebook"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : notebooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents yet</p>
                    <p className="text-xs">Create your first notebook</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    <div className="space-y-2">
                      {notebooks.map((notebook) => (
                        <motion.div
                          key={notebook.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                        >
                          <div
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedId === notebook.id
                                ? 'bg-primary/10 border border-primary'
                                : 'bg-muted/50 hover:bg-muted'
                            }`}
                            onClick={() => setSelectedId(notebook.id)}
                            data-testid={`notebook-item-${notebook.id}`}
                          >
                            <p className="font-medium text-sm truncate">{notebook.title || 'Untitled'}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(notebook.updatedAt), { addSuffix: true })}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="h-full">
              {selectedId ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Untitled"
                        className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0"
                        data-testid="input-notebook-title"
                      />
                      <div className="flex items-center gap-1">
                        {hasChanges && (
                          <span className="text-xs text-muted-foreground">Unsaved</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSave}
                          disabled={!hasChanges || updateMutation.isPending}
                          data-testid="button-save-notebook"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete notebook?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{title || 'Untitled'}". This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(selectedId)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Start writing your bars, verses, and ideas..."
                      className="min-h-[50vh] resize-none font-mono"
                      data-testid="textarea-notebook-content"
                    />
                  </CardContent>
                </>
              ) : (
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a document or create a new one</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
