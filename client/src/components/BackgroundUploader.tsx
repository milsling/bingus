import { useState, useRef, useContext } from "react";
import { Upload, X, Check, AlertCircle, Pencil, Trash2, Wand2, Loader2 } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SupabaseAuthContext } from "@/context/SupabaseAuthContext";

interface BackgroundUploadResponse {
  id: string;
  name: string;
  imageUrl: string;
}

interface CustomBackground {
  sid: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export function BackgroundUploader() {
  const { currentUser } = useBars();
  const { session } = useContext(SupabaseAuthContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Pending file state (preview before upload)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("");

  // Manage panel state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Fetch custom backgrounds (admin endpoint for manage panel)
  const { data: customBackgrounds = [] } = useQuery<CustomBackground[]>({
    queryKey: ["admin-backgrounds"],
    queryFn: async () => {
      const res = await fetch("/api/admin/backgrounds", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch backgrounds");
      return res.json();
    },
    staleTime: 60_000,
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/admin/backgrounds/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-backgrounds"] });
      queryClient.invalidateQueries({ queryKey: ["backgrounds"] });
      setEditingId(null);
      toast({ title: "Background renamed" });
    },
    onError: (e: any) => toast({ title: "Rename failed", description: e.message, variant: "destructive" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/backgrounds/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-backgrounds"] });
      queryClient.invalidateQueries({ queryKey: ["backgrounds"] });
      toast({ title: "Background deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file (JPG, PNG, or WebP)", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 10MB", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreview(preview);
    setPendingName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  };

  const cancelPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setPendingName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const suggestNameWithAI = async (file: File) => {
    if (isSuggestingName) return;

    setIsSuggestingName(true);
    try {
      const existingName = pendingName.trim();
      const normalizedFileName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: `Suggest one short, creative background image name (2-4 words, title case, no quotes, no punctuation at the end).\n\nImage filename: ${file.name}\nNormalized filename: ${normalizedFileName || "(none)"}\nFile type: ${file.type}\nFile size KB: ${Math.round(file.size / 1024)}\nCurrent draft name: ${existingName || "(none)"}\n\nReturn only the name.`,
          personalityMode: "helpful",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || data?.response || "AI naming is unavailable right now");
      }

      const raw = (data?.response || data?.message || "").toString().trim();
      const cleaned = raw
        .split("\n")[0]
        .replace(/^['"`]+|['"`]+$/g, "")
        .replace(/[.!?]+$/g, "")
        .trim()
        .slice(0, 60);

      if (!cleaned) {
        throw new Error("AI did not return a usable name");
      }

      setPendingName(cleaned);
      toast({ title: "Name suggested", description: `Try \"${cleaned}\"` });
    } catch (error: any) {
      const fallback = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 60);
      if (fallback && !pendingName.trim()) {
        setPendingName(fallback);
      }
      toast({
        title: "Couldn't generate AI name",
        description: error?.message || "Using a filename-based suggestion instead",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingName(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, or WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', pendingName || file.name.split('.')[0]);
      
      const xhr = new XMLHttpRequest();
      
      // Track progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      // Create promise to handle XHR
      const uploadPromise = new Promise<BackgroundUploadResponse>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errBody = JSON.parse(xhr.responseText);
              reject(new Error(errBody.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', '/api/backgrounds');
      // Use Supabase session token if available, otherwise fallback to localStorage token
      const token = session?.access_token || localStorage.getItem('token') || '';
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);

      const result = await uploadPromise;

      toast({
        title: "Background uploaded!",
        description: `"${result.name}" has been added to your backgrounds.`,
      });

      // Refresh backgrounds list
      queryClient.invalidateQueries({ queryKey: ["backgrounds"] });
      queryClient.invalidateQueries({ queryKey: ["admin-backgrounds"] });
      
      // Reset form
      cancelPending();
      setUploadProgress(0);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload background image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Please sign in to access background settings</p>
      </div>
    );
  }

  if (!currentUser.isOwner) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">Premium Feature</p>
        <p className="text-xs mt-1">Custom background uploads will be available soon</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Step 1: pending preview + name field */}
      {pendingFile ? (
        <div className="space-y-3">
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border/50 bg-black/10">
            <img src={pendingPreview!} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={cancelPending}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Background Name</label>
            <div className="flex gap-2">
              <Input
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder="Enter a name..."
                className="h-9 text-sm"
                maxLength={60}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => pendingFile && suggestNameWithAI(pendingFile)}
                disabled={!pendingFile || isSuggestingName || isUploading}
              >
                {isSuggestingName ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span className="ml-1.5">Suggest</span>
              </Button>
            </div>
          </div>
          {isUploading ? (
            <div className="space-y-1.5">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={cancelPending}>Cancel</Button>
              <Button
                size="sm"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!pendingName.trim()}
                onClick={() => handleFile(pendingFile)}
              >
                Upload
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200",
            dragActive ? "border-primary bg-primary/5" : "border-border/50 hover:border-border/80 hover:bg-white/[0.02]",
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-3 pointer-events-none">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {dragActive ? "Drop image here" : "Tap to choose from camera roll or drag & drop"}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP • Max 10MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Manage uploaded backgrounds */}
      {customBackgrounds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Uploaded ({customBackgrounds.length})
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {customBackgrounds.map((bg) => (
              <div key={bg.sid} className="flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-colors">
                <img src={bg.imageUrl} alt={bg.name} className="h-10 w-16 rounded-lg object-cover shrink-0 border border-border/30" />
                {editingId === bg.sid ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7 text-xs flex-1"
                    maxLength={60}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameMutation.mutate({ id: bg.sid, name: editingName });
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="text-sm flex-1 truncate">{bg.name}</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {editingId === bg.sid ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => renameMutation.mutate({ id: bg.sid, name: editingName })}
                        disabled={renameMutation.isPending}>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditingId(bg.sid); setEditingName(bg.name); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(bg.sid)}
                        disabled={deleteMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
