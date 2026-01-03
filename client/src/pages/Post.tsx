import { useState, useRef } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bold, Italic, Underline, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";

type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";
const CATEGORIES: Category[] = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"];

export default function Post() {
  const { addBar, currentUser } = useBars();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  const editorRef = useRef<HTMLDivElement>(null);

  const [explanation, setExplanation] = useState("");
  const [category, setCategory] = useState<Category>("Freestyle");
  const [tags, setTags] = useState("");
  const [feedbackWanted, setFeedbackWanted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const getContent = () => {
    return editorRef.current?.innerHTML || "";
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

    setIsSubmitting(true);
    try {
      await addBar({
        content,
        explanation: explanation.trim() || undefined,
        category,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        feedbackWanted,
      });

      toast({
        title: "Bars Dropped!",
        description: "Your lyric is now live on the feed.",
      });

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
              <p className="text-xs text-muted-foreground">
                Tip: Highlight text and click formatting buttons to style your bars.
              </p>
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
              disabled={isSubmitting}
              data-testid="button-post"
            >
              {isSubmitting ? "Posting..." : "Post to Orphan Bars"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
