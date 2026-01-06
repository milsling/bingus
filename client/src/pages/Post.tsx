import { useState, useRef, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Bold, Italic, Underline, MessageSquare, Shield, Share2, Users, Lock, AlertTriangle, Search, CheckCircle, Music } from "lucide-react";
import { validateBeatUrl } from "@/components/BarMediaPlayer";
import { Link, useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type SimilarBar = {
  id: string;
  proofBarId: string;
  permissionStatus: string;
  similarity: number;
  username?: string;
};

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";
const CATEGORIES: Category[] = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"];

type PermissionStatus = "share_only" | "open_adopt" | "private";
const PERMISSIONS: { value: PermissionStatus; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "share_only", label: "Share Only", icon: <Share2 className="h-4 w-4" />, description: "Others can share but not adopt" },
  { value: "open_adopt", label: "Open Adopt", icon: <Users className="h-4 w-4" />, description: "Others can adopt with credit" },
  { value: "private", label: "Private", icon: <Lock className="h-4 w-4" />, description: "Only visible on your profile" },
];

type BarType = "single_bar" | "snippet" | "half_verse";
const BAR_TYPES: { value: BarType; label: string; description: string; detail: string; disabled?: boolean; badge?: string }[] = [
  { value: "single_bar", label: "Single Bar", description: "1 line max", detail: "A single punchy line, punchline, or one-liner. Perfect for quick hits." },
  { value: "snippet", label: "Snippet", description: "Up to 4 lines", detail: "A short flow or a few connected bars. Great for showing off wordplay." },
  { value: "half_verse", label: "Half Verse", description: "Up to 8 lines", detail: "A longer section of a verse. Room to develop a full idea.", disabled: false },
];

const LINE_BREAK_LIMITS: Record<BarType, number> = {
  single_bar: 1,
  snippet: 4,
  half_verse: 8,
};

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

