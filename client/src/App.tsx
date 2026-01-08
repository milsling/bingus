import { useEffect } from "react";
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
import { BarProvider } from "@/context/BarContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { SwipeBackNavigation } from "@/components/SwipeBackNavigation";

function Router() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <Switch location={location}>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
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
          <Route path="/terms" component={Terms} />
          <Route path="/achievements" component={Achievements} />
          <Route path="/badges" component={Badges} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BarProvider>
        <TooltipProvider>
          <MaintenanceBanner />
          <Toaster />
          <SwipeBackNavigation>
            <Router />
          </SwipeBackNavigation>
        </TooltipProvider>
      </BarProvider>
    </QueryClientProvider>
  );
}

export default App;
