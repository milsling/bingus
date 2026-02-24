import { useState, useRef } from "react";
import { Upload, X, Check, AlertCircle } from "lucide-react";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackgroundUploadResponse {
  id: string;
  name: string;
  imageUrl: string;
}

export function BackgroundUploader() {
  const { currentUser } = useBars();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Fetch custom backgrounds to refresh after upload
  const { data: customBackgrounds = [] } = useQuery({
    queryKey: ["backgrounds"],
    queryFn: async () => {
      const res = await fetch("/api/backgrounds");
      if (!res.ok) throw new Error("Failed to fetch backgrounds");
      return res.json();
    },
    staleTime: 300_000,
  });

  const handleFile = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, or WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', file.name.split('.')[0]);

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
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', '/api/backgrounds');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token') || ''}`);
      xhr.send(formData);

      const result = await uploadPromise;

      toast({
        title: "Background uploaded!",
        description: `"${result.name}" has been added to your backgrounds.`,
      });

      // Refresh backgrounds list
      queryClient.invalidateQueries({ queryKey: ["backgrounds"] });
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
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
        <p className="text-sm font-medium">Owner Only Feature</p>
        <p className="text-xs mt-1">Only the site owner can upload custom backgrounds</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-border/50 hover:border-border/80 hover:bg-white/[0.02]",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Uploading...</p>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {dragActive ? "Drop image here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or WebP • Max 5MB
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="pointer-events-none"
              disabled
            >
              Choose File
            </Button>
          </div>
        )}
      </div>

      {/* Show uploaded backgrounds count */}
      {customBackgrounds.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            You have uploaded {customBackgrounds.length} custom background{customBackgrounds.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
