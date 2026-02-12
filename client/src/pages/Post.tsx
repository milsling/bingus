import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Bold, Italic, Underline, MessageSquare, Shield, Share2, Users, Lock, AlertTriangle, Search, CheckCircle, Music, AlertCircle, FileQuestion } from "lucide-react";
import { validateBeatUrl } from "@/components/BarMediaPlayer";
import { Link, useLocation, useSearch } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { motion, useReducedMotion } from "framer-motion";

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

const prettifyPrompt = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getPlainText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

export default function Post() {
  const { addBar, currentUser } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const promptSlug = (searchParams.get("prompt") || "").toLowerCase();
  const respondToBarId = searchParams.get("respondTo") || "";
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
  const [editorStats, setEditorStats] = useState({ chars: 0, words: 0, lines: 0 });
  const prefersReducedMotion = useReducedMotion();
  
  // AI moderation rejection state
  const [showAiRejectionModal, setShowAiRejectionModal] = useState(false);
  const [aiRejectionData, setAiRejectionData] = useState<{
    reasons: string[];
    plagiarismRisk?: string;
    plagiarismDetails?: string;
  } | null>(null);
  const [userAppeal, setUserAppeal] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
    window.setTimeout(updateEditorStats, 0);
  };

  const getContent = () => {
    return editorRef.current?.innerHTML || "";
  };

  const updateEditorStats = () => {
    const plain = getPlainText(getContent());
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    const lines = plain ? plain.split("\n").filter(Boolean).length : 0;
    setEditorStats({
      chars: plain.length,
      words,
      lines,
    });
  };

  const doPost = async () => {
    const content = getContent();
    setIsSubmitting(true);
    try {
      const manualTags = tags.split(",").map(t => t.trim()).filter(Boolean);
      const autoPromptTag = promptSlug ? `prompt:${promptSlug}` : null;
      const mergedTags = autoPromptTag
        ? Array.from(new Set([...manualTags, autoPromptTag]))
        : manualTags;

      const newBar = await addBar({
        content,
        explanation: explanation.trim() || undefined,
        category,
        tags: mergedTags,
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
          description: respondToBarId
            ? "Your lyric is live. Linking it to the challenge..."
            : "Your lyric is now live on the feed.",
        });
      }

      if (respondToBarId && newBar?.id) {
        try {
          await api.submitChallengeResponse(respondToBarId, newBar.id);
          toast({
            title: "Response linked",
            description: "Your bar is now threaded under the original challenge.",
          });
        } catch (error: any) {
          toast({
            title: "Posted, but not linked",
            description:
              error?.message ||
              "Your bar posted successfully, but the challenge thread link failed.",
            variant: "destructive",
          });
        }
      }

      if (respondToBarId) {
        setLocation(`/bars/${respondToBarId}`);
      } else if (promptSlug) {
        setLocation(`/prompts/${promptSlug}`);
      } else {
        setLocation("/");
      }
    } catch (error: any) {
      // Check if this is an AI moderation rejection
      if (error.aiRejected && error.canRequestReview) {
        setAiRejectionData({
          reasons: error.reasons || [],
          plagiarismRisk: error.plagiarismRisk,
          plagiarismDetails: error.plagiarismDetails,
        });
        setShowAiRejectionModal(true);
      } else {
        toast({
          title: "Failed to post",
          description: error.message || "Could not post your bars. Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSubmitForReview = async () => {
    const content = getContent();
    setIsSubmittingReview(true);
    try {
      const response = await fetch("/api/ai-review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          category,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          explanation: explanation.trim() || undefined,
          barType,
          beatLink: beatLink.trim() || undefined,
          fullRapLink: fullRapLink.trim() || undefined,
          aiRejectionReasons: aiRejectionData?.reasons || [],
          plagiarismRisk: aiRejectionData?.plagiarismRisk,
          plagiarismDetails: aiRejectionData?.plagiarismDetails,
          userAppeal: userAppeal.trim(),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit for review");
      }
      
      toast({
        title: "Submitted for Review",
        description: "An admin will review your bar and you'll be notified of the decision.",
      });
      
      setShowAiRejectionModal(false);
      setAiRejectionData(null);
      setUserAppeal("");
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit for review. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
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

  const panelAnimation = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12, scale: 0.99 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.22, ease: "easeOut" as const },
      };

  return (
    <div className="min-h-screen bg-background pt-14 pb-[calc(env(safe-area-inset-bottom)+8.5rem)] md:pb-8 md:pt-24">
      
      <main className="w-full max-w-5xl xl:max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">Drop a Bar</h1>
            <p className="text-muted-foreground">Share your lyrics with the community</p>
          </div>
        </div>

        {(promptSlug || respondToBarId) && (
          <div className="mb-6 space-y-2">
            {promptSlug && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                <p className="text-xs uppercase tracking-wide text-primary/80 font-semibold">
                  Writing to prompt
                </p>
                <p className="text-sm font-semibold mt-1">
                  "{prettifyPrompt(promptSlug)}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This post will be auto-tagged with #{`prompt:${promptSlug}`}.
                </p>
              </div>
            )}
            {respondToBarId && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                <p className="text-xs uppercase tracking-wide text-primary/80 font-semibold">
                  Response mode
                </p>
                <p className="text-sm font-semibold mt-1">
                  This bar will be linked as a response in the challenge thread.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 space-y-3">
          <div className="flex gap-3">
            {BAR_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => !type.disabled && setBarType(type.value)}
                disabled={type.disabled}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all relative ${
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

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            <motion.div {...panelAnimation}>
            <Card className="border-border/60 bg-card/65 backdrop-blur-xl shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg">The Bars</Label>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 hover:bg-primary/20 hover:text-primary"
                        onClick={() => applyFormat('bold')}
                        title="Bold"
                        type="button"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 hover:bg-primary/20 hover:text-primary"
                        onClick={() => applyFormat('italic')}
                        title="Italic"
                        type="button"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 hover:bg-primary/20 hover:text-primary"
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
                    onInput={updateEditorStats}
                    className="min-h-[220px] p-4 bg-secondary/45 border border-border/50 rounded-xl font-display text-lg leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 whitespace-pre-wrap"
                    data-placeholder="Type your lyrics here... Use line breaks for flow."
                    data-testid="input-content"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Tip: Highlight text and click formatting buttons to style your bars.
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-3 py-1 text-[11px] text-muted-foreground">
                      <span>{editorStats.words} words</span>
                      <span className="opacity-60">•</span>
                      <span>{editorStats.lines} lines</span>
                      <span className="opacity-60">•</span>
                      <span>{editorStats.chars} chars</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
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
                    <div className={`p-4 rounded-xl border ${similarBars.length > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                      {similarBars.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-orange-500 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Similar content found on Orphan Bars
                          </p>
                          <div className="space-y-2">
                            {similarBars.map((bar) => (
                              <div key={bar.id} className="flex justify-between items-center text-sm bg-background/50 p-3 rounded-lg">
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

                <div className="space-y-3">
                  <Label htmlFor="explanation">Breakdown (Optional)</Label>
                  <Textarea 
                    id="explanation" 
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Break down the entendre, metaphor, or context..." 
                    className="min-h-[100px] bg-secondary/30 border-border/50 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div {...panelAnimation} className="space-y-6 lg:sticky lg:top-24 h-fit">
            <Card className="border-border/60 bg-card/65 backdrop-blur-xl shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
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

                <div className="space-y-3">
                  <Label htmlFor="tags">Tags</Label>
                  <Input 
                    id="tags" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. funny, freestyle, diss" 
                    className="bg-secondary/30 border-border/50"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="fullRapLink">Full Rap Link</Label>
                  <Input 
                    id="fullRapLink" 
                    value={fullRapLink}
                    onChange={(e) => setFullRapLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..." 
                    className="bg-secondary/30 border-border/50"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="beatLink">Beat Link</Label>
                  <Input 
                    id="beatLink" 
                    value={beatLink}
                    onChange={(e) => setBeatLink(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..." 
                    className="bg-secondary/30 border-border/50"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/65 backdrop-blur-xl shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    {PERMISSIONS.map((perm) => (
                      <button
                        key={perm.value}
                        type="button"
                        onClick={() => setPermissionStatus(perm.value)}
                        className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          permissionStatus === perm.value 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-border/50 bg-secondary/30 hover:border-border text-muted-foreground'
                        }`}
                      >
                        {perm.icon}
                        <div className="text-left">
                          <div className="font-medium text-sm">{perm.label}</div>
                          <div className="text-xs opacity-70">{perm.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="feedback" className="text-sm">Want Feedback?</Label>
                    <Switch 
                      id="feedback" 
                      checked={feedbackWanted} 
                      onCheckedChange={setFeedbackWanted} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="original" className="text-sm">Original Work</Label>
                    <Switch 
                      id="original" 
                      checked={isOriginal} 
                      onCheckedChange={setIsOriginal} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recorded" className="text-sm">Recorded?</Label>
                    <Switch 
                      id="recorded" 
                      checked={isRecorded} 
                      onCheckedChange={setIsRecorded} 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lock" className="text-sm">Lock Immediately</Label>
                    <Switch 
                      id="lock" 
                      checked={lockImmediately} 
                      onCheckedChange={setLockImmediately} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="hidden lg:flex w-full py-3 text-lg font-semibold rounded-xl"
              data-testid="button-submit"
            >
              {isSubmitting ? "Dropping..." : "Drop Bar"}
            </Button>
          </motion.div>
        </div>
      </main>

      <div className="lg:hidden fixed left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[980]">
        <div className="glass-surface-strong rounded-2xl border border-border/55 p-2 shadow-[0_14px_32px_rgba(2,6,23,0.36)]">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 text-base font-semibold rounded-xl"
            data-testid="button-submit-mobile"
          >
            {isSubmitting ? "Dropping..." : "Drop Bar"}
          </Button>
        </div>
      </div>

      <Dialog open={showSimilarWarning} onOpenChange={setShowSimilarWarning}>
        <DialogContent className="max-w-md rounded-2xl">
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

      {/* AI Moderation Rejection Modal */}
      <Dialog open={showAiRejectionModal} onOpenChange={(open) => {
        if (!open) {
          setShowAiRejectionModal(false);
          setAiRejectionData(null);
          setUserAppeal("");
        }
      }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-5 w-5" />
              Content Not Approved
            </DialogTitle>
            <DialogDescription>
              Our moderation system flagged your bar. You can request a manual review if you believe this was incorrect.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {aiRejectionData?.reasons && aiRejectionData.reasons.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reasons:</Label>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                  {aiRejectionData.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {aiRejectionData?.plagiarismRisk && aiRejectionData.plagiarismRisk !== "none" && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm font-medium text-yellow-500">Plagiarism Risk: {aiRejectionData.plagiarismRisk}</p>
                {aiRejectionData.plagiarismDetails && (
                  <p className="text-sm text-muted-foreground mt-1">{aiRejectionData.plagiarismDetails}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="appeal" className="text-sm font-medium flex items-center gap-2">
                <FileQuestion className="h-4 w-4" />
                Your Appeal (Optional)
              </Label>
              <Textarea
                id="appeal"
                placeholder="Explain why this bar should be approved. For example: 'This is original wordplay referencing...' or 'The phrase is from my own song...'"
                value={userAppeal}
                onChange={(e) => setUserAppeal(e.target.value)}
                rows={3}
                className="resize-none"
                data-testid="textarea-appeal"
              />
              <p className="text-xs text-muted-foreground">
                Provide context that might help an admin understand your bar better.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAiRejectionModal(false);
                setAiRejectionData(null);
                setUserAppeal("");
              }}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForReview}
              disabled={isSubmittingReview}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-submit-review"
            >
              {isSubmittingReview ? "Submitting..." : "Submit for Manual Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
