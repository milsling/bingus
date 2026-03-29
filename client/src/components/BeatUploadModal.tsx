import { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, Music } from "lucide-react";
import { generateWaveformFromFile } from "@/lib/waveform";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BeatUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function BeatUploadModal({ open, onClose }: BeatUploadModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    bpm: "",
    key: "",
    genre: "",
    tags: "",
    description: "",
    credits: "",
    licenseType: "preview_only",
    isPublic: true,
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsProcessing(true);

    try {
      const { peaks, duration: dur } = await generateWaveformFromFile(f);
      setWaveformData(peaks);
      setDuration(dur);
      // Auto-fill title from filename
      if (!form.title) {
        const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        setForm((prev) => ({ ...prev, title: name }));
      }
    } catch (err) {
      console.error("Failed to process audio:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [form.title]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      if (!form.title.trim()) throw new Error("Title required");

      // Step 1: Get signed upload URL
      const urlRes = await apiRequest("POST", "/api/beats/upload-url", {
        filename: file.name,
        contentType: file.type || "audio/mpeg",
      });
      const { signedUrl, publicUrl } = urlRes;

      // Step 2: Upload file to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "audio/mpeg" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      // Step 3: Create beat record
      const beat = await apiRequest("POST", "/api/beats", {
        title: form.title.trim(),
        audioUrl: publicUrl,
        waveformData: waveformData,
        bpm: form.bpm ? Number(form.bpm) : null,
        key: form.key || null,
        genre: form.genre || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        duration,
        description: form.description || null,
        credits: form.credits || null,
        licenseType: form.licenseType,
        isPublic: form.isPublic,
      });

      return beat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/beats/my"] });
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setFile(null);
    setWaveformData(null);
    setDuration(0);
    setForm({
      title: "",
      bpm: "",
      key: "",
      genre: "",
      tags: "",
      description: "",
      credits: "",
      licenseType: "preview_only",
      isPublic: true,
    });
  };

  if (!open) return null;

  const genres = [
    { value: "", label: "Select genre" },
    { value: "trap", label: "Trap" },
    { value: "boom_bap", label: "Boom Bap" },
    { value: "drill", label: "Drill" },
    { value: "lo_fi", label: "Lo-Fi" },
    { value: "west_coast", label: "West Coast" },
    { value: "east_coast", label: "East Coast" },
    { value: "melodic", label: "Melodic" },
    { value: "dark", label: "Dark" },
    { value: "experimental", label: "Experimental" },
    { value: "other", label: "Other" },
  ];

  const keys = [
    "", "C major", "C minor", "C# major", "C# minor",
    "D major", "D minor", "Eb major", "Eb minor",
    "E major", "E minor", "F major", "F minor",
    "F# major", "F# minor", "G major", "G minor",
    "Ab major", "Ab minor", "A major", "A minor",
    "Bb major", "Bb minor", "B major", "B minor",
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="glass-surface-strong w-full max-w-lg mx-4 rounded-2xl border border-border/40 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <h2 className="text-lg font-semibold text-foreground">Upload Beat</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* File drop zone */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="glass-field rounded-xl border-2 border-dashed border-border/40 p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-accent/40 transition-colors"
            >
              <Upload size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                Drop your beat here or click to browse
              </p>
              <p className="text-xs text-muted-foreground/60">MP3, WAV, OGG, FLAC — max 50MB</p>
            </div>
          ) : (
            <div className="glass-field rounded-xl p-3 flex items-center gap-3">
              <Music size={20} className="text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                  {duration > 0 && ` · ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`}
                </p>
              </div>
              {isProcessing && <Loader2 size={16} className="animate-spin text-accent" />}
              <button
                onClick={() => { setFile(null); setWaveformData(null); }}
                className="p-1 rounded-full hover:bg-white/10 text-muted-foreground"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none"
                placeholder="Beat title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">BPM</label>
                <input
                  type="number"
                  value={form.bpm}
                  onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                  className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none"
                  placeholder="140"
                  min="30"
                  max="300"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Key</label>
                <select
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none bg-transparent"
                >
                  {keys.map((k) => (
                    <option key={k} value={k}>{k || "Select key"}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none bg-transparent"
              >
                {genres.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none"
                placeholder="dark, aggressive, sample"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none resize-none"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                  className="accent-[hsl(var(--accent-color))]"
                />
                Make public in Beat Library
              </label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">License</label>
              <select
                value={form.licenseType}
                onChange={(e) => setForm({ ...form, licenseType: e.target.value })}
                className="glass-field w-full rounded-lg px-3 py-2 text-sm text-foreground border border-border/30 focus:border-accent/50 outline-none bg-transparent"
              >
                <option value="preview_only">Preview Only</option>
                <option value="open_use">Open Use</option>
                <option value="credit_required">Credit Required</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {uploadMutation.isError && (
            <p className="text-sm text-red-400">{(uploadMutation.error as Error).message}</p>
          )}

          {/* Submit */}
          <button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !form.title.trim() || isProcessing || uploadMutation.isPending}
            className="w-full py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30"
          >
            {uploadMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Uploading...
              </span>
            ) : (
              "Upload Beat"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
