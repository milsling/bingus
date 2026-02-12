import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Post from "@/pages/Post";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import BarDetail from "@/pages/BarDetail";
import UserProfile from "@/pages/UserProfile";
import Saved from "@/pages/Saved";
import Friends from "@/pages/Friends";
import Messages from "@/pages/Messages";
import Guidelines from "@/pages/Guidelines";
import Orphanage from "@/pages/Orphanage";
import Terms from "@/pages/Terms";
import Achievements from "@/pages/Achievements";
import Badges from "@/pages/Badges";
import Apps from "@/pages/Apps";
import Notebook from "@/pages/Notebook";
import RhymeDictionary from "@/pages/RhymeDictionary";
import AuthCallback from "@/pages/AuthCallback";
import Prompts from "@/pages/Prompts";
import Challenges from "@/pages/Challenges";
import { BarProvider } from "@/context/BarContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { VersionCheck } from "@/components/VersionCheck";
import { SwipeBackNavigation } from "@/components/SwipeBackNavigation";
import AIAssistant from "@/components/AIAssistant";
import { useBackground } from "@/components/BackgroundSelector";
import Navigation from "@/components/Navigation";
import { ThemeProvider } from "@/contexts/ThemeContext";

const OrphanStudio = lazy(() => import("@/pages/orphanstudio"));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <div className="container mx-auto max-w-5xl p-4">
        <div className="glass-surface rounded-3xl border border-border/55 p-6">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        className="page-transition"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
      >
        <Switch location={location}>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/post" component={Post} />
          <Route path="/profile" component={Profile} />
          <Route path="/profile/edit" component={EditProfile} />
          <Route path="/admin" component={Admin} />
          <Route path="/saved" component={Saved} />
          <Route path="/friends" component={Friends} />
          <Route path="/messages" component={Messages} />
          <Route path="/messages/:id" component={Messages} />
          <Route path="/guidelines" component={Guidelines} />
          <Route path="/orphanage" component={Orphanage} />
          <Route path="/prompts" component={Prompts} />
          <Route path="/prompts/:slug" component={Prompts} />
          <Route path="/challenges" component={Challenges} />
          <Route path="/terms" component={Terms} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/badges" component={Badges} />
          <Route path="/apps" component={Apps} />
          <Route path="/apps/notebook" component={Notebook} />
          <Route path="/apps/rhyme" component={RhymeDictionary} />
          <Route path="/orphanstudio">
            {() => (
              <Suspense fallback={<RouteLoadingFallback />}>
                <OrphanStudio />
              </Suspense>
            )}
          </Route>
          <Route path="/discover" component={Home} />
          <Route path="/bars/:id" component={BarDetail} />
          <Route path="/u/:username">
            {(params) => (
              <ErrorBoundary>
                <UserProfile />
              </ErrorBoundary>
            )}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function BackgroundInitializer() {
  useBackground();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BarProvider>
          <TooltipProvider>
            <VersionCheck />
            <BackgroundInitializer />
            <MaintenanceBanner />
            <Navigation />
            <Toaster />
            <SwipeBackNavigation>
              <Router />
            </SwipeBackNavigation>
            <AIAssistant hideFloatingButton />
          </TooltipProvider>
        </BarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
