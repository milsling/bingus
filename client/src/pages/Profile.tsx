import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import BarCard from "@/components/BarCard";
import { Settings, Share2, MapPin, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBars } from "@/context/BarContext";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { shareContent, getProfileShareData } from "@/lib/share";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { bars, currentUser, logout } = useBars();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["user-stats", currentUser?.id],
    queryFn: () => api.getUserStats(currentUser!.id),
    enabled: !!currentUser,
  });

  const handleShare = async () => {
    if (!currentUser) return;
    const result = await shareContent(getProfileShareData(currentUser.username));
    if (result.success) {
      toast({
        title: result.method === "clipboard" ? "Link copied!" : "Shared!",
        description: result.method === "clipboard" 
          ? "Profile link copied to clipboard" 
          : "Profile shared successfully",
      });
    }
  };

  // Redirect if not logged in
  if (!currentUser) {
    setLocation("/auth");
    return null;
  }

  const userBars = bars.filter(bar => bar.userId === currentUser.id);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

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
                <AvatarImage src={currentUser.avatarUrl || undefined} />
                <AvatarFallback>{currentUser.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                  @{currentUser.username}
                  {currentUser.membershipTier !== "free" && <span className="text-primary text-xl">✓</span>}
                  {currentUser.username.toLowerCase() === "milsling" && (
                    <span className="ml-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-normal">
                      Creator
                    </span>
                  )}
                </h1>
                <p className="text-muted-foreground">{currentUser.bio || "Lyricist"}</p>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto mb-2">
              <Link href="/profile/edit">
                <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" className="gap-2" onClick={handleLogout} data-testid="button-logout">
                <Settings className="h-4 w-4" />
                Logout
              </Button>
              <Button className="gap-2" onClick={handleShare} data-testid="button-share">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Stats & Bio */}
        <div className="px-4 md:px-8 py-6 space-y-4">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-1" data-testid="stat-bars">
              <span className="font-bold text-foreground">{stats?.barsCount ?? 0}</span>
              <span className="text-muted-foreground">Bars</span>
            </div>
            <div className="flex items-center gap-1" data-testid="stat-followers">
              <span className="font-bold text-foreground">{stats?.followersCount ?? 0}</span>
              <span className="text-muted-foreground">Followers</span>
            </div>
            <div className="flex items-center gap-1" data-testid="stat-following">
              <span className="font-bold text-foreground">{stats?.followingCount ?? 0}</span>
              <span className="text-muted-foreground">Following</span>
            </div>
          </div>

          {currentUser.bio && (
            <p className="text-sm md:text-base max-w-xl" data-testid="text-bio">
              {currentUser.bio}
            </p>
          )}

          {currentUser.location && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1" data-testid="text-location">
                <MapPin className="h-3 w-3" />
                {currentUser.location}
              </div>
            </div>
          )}
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
