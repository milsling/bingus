import Navigation from "@/components/Navigation";
import { CURRENT_USER, MOCK_BARS } from "@/lib/mockData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import BarCard from "@/components/BarCard";
import { Settings, Share2, MapPin, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const userBars = MOCK_BARS.filter(bar => bar.author.id === "u2"); // Mocking user bars

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-3xl mx-auto">
        {/* Profile Header */}
        <div className="relative">
          <div className="h-32 md:h-48 bg-gradient-to-r from-zinc-900 to-zinc-800 w-full" />
          
          <div className="px-4 md:px-8 -mt-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                <AvatarImage src={CURRENT_USER.avatar} />
                <AvatarFallback>{CURRENT_USER.username[0]}</AvatarFallback>
              </Avatar>
              
              <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                  @{CURRENT_USER.username}
                  {CURRENT_USER.verified && <span className="text-primary text-xl">✓</span>}
                </h1>
                <p className="text-muted-foreground">Lyricist | Queens, NY</p>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto mb-2">
              <Button variant="outline" className="flex-1 md:flex-none gap-2">
                <Settings className="h-4 w-4" />
                Edit
              </Button>
              <Button className="flex-1 md:flex-none gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Stats & Bio */}
        <div className="px-4 md:px-8 py-6 space-y-4">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">24</span>
              <span className="text-muted-foreground">Bars</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">1.2k</span>
              <span className="text-muted-foreground">Followers</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground">450</span>
              <span className="text-muted-foreground">Following</span>
            </div>
          </div>

          <p className="text-sm md:text-base max-w-xl">
            Just here to share some thoughts and rhymes. Love wordplay and storytelling. 
            Check out my mixtape link below 👇
          </p>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Queens, NY
            </div>
            <div className="flex items-center gap-1 text-primary hover:underline cursor-pointer">
              <LinkIcon className="h-3 w-3" />
              soundcloud.com/spitfire99
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8">
          <Tabs defaultValue="bars" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-6">
              <TabsTrigger 
                value="bars" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-muted-foreground data-[state=active]:text-foreground font-display font-bold tracking-wide"
              >
                BARS
              </TabsTrigger>
              <TabsTrigger 
                value="likes" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-muted-foreground data-[state=active]:text-foreground font-display font-bold tracking-wide"
              >
                LIKES
              </TabsTrigger>
              <TabsTrigger 
                value="saved" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-muted-foreground data-[state=active]:text-foreground font-display font-bold tracking-wide"
              >
                SAVED
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bars" className="py-6 space-y-6">
              {userBars.map(bar => (
                <BarCard key={bar.id} bar={bar} />
              ))}
            </TabsContent>
            
            <TabsContent value="likes" className="py-12 text-center text-muted-foreground">
              No liked bars yet.
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
