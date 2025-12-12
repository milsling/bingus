import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/mockData";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Post() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
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
              <Label htmlFor="content" className="text-lg">The Bars</Label>
              <Textarea 
                id="content" 
                placeholder="Type your lyrics here... Use line breaks for flow." 
                className="min-h-[150px] bg-secondary/50 border-border/50 font-mono text-lg focus:border-primary resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation / Context (Optional)</Label>
              <Textarea 
                id="explanation" 
                placeholder="Break down the entendre, metaphor, or context..." 
                className="min-h-[80px] bg-secondary/30 border-border/50 text-sm focus:border-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
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
                  placeholder="e.g. funny, freestyle, diss" 
                  className="bg-secondary/30 border-border/50"
                />
              </div>
            </div>

            <Button className="w-full text-lg font-bold py-6 bg-primary text-primary-foreground hover:bg-primary/90 mt-4">
              Post to Rhyme Book
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