export default function Post() {
  const { addBar, currentUser } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [explanation, setExplanation] = useState("");
  const [category, setCategory] = useState<Category>("Freestyle");
  const [tags, setTags] = useState("");
  const [feedbackWanted, setFeedbackWanted] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("share_only");
  const [barType, setBarType] = useState<BarType>("single_bar");
  const [fullRapLink, setFullRapLink] = useState("");
  const [beatLink, setBeatLink] = useState("");
  const [isRecorded, setIsRecorded] = useState(false);
  const [isOriginal, setIsOriginal] = useState(true);
  const [lockImmediately, setLockImmediately] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [similarBars, setSimilarBars] = useState<SimilarBar[]>([]);
  const [showSimilarWarning, setShowSimilarWarning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showOriginalityReport, setShowOriginalityReport] = useState(false);
  const [originalityChecked, setOriginalityChecked] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLocation("/auth");
    }
  }, [currentUser, setLocation]);

  if (!currentUser) {
    return null;
  }

  const applyFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const getContent = () => {
    return editorRef.current?.innerHTML || "";
  };

  const doPost = async () => {
    const content = getContent();
    setIsSubmitting(true);
    try {
      const newBar = await addBar({
        content,
        explanation: explanation.trim() || undefined,
        category,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        feedbackWanted,
        permissionStatus,
        barType,
        fullRapLink: fullRapLink.trim() || undefined,
        beatLink: beatLink.trim() || undefined,
        isRecorded: fullRapLink.trim() ? isRecorded : false,
        isOriginal,
      });

      if (lockImmediately && isOriginal && newBar?.id) {
        try {
          const res = await fetch(`/api/bars/${newBar.id}/lock`, {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            const lockedBar = await res.json();
            toast({
              title: "Bars Dropped & Locked!",
              description: `Your bar is authenticated as ${lockedBar.proofBarId}`,
            });
          } else {
            toast({
              title: "Bars Dropped!",
              description: "Your lyric is live but locking failed. You can lock it from the menu.",
            });
          }
        } catch {
          toast({
            title: "Bars Dropped!",
            description: "Your lyric is live but locking failed. You can lock it from the menu.",
          });
        }
      } else {
        toast({
          title: "Bars Dropped!",
          description: "Your lyric is now live on the feed.",
        });
      }

      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Failed to post",
        description: error.message || "Could not post your bars. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const content = getContent();
    if (!content.trim() || content === "<br>") {
      toast({
        title: "Empty bars?",
        description: "You gotta spit something before you drop it.",
        variant: "destructive",
      });
      return;
    }

    const lineBreaks = countLineBreaks(content);
    const maxLines = LINE_BREAK_LIMITS[barType];
    if (lineBreaks > maxLines) {
      const typeLabel = BAR_TYPES.find(t => t.value === barType)?.label || barType;
      toast({
        title: "Too many lines",
        description: `${typeLabel} allows max ${maxLines} line break${maxLines === 1 ? '' : 's'}. You have ${lineBreaks}.`,
        variant: "destructive",
      });
      return;
    }

    if (beatLink.trim()) {
      const beatValidation = validateBeatUrl(beatLink);
      if (!beatValidation.valid) {
        toast({
          title: "Invalid beat link",
          description: beatValidation.error || "Only YouTube, SoundCloud, and Spotify links are supported.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsChecking(true);
    try {
      const similar = await api.checkSimilarBars(content);
      if (similar.length > 0) {
        setSimilarBars(similar);
        setShowSimilarWarning(true);
      } else {
        await doPost();
      }
    } catch (error) {
      await doPost();
    } finally {
      setIsChecking(false);
    }
  };

  const handlePostAnyway = async () => {
    setShowSimilarWarning(false);
    await doPost();
  };

  const checkOriginality = async () => {
    const content = getContent();
    if (!content.trim() || content === "<br>") {
      toast({
        title: "Nothing to check",
        description: "Write something first to check originality.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const similar = await api.checkSimilarBars(content);
      setSimilarBars(similar);
      setShowOriginalityReport(true);
      setOriginalityChecked(true);
    } catch (error) {
      toast({
        title: "Check failed",
        description: "Could not check originality. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-bold">Drop a Bar</h1>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            {BAR_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => !type.disabled && setBarType(type.value)}
                disabled={type.disabled}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all relative ${
                  type.disabled 
                    ? 'border-border/30 bg-secondary/10 text-muted-foreground/50 cursor-not-allowed' 
                    : barType === type.value 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border/50 bg-secondary/30 hover:border-border text-muted-foreground'
                }`}
                data-testid={`button-type-${type.value}`}
              >
                {type.badge && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {type.badge}
                  </span>
                )}
                <div className="font-semibold text-sm">{type.label}</div>
                <div className="text-xs opacity-70">{type.description}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground px-1">
            {BAR_TYPES.find(t => t.value === barType)?.detail}
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-lg">The Bars</Label>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                    onClick={() => applyFormat('bold')}
                    title="Bold"
                    type="button"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                    onClick={() => applyFormat('italic')}
                    title="Italic"
                    type="button"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                    onClick={() => applyFormat('underline')}
                    title="Underline"
                    type="button"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[150px] p-3 bg-secondary/50 border border-border/50 rounded-md font-display text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary whitespace-pre-wrap"
                data-placeholder="Type your lyrics here... Use line breaks for flow."
                data-testid="input-content"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Tip: Highlight text and click formatting buttons to style your bars.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkOriginality}
                  disabled={isChecking}
                  className={`gap-1.5 ${originalityChecked ? (similarBars.length > 0 ? 'border-orange-500 text-orange-500 hover:bg-orange-500/10' : 'border-green-500 text-green-500 hover:bg-green-500/10') : ''}`}
                  data-testid="button-check-originality"
                >
                  {isChecking ? (
                    <>Checking...</>
                  ) : originalityChecked ? (
                    similarBars.length > 0 ? (
                      <><AlertTriangle className="h-3.5 w-3.5" /> {similarBars.length} Match{similarBars.length > 1 ? 'es' : ''}</>
                    ) : (
                      <><CheckCircle className="h-3.5 w-3.5" /> Original</>
                    )
                  ) : (
                    <><Search className="h-3.5 w-3.5" /> Check Originality</>
                  )}
                </Button>
              </div>

              {showOriginalityReport && (
                <div className={`p-3 rounded-lg border ${similarBars.length > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  {similarBars.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange-500 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Similar content found on Orphan Bars
                      </p>
                      <div className="space-y-2">
                        {similarBars.map((bar) => (
                          <div key={bar.id} className="flex justify-between items-center text-sm bg-background/50 p-2 rounded">
                            <div>
                              <span className="font-mono text-primary">{bar.proofBarId}</span>
                              <span className="text-muted-foreground ml-2">by @{bar.username}</span>
                            </div>
                            <span className="font-bold text-orange-500">{bar.similarity}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-green-500 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      No similar content found - looks original!
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">Breakdown (Optional)</Label>
              <Textarea 
                id="explanation" 
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Break down the entendre, metaphor, or context..." 
                className="min-h-[80px] bg-secondary/30 border-border/50 text-sm focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(val: Category) => setCategory(val)}>
                  <SelectTrigger className="bg-secondary/30 border-border/50">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input 
                  id="tags" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. funny, freestyle, diss" 
                  className="bg-secondary/30 border-border/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullRapLink">Full Rap Link (Optional)</Label>
              <Input 
                id="fullRapLink" 
                type="url"
                value={fullRapLink}
                onChange={(e) => setFullRapLink(e.target.value)}
                placeholder="https://soundcloud.com/... or YouTube link to full track" 
                className="bg-secondary/30 border-border/50"
                data-testid="input-full-rap-link"
              />
              <p className="text-xs text-muted-foreground">
                Link to your full song if this bar is from a larger work
              </p>
              {fullRapLink.trim() && (
                <div className="flex items-center gap-2 mt-2">
                  <Switch
                    id="isRecorded"
                    checked={isRecorded}
                    onCheckedChange={setIsRecorded}
                    data-testid="switch-is-recorded"
                  />
                  <Label htmlFor="isRecorded" className="text-sm cursor-pointer">
                    This track is recorded
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="beatLink">Beat/Instrumental Link (Optional)</Label>
              <Input 
                id="beatLink" 
                type="url"
                value={beatLink}
                onChange={(e) => setBeatLink(e.target.value)}
                placeholder="https://youtube.com/... or SoundCloud/Spotify link to the beat" 
                className={`bg-secondary/30 border-border/50 ${beatLink.trim() && !validateBeatUrl(beatLink).valid ? 'border-red-500' : ''}`}
                data-testid="input-beat-link"
              />
              {beatLink.trim() ? (
                validateBeatUrl(beatLink).valid ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-500">
                    <Music className="h-3 w-3" />
                    <span>{validateBeatUrl(beatLink).provider} detected - will embed player</span>
                  </div>
                ) : (
                  <p className="text-xs text-red-500">
                    {validateBeatUrl(beatLink).error}
                  </p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">
                  Link the beat/instrumental so readers can hear what this bar could ride to. Works with YouTube, SoundCloud, and Spotify.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Sharing Permission
              </Label>
              <Select value={permissionStatus} onValueChange={(val: PermissionStatus) => setPermissionStatus(val)}>
                <SelectTrigger className="bg-secondary/30 border-border/50" data-testid="select-permission">
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSIONS.map(perm => (
                    <SelectItem key={perm.value} value={perm.value}>
                      <div className="flex items-center gap-2">
                        {perm.icon}
                        <span>{perm.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PERMISSIONS.find(p => p.value === permissionStatus)?.description}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded">OC</span>
                <div>
                  <Label htmlFor="original" className="cursor-pointer">Original Content</Label>
                  <p className="text-xs text-muted-foreground">This is my own work, not someone else's bars</p>
                </div>
              </div>
              <Switch
                id="original"
                checked={isOriginal}
                onCheckedChange={(checked) => {
                  setIsOriginal(checked);
                  if (!checked) setLockImmediately(false);
                }}
                data-testid="switch-original"
              />
            </div>

            {isOriginal && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <div>
                    <Label htmlFor="lockImmediately" className="cursor-pointer">Lock & Authenticate on Drop</Label>
                    <p className="text-xs text-muted-foreground">Get your proof ID immediately - bar cannot be edited after</p>
                  </div>
                </div>
                <Switch
                  id="lockImmediately"
                  checked={lockImmediately}
                  onCheckedChange={setLockImmediately}
                  data-testid="switch-lock-immediately"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <div>
                  <Label htmlFor="feedback" className="cursor-pointer">Breakdown Requested</Label>
                  <p className="text-xs text-muted-foreground">Let the community know you want feedback or critique</p>
                </div>
              </div>
              <Switch
                id="feedback"
                checked={feedbackWanted}
                onCheckedChange={setFeedbackWanted}
                data-testid="switch-feedback"
              />
            </div>

            <Button 
              className="w-full text-lg font-bold py-6 bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
              onClick={handleSubmit}
              disabled={isSubmitting || isChecking}
              data-testid="button-post"
            >
              {isChecking ? "Checking..." : isSubmitting ? "Posting..." : "Post to Orphan Bars"}
            </Button>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showSimilarWarning} onOpenChange={setShowSimilarWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Similar Content Detected
            </DialogTitle>
            <DialogDescription>
              Your bars look similar to existing content on Orphan Bars. This might be duplicate content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {similarBars.map((bar) => (
              <div key={bar.id} className="p-3 bg-secondary/50 rounded-lg border border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-mono text-primary">{bar.proofBarId}</span>
                    <p className="text-sm text-muted-foreground">by @{bar.username}</p>
                  </div>
                  <span className="text-sm font-bold text-yellow-500">{bar.similarity}% match</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowSimilarWarning(false)}
              data-testid="button-cancel-post"
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handlePostAnyway}
              disabled={isSubmitting}
              data-testid="button-post-anyway"
            >
              {isSubmitting ? "Posting..." : "Post Anyway"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
