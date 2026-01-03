import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Image, Share2 } from "lucide-react";
import type { BarWithUser } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ProofScreenshotProps {
  bar: BarWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export default function ProofScreenshot({ bar, open, onOpenChange }: ProofScreenshotProps) {
  const proofRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateImage = async (): Promise<Blob | null> => {
    if (!proofRef.current) return null;
    
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(proofRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1a1a2e',
      });
      
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) {
      toast({ title: "Error", description: "Failed to generate proof image", variant: "destructive" });
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bar.proofBarId || 'proof'}.png`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Downloaded!", description: "Proof image saved to your device" });
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) {
      toast({ title: "Error", description: "Failed to generate proof image", variant: "destructive" });
      return;
    }
    
    const file = new File([blob], `${bar.proofBarId || 'proof'}.png`, { type: 'image/png' });
    
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Proof of Origin: ${bar.proofBarId}`,
          text: `Check out this bar on Orphan Bars - ${bar.proofBarId}`,
          files: [file],
        });
        toast({ title: "Shared!", description: "Proof image shared successfully" });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast({ title: "Share failed", description: "Could not share the image", variant: "destructive" });
        }
      }
    } else {
      handleDownload();
    }
  };

  const permissionLabel = {
    share_only: "Share Only",
    open_adopt: "Open Adopt",
    private: "Private",
  }[bar.permissionStatus || "share_only"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            Proof of Origin
          </DialogTitle>
          <DialogDescription>
            Download or share this proof screenshot to verify authenticity
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-border">
          <div
            ref={proofRef}
            className="p-6 space-y-4"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">OB</span>
                </div>
                <span className="text-white font-bold text-lg">ORPHAN BARS</span>
              </div>
              <div className="text-xs text-purple-400 font-mono">
                {bar.proofBarId}
              </div>
            </div>

            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                {stripHtml(bar.content)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>by</span>
              <span className="text-purple-400 font-bold">@{bar.user.username}</span>
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300 font-mono">
                  {format(new Date(bar.createdAt), "yyyy-MM-dd HH:mm:ss 'UTC'")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Permission</span>
                <span className="text-purple-400">{permissionLabel}</span>
              </div>
              {bar.proofHash && (
                <div className="text-xs">
                  <span className="text-gray-500">SHA256: </span>
                  <span className="text-gray-400 font-mono break-all text-[10px]">
                    {bar.proofHash}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-gray-600 pt-2">
              orphanbars.com • Immutable Proof of Lyrical Origin
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            disabled={isGenerating}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
